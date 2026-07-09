/**
 * Electron main process entry point
 * Initializes the application window with enforced minimum dimensions
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
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
 * Get the full path to the app settings file
 */
function getSettingsPath(): string {
  return path.join(getUserDataPath(), 'settings.json');
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
 * Creates the main application window with strict dimension constraints
 * Enforces minWidth: 1280 and minHeight: 720 for layout container integrity
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
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

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the renderer process
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Clean up reference on close
  mainWindow.on('closed', () => {
    mainWindow = null;
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
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
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
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
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
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Error writing battles database:', err);
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
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
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
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
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
app.whenReady().then(() => {
  // Register IPC handlers before creating window
  registerIPCHandlers();
  
  createWindow();

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
