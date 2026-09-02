/**
 * Electron main process entry point
 * Initializes the application window with enforced minimum dimensions
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { fileURLToPath } from 'url';
import path from 'path';
import { DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT, loadWindowState, scheduleWindowStateSave, saveWindowStateSync } from './windowState';
import { registerFileHandlers } from './ipc/fileHandlers';
import { registerShellHandlers } from './ipc/shellHandlers';
import { registerSpriteHandlers } from './ipc/spriteHandlers';
import { registerPokepasteHandlers } from './ipc/pokepasteHandlers';

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
 * Creates the main application window with strict dimension constraints
 * Enforces minWidth: 1280 and minHeight: 720 for layout container integrity,
 * but the actual launch size/position is restored from the last session
 * when available (see loadWindowState in windowState.ts).
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

  mainWindow.on('resize', () => scheduleWindowStateSave(mainWindow));
  mainWindow.on('move', () => scheduleWindowStateSave(mainWindow));
  mainWindow.on('close', () => saveWindowStateSync(mainWindow));

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
 * These handlers are invoked by the renderer process via the preload bridge.
 * Split by domain into src/main/ipc/ - see each module for its own handlers.
 */
function registerIPCHandlers(): void {
  registerFileHandlers();
  registerShellHandlers();
  registerSpriteHandlers();
  registerPokepasteHandlers();
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
