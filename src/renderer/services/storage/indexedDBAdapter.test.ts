import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBStorageAdapter } from './indexedDBAdapter';

describe('IndexedDBStorageAdapter', () => {
  // Each test gets a fresh "choicebuds" database - fake-indexeddb's global
  // indexedDB otherwise persists data across tests in this file, since it's
  // only imported once at module scope.
  beforeEach(() => new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('choicebuds');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  }));

  it('returns null for a key that was never written', async () => {
    const result = await new IndexedDBStorageAdapter().read('teams-database');
    expect(result).toBeNull();
  });

  it('round-trips a written value back through read', async () => {
    const adapter = new IndexedDBStorageAdapter();
    const database = { version: 1, teams: [{ id: 'team-1', name: 'Test' }], tombstones: [], lastModified: 123 };

    const writeResult = await adapter.write('teams-database', database);
    expect(writeResult).toBe(true);

    const readResult = await adapter.read('teams-database');
    expect(readResult).toEqual(database);
  });

  it('keeps different keys independent', async () => {
    const adapter = new IndexedDBStorageAdapter();
    const teams = { version: 1, teams: [], tombstones: [], lastModified: 0 };
    const cache = { version: 1, entries: {}, lastCleaned: 0 };

    await adapter.write('teams-database', teams);
    await adapter.write('pokeapi-cache', cache);

    expect(await adapter.read('teams-database')).toEqual(teams);
    expect(await adapter.read('pokeapi-cache')).toEqual(cache);
  });

  it('overwrites a previously written value for the same key', async () => {
    const adapter = new IndexedDBStorageAdapter();
    await adapter.write('pokeapi-cache', { version: 1, entries: {}, lastCleaned: 0 });
    await adapter.write('pokeapi-cache', { version: 1, entries: {}, lastCleaned: 99 });

    const result = await adapter.read<{ lastCleaned: number }>('pokeapi-cache');
    expect(result?.lastCleaned).toBe(99);
  });
});
