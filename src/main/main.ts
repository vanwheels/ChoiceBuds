/**
 * Electron main process entry point
 * Initializes the application window with enforced minimum dimensions
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Creates the main application window with strict dimension constraints
 * Enforces minWidth: 1024 and minHeight: 768 for layout container integrity
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
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
