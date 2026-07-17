/**
 * Electron preload script
 * Sets up secure contextBridge for IPC communication between main and renderer
 * Provides file I/O channel for reading/writing team configuration to userData
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

/**
 * Exposed API surface for renderer process
 * All file operations route through main process for security
 * 
 * Note: Using 'any' for data types to avoid importing renderer types,
 * which would cause duplicate bundling. The renderer will cast these
 * to the proper types defined in src/renderer/types/pokemon.ts
 */
const electronAPI = {
  /**
   * Reads the teams database from userData directory
   * @returns Promise resolving to TeamsDatabase or null if file doesn't exist
   */
  readTeamsDatabase: async (): Promise<any> => {
    return ipcRenderer.invoke('file:read-teams-database');
  },

  /**
   * Writes the teams database to userData directory
   * @param data - TeamsDatabase object to persist
   * @returns Promise resolving to success boolean
   */
  writeTeamsDatabase: async (data: any): Promise<boolean> => {
    return ipcRenderer.invoke('file:write-teams-database', data);
  },

  /**
   * Reads the PokeAPI cache from userData directory
   * @returns Promise resolving to PokeAPICache or null if file doesn't exist
   */
  readPokeAPICache: async (): Promise<any> => {
    return ipcRenderer.invoke('file:read-pokeapi-cache');
  },

  /**
   * Writes the PokeAPI cache to userData directory
   * @param data - PokeAPICache object to persist
   * @returns Promise resolving to success boolean
   */
  writePokeAPICache: async (data: any): Promise<boolean> => {
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

  /**
   * Reads the game data (moves/items/abilities/learnsets) cache from userData directory
   * @returns Promise resolving to GameDataCache or null if file doesn't exist
   */
  readGameDataCache: async (): Promise<any> => {
    return ipcRenderer.invoke('file:read-game-data-cache');
  },

  /**
   * Writes the game data cache to userData directory
   * @param data - GameDataCache object to persist
   * @returns Promise resolving to success boolean
   */
  writeGameDataCache: async (data: any): Promise<boolean> => {
    return ipcRenderer.invoke('file:write-game-data-cache', data);
  },

  /**
   * Reads the battle logs database from userData directory
   * @returns Promise resolving to BattlesDatabase or null if file doesn't exist
   */
  readBattlesDatabase: async (): Promise<any> => {
    return ipcRenderer.invoke('file:read-battles-database');
  },

  /**
   * Writes the battle logs database to userData directory
   * @param data - BattlesDatabase object to persist
   * @returns Promise resolving to success boolean
   */
  writeBattlesDatabase: async (data: any): Promise<boolean> => {
    return ipcRenderer.invoke('file:write-battles-database', data);
  },

  /**
   * Reads the saved-Pokemon-sets database from userData directory
   * @returns Promise resolving to SavedPokemonDatabase or null if file doesn't exist
   */
  readSavedPokemonDatabase: async (): Promise<any> => {
    return ipcRenderer.invoke('file:read-saved-pokemon');
  },

  /**
   * Writes the saved-Pokemon-sets database to userData directory
   * @param data - SavedPokemonDatabase object to persist
   * @returns Promise resolving to success boolean
   */
  writeSavedPokemonDatabase: async (data: any): Promise<boolean> => {
    return ipcRenderer.invoke('file:write-saved-pokemon', data);
  },

  /**
   * Reads the app settings from userData directory
   * @returns Promise resolving to AppSettings or null if file doesn't exist
   */
  readSettings: async (): Promise<any> => {
    return ipcRenderer.invoke('file:read-settings');
  },

  /**
   * Writes the app settings to userData directory
   * @param data - AppSettings object to persist
   * @returns Promise resolving to success boolean
   */
  writeSettings: async (data: any): Promise<boolean> => {
    return ipcRenderer.invoke('file:write-settings', data);
  },

  /**
   * Opens a URL in the user's default system browser
   * @param url - the URL to open externally
   */
  openExternal: async (url: string): Promise<void> => {
    return ipcRenderer.invoke('shell:open-external', url);
  },

  /**
   * Checks whether a sprite is already cached locally, without fetching it
   * @param remoteUrl - the original remote sprite URL
   * @returns Promise resolving to a local data: URL, or null if not cached
   */
  getSpritePath: async (remoteUrl: string): Promise<string | null> => {
    return ipcRenderer.invoke('sprite:get-path', remoteUrl);
  },

  /**
   * Downloads (if needed) and caches a sprite locally
   * @param remoteUrl - the original remote sprite URL
   * @returns Promise resolving to a local data: URL, or null on failure
   */
  downloadSprite: async (remoteUrl: string): Promise<string | null> => {
    return ipcRenderer.invoke('sprite:download', remoteUrl);
  },

  /**
   * Subscribes to auto-updater status pushed from the main process
   * (Windows packaged builds only - see main.ts's registerAutoUpdater).
   * Returns an unsubscribe function.
   */
  onUpdateStatus: (callback: (status: any) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, status: any) => callback(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },

  /**
   * Quits and installs a downloaded update (only valid once status reports
   * 'ready-to-install').
   */
  installUpdate: async (): Promise<void> => {
    return ipcRenderer.invoke('update:install');
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
