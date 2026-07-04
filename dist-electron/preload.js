"use strict";
const electron = require("electron");
const electronAPI = {
  /**
   * Reads the teams database from userData directory
   * @returns Promise resolving to TeamsDatabase or null if file doesn't exist
   */
  readTeamsDatabase: async () => {
    return electron.ipcRenderer.invoke("file:read-teams-database");
  },
  /**
   * Writes the teams database to userData directory
   * @param data - TeamsDatabase object to persist
   * @returns Promise resolving to success boolean
   */
  writeTeamsDatabase: async (data) => {
    return electron.ipcRenderer.invoke("file:write-teams-database", data);
  },
  /**
   * Reads the PokeAPI cache from userData directory
   * @returns Promise resolving to PokeAPICache or null if file doesn't exist
   */
  readPokeAPICache: async () => {
    return electron.ipcRenderer.invoke("file:read-pokeapi-cache");
  },
  /**
   * Writes the PokeAPI cache to userData directory
   * @param data - PokeAPICache object to persist
   * @returns Promise resolving to success boolean
   */
  writePokeAPICache: async (data) => {
    return electron.ipcRenderer.invoke("file:write-pokeapi-cache", data);
  },
  /**
   * Gets the absolute path to the userData directory
   * Useful for debugging and displaying storage location to user
   * @returns Promise resolving to absolute path string
   */
  getUserDataPath: async () => {
    return electron.ipcRenderer.invoke("file:get-userdata-path");
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
