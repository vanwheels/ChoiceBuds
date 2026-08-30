/**
 * Electron main process entry point
 * Initializes the application window with enforced minimum dimensions
 */

import { app, BrowserWindow, ipcMain, screen, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Works around a real Chromium GPU process crash seen on this machine at
// startup ("GPU state invalid after WaitForGetOffsetInRange" /
// "Failed to send GpuControl.CreateCommandBuffer") - the GPU command buffer
// fails to initialize on some GPU driver/virtualized-GPU combinations. Must
// be called before app.whenReady() / any BrowserWindow is created.
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

/**
 * Get the path to the userData directory
 * This is where we store teams.json and pokeapi-cache.json
 */
function getUserDataPath(): string {
  return app.getPath('userData');
}

/**
 * Get the full path to the teams database file
 */
function getTeamsDatabasePath(): string {
  return path.join(getUserDataPath(), 'teams.json');
}

/**
 * Get the full path to the PokeAPI cache file
 */
function getPokeAPICachePath(): string {
  return path.join(getUserDataPath(), 'pokeapi-cache.json');
}

/**
 * Get the full path to the game data (moves/items/abilities/learnsets) cache file
 */
function getGameDataCachePath(): string {
  return path.join(getUserDataPath(), 'game-data-cache.json');
}

/**
 * Get the full path to the battle logs database file
 */
function getBattlesDatabasePath(): string {
  return path.join(getUserDataPath(), 'battles.json');
}

/**
 * Get the full path to the saved-Pokemon-sets database file
 */
function getSavedPokemonPath(): string {
  return path.join(getUserDataPath(), 'savedPokemon.json');
}

/**
 * Get the full path to the app settings file
 */
function getSettingsPath(): string {
  return path.join(getUserDataPath(), 'settings.json');
}

/**
 * Get the full path to the persisted window bounds file
 */
function getWindowStatePath(): string {
  return path.join(getUserDataPath(), 'window-state.json');
}

/**
 * Get (and ensure exists) the local sprite cache directory
 */
async function getSpriteCacheDir(): Promise<string> {
  const dir = path.join(getUserDataPath(), 'sprites');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Deterministic local filename for a remote sprite URL - hashed so it's
 * filesystem-safe regardless of the URL's own path structure, keeping the
 * original extension (sprites are always .png in practice) for sanity.
 */
function getSpriteCacheFilename(remoteUrl: string): string {
  const hash = crypto.createHash('sha1').update(remoteUrl).digest('hex');
  const ext = path.extname(new URL(remoteUrl).pathname) || '.png';
  return `${hash}${ext}`;
}

/**
 * Per-file write queues so concurrent writes to the same path never race on
 * the shared `.tmp` file below - two overlapping writers previously could
 * both write `<file>.tmp` and then have the second `rename` fail with ENOENT
 * because the first rename had already consumed it. Keyed by filePath so
 * writes to different files stay independent/concurrent.
 */
const writeQueues = new Map<string, Promise<void>>();

/**
 * Write to a temp file then rename over the target, so a crash/power-loss
 * mid-write can never leave one of these JSON files truncated to zero bytes
 * - a plain fs.writeFile truncates the destination before writing, which is
 * the window this closes. rename() is atomic on the same volume, which the
 * temp file always is since it's written alongside its target.
 */
async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const previous = writeQueues.get(filePath) ?? Promise.resolve();
  const run = previous.catch(() => {}).then(async () => {
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, filePath);
  });
  writeQueues.set(filePath, run.catch(() => {}));
  return run;
}

