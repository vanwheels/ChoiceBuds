/**
 * StorageAdapter backed by the existing Electron IPC bridge
 * (window.electron, from src/main/preload.ts). Pure delegation - each
 * method just forwards to the matching preload call, so this is a
 * transparent seam over what useTeams.ts/useDatabase.ts already did
 * directly before the storage-adapter interface existed.
 */

import type { StorageAdapter, StorageKey } from './StorageAdapter';

export class ElectronStorageAdapter implements StorageAdapter {
  async read<T>(key: StorageKey): Promise<T | null> {
    switch (key) {
      case 'teams-database':
        return window.electron.readTeamsDatabase();
      case 'pokeapi-cache':
        return window.electron.readPokeAPICache();
    }
  }

  async write<T>(key: StorageKey, value: T): Promise<boolean> {
    switch (key) {
      case 'teams-database':
        return window.electron.writeTeamsDatabase(value);
      case 'pokeapi-cache':
        return window.electron.writePokeAPICache(value);
    }
  }
}
