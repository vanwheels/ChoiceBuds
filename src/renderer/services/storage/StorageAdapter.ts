/**
 * Storage adapter interface - the seam between the app's data hooks
 * (useTeams, useDatabase, and future ports) and wherever they actually
 * persist. Two implementations: electronAdapter.ts (delegates to the
 * existing window.electron IPC bridge) and indexedDBAdapter.ts (new, for
 * the web build). See index.ts for how one gets selected.
 *
 * StorageKey is a closed union rather than a plain string so each new
 * resource a future leg ports has to be added here deliberately, matched
 * by a case in both adapters.
 */

export type StorageKey =
  | 'teams-database'
  | 'battles-database'
  | 'pokeapi-cache'
  | 'game-data-cache'
  | 'settings'
  | 'saved-pokemon-database'
  | 'vgc-pastes-cache'
  | 'vgc-real-sets-cache';

export interface StorageAdapter {
  read<T>(key: StorageKey): Promise<T | null>;
  write<T>(key: StorageKey, value: T): Promise<boolean>;
}
