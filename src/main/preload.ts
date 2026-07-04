/**
 * Electron preload script
 * Sets up secure contextBridge for IPC communication between main and renderer
 * Provides file I/O channel for reading/writing team configuration to userData
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { TeamsDatabase, PokeAPICache } from '../renderer/types/pokemon';

/**
 * Exposed API surface for renderer process
 * All file operations route through main process for security
 */
const electronAPI = {
  /**
   * Reads the teams database from userData directory
   * @returns Promise resolving to TeamsDatabase or null if file doesn't exist
   */
  readTeamsDatabase: async (): Promise<TeamsDatabase | null> => {
    return ipcRenderer.invoke('file:read-teams-database');
  },

  /**
   * Writes the teams database to userData directory
   * @param data - TeamsDatabase object to persist
   * @returns Promise resolving to success boolean
   */
  writeTeamsDatabase: async (data: TeamsDatabase): Promise<boolean> => {
    return ipcRenderer.invoke('file:write-teams-database', data);
  },

  /**
   * Reads the PokeAPI cache from userData directory
   * @returns Promise resolving to PokeAPICache or null if file doesn't exist
   */
  readPokeAPICache: async (): Promise<PokeAPICache | null> => {
    return ipcRenderer.invoke('file:read-pokeapi-cache');
  },

  /**
   * Writes the PokeAPI cache to userData directory
   * @param data - PokeAPICache object to persist
   * @returns Promise resolving to success boolean
   */
  writePokeAPICache: async (data: PokeAPICache): Promise<boolean> => {
    return ipcRenderer.invoke('file:write-pokeapi-cache', data);
  },

  /**
   * Gets the absolute path to the userData directory
   * Useful for debugging and displaying storage location to user
   * @returns Promise resolving to absolute path string
   */
  getUserDataPath: async (): Promise<string> => {
    return ipcRenderer.invoke('file:get-userdata-path');
  },
};

/**
 * Expose protected methods via contextBridge
 * This creates window.electron in the renderer process
 */
contextBridge.exposeInMainWorld('electron', electronAPI);

/**
 * TypeScript declaration for window.electron
 * This allows TypeScript to recognize the API in renderer code
 */
export type ElectronAPI = typeof electronAPI;

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
