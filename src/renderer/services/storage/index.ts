/**
 * Selects which StorageAdapter implementation the app runs against:
 * ElectronStorageAdapter when window.electron exists (desktop app, and
 * Vitest's setupElectronMock.ts stub), IndexedDBStorageAdapter otherwise
 * (the web build).
 *
 * The check is deliberately lazy (first call, not module-eval time) rather
 * than an eager top-level const - Vitest's setupElectronMock.ts installs
 * window.electron in a beforeEach hook, which runs after this module is
 * first imported as part of the test file's module graph. An eager check
 * would sometimes run before that hook fires and wrongly cache the
 * IndexedDB adapter for the rest of the test file. Once real callers
 * (hooks, mounted in an effect) reach this, window.electron's presence
 * never changes mid-session, so caching after the first real call is safe.
 */

import type { StorageAdapter } from './StorageAdapter';
import { ElectronStorageAdapter } from './electronAdapter';
import { IndexedDBStorageAdapter } from './indexedDBAdapter';

export type { StorageAdapter, StorageKey } from './StorageAdapter';

let cachedAdapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (!cachedAdapter) {
    cachedAdapter = typeof window !== 'undefined' && window.electron
      ? new ElectronStorageAdapter()
      : new IndexedDBStorageAdapter();
  }
  return cachedAdapter;
}