const DEFAULT_WINDOW_WIDTH = 1280;
const DEFAULT_WINDOW_HEIGHT = 720;

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

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
async function loadWindowState(): Promise<WindowState | null> {
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
function scheduleWindowStateSave(): void {
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
function saveWindowStateSync(): void {
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

/**
 * Creates the main application window with strict dimension constraints
 * Enforces minWidth: 1280 and minHeight: 720 for layout container integrity,
 * but the actual launch size/position is restored from the last session
 * when available (see loadWindowState above).
 */
async function createWindow(): Promise<void> {
  const restored = await loadWindowState();

  mainWindow = new BrowserWindow({
    width: restored?.width ?? DEFAULT_WINDOW_WIDTH,
    height: restored?.height ?? DEFAULT_WINDOW_HEIGHT,
    x: restored?.x,
    y: restored?.y,
    minWidth: DEFAULT_WINDOW_WIDTH,
    minHeight: DEFAULT_WINDOW_HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'ChoiceBuds - VGC Team Importer',
    backgroundColor: '#1a1a1a',
    show: false, // Don't show until ready-to-show event
  });

  mainWindow.on('resize', scheduleWindowStateSave);
  mainWindow.on('move', scheduleWindowStateSave);
  mainWindow.on('close', saveWindowStateSync);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the renderer process
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // __dirname here is dist-electron/ (where this compiled main.js lives) -
    // the renderer build output is a sibling of dist-electron/'s own parent
    // (dist/renderer/index.html), not a sibling of dist-electron/ itself.
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }

  // Clean up reference on close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Real in-app auto-update, Windows-only for now - macOS's equivalent
 * (Squirrel.Mac) requires the app be code-signed and notarized, which needs
 * a paid Apple Developer account this project doesn't have yet. Only wired
 * up for a packaged NSIS install (the portable .exe has no fixed install
 * directory for electron-updater to update in place, and dev mode has no
 * published feed to check against - electron-updater itself already
 * no-ops when `app.isPackaged` is false, but the platform check is ours).
 * Renderer's `useUpdateCheck.ts` GitHub-Releases-API check remains the
 * fallback status source for every case this doesn't cover.
 */
function registerAutoUpdater(): void {
  if (!app.isPackaged || process.platform !== 'win32') return;

  autoUpdater.autoDownload = true;

  const sendStatus = (payload: { state: 'downloading' | 'ready-to-install'; version?: string; percent?: number }): void => {
    mainWindow?.webContents.send('update:status', payload);
  };

  autoUpdater.on('update-available', (info) => {
    console.log(`[autoUpdater] update available: ${info.version}, downloading`);
    sendStatus({ state: 'downloading', version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendStatus({ state: 'downloading', percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[autoUpdater] update downloaded: ${info.version}, ready to install`);
    sendStatus({ state: 'ready-to-install', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[autoUpdater] no update available, already on latest');
  });

  autoUpdater.on('error', (err) => {
    // Swallowed deliberately - the renderer's GitHub-API-based check still
    // covers this case with its own "View Release" link-out fallback.
    console.error('[autoUpdater] error:', err);
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[autoUpdater] checkForUpdates failed:', err);
  });

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall();
  });
}

/**
 * Register IPC handlers for file operations
 * These handlers are invoked by the renderer process via the preload bridge
 */
function registerIPCHandlers(): void {
  /**
   * Read teams database from userData directory
   */
  ipcMain.handle('file:read-teams-database', async () => {
    try {
      const filePath = getTeamsDatabasePath();
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (err) {
      // File doesn't exist or is invalid - return null
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      console.error('Error reading teams database:', err);
      throw err;
    }
  });

  /**
   * Write teams database to userData directory
   */
  ipcMain.handle('file:write-teams-database', async (_event, data) => {
    try {
      const filePath = getTeamsDatabasePath();
      await atomicWriteFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.error('Error writing teams database:', err);
      return false;
    }
  });

  /**
   * Read PokeAPI cache from userData directory
   */
  ipcMain.handle('file:read-pokeapi-cache', async () => {
    try {
      const filePath = getPokeAPICachePath();
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (err) {
      // File doesn't exist or is invalid - return null
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      console.error('Error reading PokeAPI cache:', err);
      throw err;
    }
  });

  /**
   * Write PokeAPI cache to userData directory
   */
  ipcMain.handle('file:write-pokeapi-cache', async (_event, data) => {
    try {
      const filePath = getPokeAPICachePath();
      await atomicWriteFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.error('Error writing PokeAPI cache:', err);
      return false;
    }
  });

  /**
   * Get the absolute path to userData directory
   */
  ipcMain.handle('file:get-userdata-path', async () => {
    return getUserDataPath();
  });

  /**
   * Open a URL in the user's default system browser (e.g. a GitHub Release
   * link from the update checker) - never navigates the app's own window.
   */
  ipcMain.handle('shell:open-external', async (_event, url: string) => {
    await shell.openExternal(url);
  });

  /**
   * Read battle logs database from userData directory
   */
  ipcMain.handle('file:read-battles-database', async () => {
    try {
      const filePath = getBattlesDatabasePath();
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      console.error('Error reading battles database:', err);
      throw err;
    }
  });

  /**
   * Write battle logs database to userData directory
   */
  ipcMain.handle('file:write-battles-database', async (_event, data) => {
    try {
      const filePath = getBattlesDatabasePath();
      await atomicWriteFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.error('Error writing battles database:', err);
      return false;
    }
  });

  /**
   * Read saved-Pokemon-sets database from userData directory
   */
  ipcMain.handle('file:read-saved-pokemon', async () => {
    try {
      const filePath = getSavedPokemonPath();
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      console.error('Error reading saved-Pokemon database:', err);
      throw err;
    }
  });

  /**
   * Write saved-Pokemon-sets database to userData directory
   */
  ipcMain.handle('file:write-saved-pokemon', async (_event, data) => {
    try {
      const filePath = getSavedPokemonPath();
      await atomicWriteFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.error('Error writing saved-Pokemon database:', err);
      return false;
    }
  });

  /**
   * Read app settings from userData directory
   */
  ipcMain.handle('file:read-settings', async () => {
    try {
      const filePath = getSettingsPath();
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      console.error('Error reading settings:', err);
      throw err;
    }
  });

  /**
   * Write app settings to userData directory
   */
  ipcMain.handle('file:write-settings', async (_event, data) => {
    try {
      const filePath = getSettingsPath();
      await atomicWriteFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.error('Error writing settings:', err);
      return false;
    }
  });

  /**
   * Read the game data (moves/items/abilities/learnsets) cache from userData directory
   */
  ipcMain.handle('file:read-game-data-cache', async () => {
    try {
      const filePath = getGameDataCachePath();
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      console.error('Error reading game data cache:', err);
      throw err;
    }
  });

  /**
   * Write the game data cache to userData directory
   */
  ipcMain.handle('file:write-game-data-cache', async (_event, data) => {
    try {
      const filePath = getGameDataCachePath();
      await atomicWriteFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.error('Error writing game data cache:', err);
      return false;
    }
  });

/**
   * data: URLs (not file:// paths) - the renderer loads the app from
   * http://localhost:5173 in development, and Chromium blocks file:// loads
   * from an http: page ("Not allowed to load local resource"). data: URLs
   * work unconditionally regardless of the page's origin/loading scheme, in
   * both dev and the packaged file:// build.
   */
  function fileToDataUrl(filePath: string, buffer: Buffer): string {
    const ext = path.extname(filePath).slice(1).toLowerCase() || 'png';
    return `data:image/${ext};base64,${buffer.toString('base64')}`;
  }

  /**
   * Check whether a sprite for the given remote URL is already cached locally.
   * Returns a data: URL if so, otherwise null (never fetches).
   */
  ipcMain.handle('sprite:get-path', async (_event, remoteUrl: string) => {
    try {
      const dir = await getSpriteCacheDir();
      const filePath = path.join(dir, getSpriteCacheFilename(remoteUrl));
      const buffer = await fs.readFile(filePath);
      return fileToDataUrl(filePath, buffer);
    } catch {
      return null;
    }
  });

  /**
   * Download a sprite from its remote URL and cache it locally, returning it
   * as a data: URL. Idempotent - skips the network request if already cached.
   */
  ipcMain.handle('sprite:download', async (_event, remoteUrl: string) => {
    try {
      const dir = await getSpriteCacheDir();
      const filePath = path.join(dir, getSpriteCacheFilename(remoteUrl));

      try {
        const cachedBuffer = await fs.readFile(filePath);
        return fileToDataUrl(filePath, cachedBuffer);
      } catch {
        // Not cached yet - fall through to download
      }

      const response = await fetch(remoteUrl);
      if (!response.ok) return null;
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      return fileToDataUrl(filePath, buffer);
    } catch (err) {
      console.error(`Error downloading sprite from ${remoteUrl}:`, err);
      return null;
    }
  });
}

/**
 * App lifecycle: ready event
 * Create window when Electron has finished initialization
 */
app.whenReady().then(async () => {
  // Register IPC handlers before creating window
  registerIPCHandlers();

  await createWindow();

  registerAutoUpdater();

  // macOS: Re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * App lifecycle: window-all-closed event
 * Quit when all windows are closed, except on macOS
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
