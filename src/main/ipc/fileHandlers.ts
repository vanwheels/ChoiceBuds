/**
 * IPC handlers backing window.electron's read/write bridge for every
 * userData JSON file (teams, PokeAPI cache, battles, saved Pokemon sets,
 * settings, game data cache), plus the one handler that hands the renderer
 * the userData directory path itself.
 */

import { ipcMain } from 'electron';
import fs from 'fs/promises';
import { atomicWriteFile } from '../atomicWrite';
import {
  getUserDataPath,
  getTeamsDatabasePath,
  getPokeAPICachePath,
  getBattlesDatabasePath,
  getSavedPokemonPath,
  getSettingsPath,
  getGameDataCachePath,
} from '../paths';

export function registerFileHandlers(): void {
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
}
