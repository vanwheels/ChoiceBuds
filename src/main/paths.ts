/**
 * Path resolvers for every JSON file ChoiceBuds persists in the OS userData
 * directory. Pure functions only - no filesystem I/O happens here, just path
 * construction, so these are safe to import from anywhere in the main
 * process without side effects.
 */

import { app } from 'electron';
import path from 'path';

/**
 * Get the path to the userData directory
 * This is where we store teams.json and pokeapi-cache.json
 */
export function getUserDataPath(): string {
  return app.getPath('userData');
}

/**
 * Get the full path to the teams database file
 */
export function getTeamsDatabasePath(): string {
  return path.join(getUserDataPath(), 'teams.json');
}

/**
 * Get the full path to the PokeAPI cache file
 */
export function getPokeAPICachePath(): string {
  return path.join(getUserDataPath(), 'pokeapi-cache.json');
}

/**
 * Get the full path to the game data (moves/items/abilities/learnsets) cache file
 */
export function getGameDataCachePath(): string {
  return path.join(getUserDataPath(), 'game-data-cache.json');
}

/**
 * Get the full path to the battle logs database file
 */
export function getBattlesDatabasePath(): string {
  return path.join(getUserDataPath(), 'battles.json');
}

/**
 * Get the full path to the saved-Pokemon-sets database file
 */
export function getSavedPokemonPath(): string {
  return path.join(getUserDataPath(), 'savedPokemon.json');
}

/**
 * Get the full path to the app settings file
 */
export function getSettingsPath(): string {
  return path.join(getUserDataPath(), 'settings.json');
}

/**
 * Get the full path to the persisted window bounds file
 */
export function getWindowStatePath(): string {
  return path.join(getUserDataPath(), 'window-state.json');
}
