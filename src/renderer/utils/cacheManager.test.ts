import { describe, it, expect, vi } from 'vitest';
import { readCacheEntry, withCacheEntry, createEmptyGameDataCache, runCachedFetch } from './cacheManager';
import type { GameDataCache, MoveData } from '../types/pokemon';
import type { SetStateAction } from 'react';

function makeMove(overrides: Partial<MoveData> = {}): MoveData {
  return {
    name: 'thunderbolt',
    type: 'electric',
    category: 'special',
    power: 90,
    accuracy: 100,
    pp: 15,
    description: 'A strong electric blast crashes down on the target.',
    flags: [],
    target: 'selected-pokemon',
    cachedAt: Date.now(),
    expiresAt: Date.now() + 100_000,
    ...overrides,
  };
}

describe('readCacheEntry', () => {
  it('returns null when the section is undefined', () => {
    expect(readCacheEntry(undefined, 'thunderbolt')).toBeNull();
  });

  it('returns null when the key is missing', () => {
    expect(readCacheEntry({}, 'thunderbolt')).toBeNull();
  });

  it('returns null for an expired entry', () => {
    const section = { thunderbolt: makeMove({ expiresAt: Date.now() - 1000 }) };
    expect(readCacheEntry(section, 'thunderbolt')).toBeNull();
  });

  it('returns the entry when present and not expired', () => {
    const entry = makeMove();
    const section = { thunderbolt: entry };
    expect(readCacheEntry(section, 'thunderbolt')).toBe(entry);
  });
});

describe('withCacheEntry', () => {
  it('adds a new entry to the given section without touching other sections', () => {
    const cache = createEmptyGameDataCache();
    const entry = makeMove();
    const result = withCacheEntry(cache, 'moves', 'thunderbolt', entry);
    expect(result.moves.thunderbolt).toBe(entry);
    expect(result.items).toBe(cache.items);
  });

  it('does not mutate the original cache (returns a new object)', () => {
    const cache = createEmptyGameDataCache();
    const result = withCacheEntry(cache, 'moves', 'thunderbolt', makeMove());
    expect(cache.moves.thunderbolt).toBeUndefined();
    expect(result).not.toBe(cache);
  });

  it('preserves existing entries already in the section', () => {
    const cache = createEmptyGameDataCache();
    const withFirst = withCacheEntry(cache, 'moves', 'thunderbolt', makeMove());
    const withSecond = withCacheEntry(withFirst, 'moves', 'protect', makeMove({ name: 'Protect' }));
    expect(withSecond.moves.thunderbolt).toBeDefined();
    expect(withSecond.moves.protect).toBeDefined();
  });

  it('overwrites an existing entry for the same key', () => {
    const cache = createEmptyGameDataCache();
    const withFirst = withCacheEntry(cache, 'moves', 'thunderbolt', makeMove({ power: 90 }));
    const withUpdated = withCacheEntry(withFirst, 'moves', 'thunderbolt', makeMove({ power: 999 }));
    expect(withUpdated.moves.thunderbolt.power).toBe(999);
  });
});

describe('createEmptyGameDataCache', () => {
  it('produces an empty cache with every section initialized', () => {
    const cache = createEmptyGameDataCache();
    expect(cache.moves).toEqual({});
    expect(cache.items).toEqual({});
    expect(cache.abilities).toEqual({});
    expect(cache.learnsets).toEqual({});
    expect(cache.usage).toEqual({});
    expect(cache.lastSyncedSpeciesNames).toEqual([]);
    expect(cache.version).toBe(1);
  });
});

describe('runCachedFetch', () => {
  function makeSetters() {
    let cache: GameDataCache | null = createEmptyGameDataCache();
    const setCache = vi.fn((updater: SetStateAction<GameDataCache | null>) => {
      cache = typeof updater === 'function' ? (updater as (prev: GameDataCache | null) => GameDataCache | null)(cache) : updater;
    });
    const setIsLoading = vi.fn();
    const setError = vi.fn();
    return { setCache, setIsLoading, setError, getCache: () => cache };
  }

  it('flips loading true then false around a successful fetch', async () => {
    const { setCache, setIsLoading, setError } = makeSetters();
    await runCachedFetch(setCache, setIsLoading, setError, 'moves', 'thunderbolt', async () => makeMove(), 'fetch failed');
    expect(setIsLoading.mock.calls.map(c => c[0])).toEqual([true, false]);
  });

  it('merges a successful result into the cache section and clears the error', async () => {
    const { setCache, setIsLoading, setError, getCache } = makeSetters();
    const entry = makeMove();
    await runCachedFetch(setCache, setIsLoading, setError, 'moves', 'thunderbolt', async () => entry, 'fetch failed');
    expect(getCache()?.moves.thunderbolt).toBe(entry);
    expect(setError).toHaveBeenCalledWith(null);
  });

  it('returns the fetched result', async () => {
    const { setCache, setIsLoading, setError } = makeSetters();
    const entry = makeMove();
    const result = await runCachedFetch(setCache, setIsLoading, setError, 'moves', 'thunderbolt', async () => entry, 'fetch failed');
    expect(result).toBe(entry);
  });

  it('does not touch the cache when the fetcher resolves to null', async () => {
    const { setCache, setIsLoading, setError, getCache } = makeSetters();
    await runCachedFetch(setCache, setIsLoading, setError, 'moves', 'thunderbolt', async () => null, 'fetch failed');
    expect(getCache()?.moves.thunderbolt).toBeUndefined();
    expect(setError).not.toHaveBeenCalled();
  });

  it('surfaces a thrown Error\'s message via setError and returns null', async () => {
    const { setCache, setIsLoading, setError } = makeSetters();
    const result = await runCachedFetch(setCache, setIsLoading, setError, 'moves', 'thunderbolt', async () => {
      throw new Error('network down');
    }, 'fetch failed');
    expect(result).toBeNull();
    expect(setError).toHaveBeenCalledWith('network down');
  });

  it('falls back to the generic errorMessage when a non-Error is thrown', async () => {
    const { setCache, setIsLoading, setError } = makeSetters();
    await runCachedFetch(setCache, setIsLoading, setError, 'moves', 'thunderbolt', async () => {
      throw 'not an Error instance';
    }, 'fetch failed');
    expect(setError).toHaveBeenCalledWith('fetch failed');
  });

  it('still flips loading back to false after a thrown error', async () => {
    const { setCache, setIsLoading, setError } = makeSetters();
    await runCachedFetch(setCache, setIsLoading, setError, 'moves', 'thunderbolt', async () => {
      throw new Error('boom');
    }, 'fetch failed');
    expect(setIsLoading).toHaveBeenLastCalledWith(false);
  });
});
