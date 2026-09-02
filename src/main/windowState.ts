/**
 * Window bounds persisted across launches (leg 1 of the window-sizing piece
 * of the UI/UX overhaul, see TODO.md). Kept in its own file rather than
 * folded into settings.json/AppSettings/useSettings - the renderer's
 * useSettings hook writes its whole in-memory AppSettings object back on
 * every change, so a field only the main process ever updates (window
 * resize/move happens entirely outside the renderer) would risk getting
 * clobbered back to a stale value by the next unrelated settings write from
 * the renderer. A dedicated file main.ts alone reads and writes avoids that
 * race entirely, matching the existing main/renderer ownership split.
 */

import { BrowserWindow, screen } from 'electron';
import fs from 'fs/promises';
import fsSync from 'fs';
import { atomicWriteFile } from './atomicWrite';
import { getWindowStatePath } from './paths';

export const DEFAULT_WINDOW_WIDTH = 1280;
export const DEFAULT_WINDOW_HEIGHT = 720;

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export async function loadWindowState(): Promise<WindowState | null> {
  try {
    const fileContent = await fs.readFile(getWindowStatePath(), 'utf-8');
    const parsed = JSON.parse(fileContent);

    if (
      typeof parsed?.width !== 'number' ||
      typeof parsed?.height !== 'number' ||
      !Number.isFinite(parsed.width) ||
      !Number.isFinite(parsed.height)
    ) {
      return null;
    }

    const state: WindowState = {
      width: Math.max(parsed.width, DEFAULT_WINDOW_WIDTH),
      height: Math.max(parsed.height, DEFAULT_WINDOW_HEIGHT),
    };

    // Only restore a remembered position if it still lands on a currently
    // connected display - a monitor unplugged since last launch (or a
    // saved position from an ultrawide the user is no longer on) would
    // otherwise place the window somewhere unreachable. Falls back to
    // Electron's own default centering when dropped.
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      const candidate = { x: parsed.x, y: parsed.y, width: state.width, height: state.height };
      const onScreen = screen.getAllDisplays().some((display) => {
        const area = display.workArea;
        return (
          candidate.x < area.x + area.width &&
          candidate.x + candidate.width > area.x &&
          candidate.y < area.y + area.height &&
          candidate.y + candidate.height > area.y
        );
      });
      if (onScreen) {
        state.x = parsed.x;
        state.y = parsed.y;
      }
    }

    return state;
  } catch {
    // No file yet, or it's corrupt - fall back to the fixed default.
    return null;
  }
}

/**
 * Debounced so a drag-resize/move (which fires 'resize'/'move' continuously,
 * not just once at the end) doesn't hammer disk on every intermediate frame.
 */
let windowStateSaveTimer: NodeJS.Timeout | null = null;
export function scheduleWindowStateSave(mainWindow: BrowserWindow | null): void {
  if (windowStateSaveTimer) clearTimeout(windowStateSaveTimer);
  windowStateSaveTimer = setTimeout(() => {
    windowStateSaveTimer = null;
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized()) return;
    const bounds = mainWindow.getBounds();
    const state: WindowState = { width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y };
    atomicWriteFile(getWindowStatePath(), JSON.stringify(state, null, 2)).catch((err) => {
      console.error('Error persisting window state:', err);
    });
  }, 500);
}

/**
 * Synchronous best-effort save for app quit - the debounced save above may
 * not have had time to fire (or complete) before the process exits, and a
 * resize/move immediately followed by closing the window is a completely
 * normal sequence, not an edge case worth losing.
 */
export function saveWindowStateSync(mainWindow: BrowserWindow | null): void {
  try {
    if (windowStateSaveTimer) {
      clearTimeout(windowStateSaveTimer);
      windowStateSaveTimer = null;
    }
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized()) return;
    const bounds = mainWindow.getBounds();
    const state: WindowState = { width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y };
    fsSync.writeFileSync(getWindowStatePath(), JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error persisting window state on close:', err);
  }
}
