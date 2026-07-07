import { contextBridge, ipcRenderer } from "electron";
const electronAPI = {
  /**
   * Reads the teams database from userData directory
   * @returns Promise resolving to TeamsDatabase or null if file doesn't exist
   */
  readTeamsDatabase: async () => {
    return ipcRenderer.invoke("file:read-teams-database");
  },
  /**
   * Writes the teams database to userData directory
   * @param data - TeamsDatabase object to persist
   * @returns Promise resolving to success boolean
   */
  writeTeamsDatabase: async (data) => {
    return ipcRenderer.invoke("file:write-teams-database", data);
  },
  /**
   * Reads the PokeAPI cache from userData directory
   * @returns Promise resolving to PokeAPICache or null if file doesn't exist
   */
  readPokeAPICache: async () => {
    return ipcRenderer.invoke("file:read-pokeapi-cache");
  },
  /**
   * Writes the PokeAPI cache to userData directory
   * @param data - PokeAPICache object to persist
   * @returns Promise resolving to success boolean
   */
  writePokeAPICache: async (data) => {
    return ipcRenderer.invoke("file:write-pokeapi-cache", data);
  },
  /**
   * Gets the absolute path to the userData directory
   * Useful for debugging and displaying storage location to user
   * @returns Promise resolving to absolute path string
   */
  getUserDataPath: async () => {
    return ipcRenderer.invoke("file:get-userdata-path");
  },
  /**
   * Reads the game data (moves/items/abilities/learnsets) cache from userData directory
   * @returns Promise resolving to GameDataCache or null if file doesn't exist
   */
  readGameDataCache: async () => {
    return ipcRenderer.invoke("file:read-game-data-cache");
  },
  /**
   * Writes the game data cache to userData directory
   * @param data - GameDataCache object to persist
   * @returns Promise resolving to success boolean
   */
  writeGameDataCache: async (data) => {
    return ipcRenderer.invoke("file:write-game-data-cache", data);
  },
  /**
   * Checks whether a sprite is already cached locally, without fetching it
   * @param remoteUrl - the original remote sprite URL
   * @returns Promise resolving to a local data: URL, or null if not cached
   */
  getSpritePath: async (remoteUrl) => {
    return ipcRenderer.invoke("sprite:get-path", remoteUrl);
  },
  /**
   * Downloads (if needed) and caches a sprite locally
   * @param remoteUrl - the original remote sprite URL
   * @returns Promise resolving to a local data: URL, or null on failure
   */
  downloadSprite: async (remoteUrl) => {
    return ipcRenderer.invoke("sprite:download", remoteUrl);
  }
};
contextBridge.exposeInMainWorld("electron", electronAPI);
