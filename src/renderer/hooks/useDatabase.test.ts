import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDatabase, createCacheEntry } from './useDatabase';
import { NEVER_EXPIRES } from '../utils/cacheExpiry';
import type { PokeAPICache, PokeAPICacheEntry } from '../types/pokemon';

const BASE_STATS = { hp: 60, attack: 65, defense: 60, specialAttack: 130, specialDefense: 75, speed: 110 };
const NOW = Date.now();

function makeEntry(overrides: Partial<PokeAPICacheEntry> = {}): PokeAPICacheEntry {
  return {
    species: 'gengar',
    pokedexNumber: 94,
    types: ['ghost', 'poison'],
    baseStats: BASE_STATS,
    spriteUrl: 'https://example.com/gengar.png',
    abilities: ['cursed-body'],
    cachedAt: NOW,
    expiresAt: NOW + 100_000,
    ...overrides,
  };
}

function makeCache(entries: Record<string, PokeAPICacheEntry> = {}, overrides: Partial<PokeAPICache> = {}): PokeAPICache {
  return { version: 1, entries, lastCleaned: NOW, ...overrides };
}

describe('useDatabase', () => {
  it('initializes an empty cache and persists it when none exists on disk', async () => {
    const { result } = renderHook(() => useDatabase());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(result.current.cache).toEqual(expect.objectContaining({ version: 1, entries: {} }));
    expect(window.electron.writePokeAPICache).toHaveBeenCalledWith(
      expect.objectContaining({ version: 1, entries: {} })
    );
  });

  it('loads a persisted cache from disk without overwriting it', async () => {
    const cache = makeCache({ gengar: makeEntry() });
    vi.mocked(window.electron.readPokeAPICache).mockResolvedValueOnce(cache);

    const { result } = renderHook(() => useDatabase());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(result.current.cache?.entries.gengar).toEqual(makeEntry());
    expect(window.electron.writePokeAPICache).not.toHaveBeenCalled();
  });

  it('sets an error and still initializes when reading the cache throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(window.electron.readPokeAPICache).mockRejectedValueOnce(new Error('disk error'));

    const { result } = renderHook(() => useDatabase());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(result.current.error).toBe('disk error');
    consoleErrorSpy.mockRestore();
  });

  it('background revalidation cleans expired entries when the clean interval has elapsed', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const cache = makeCache(
      { gengar: makeEntry({ expiresAt: Date.now() - 1000 }), rillaboom: makeEntry({ species: 'rillaboom', expiresAt: Date.now() + 100_000 }) },
      { lastCleaned: eightDaysAgo }
    );
    vi.mocked(window.electron.readPokeAPICache).mockResolvedValueOnce(cache);

    const { result } = renderHook(() => useDatabase());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    await waitFor(() => expect(result.current.isRevalidating).toBe(false));

    expect(result.current.cache?.entries.gengar).toBeUndefined();
    expect(result.current.cache?.entries.rillaboom).toBeDefined();
    consoleLogSpy.mockRestore();
  });

  it('getCachedEntry normalizes species casing/whitespace and returns null for a miss', async () => {
    const cache = makeCache({ gengar: makeEntry() });
    vi.mocked(window.electron.readPokeAPICache).mockResolvedValueOnce(cache);

    const { result } = renderHook(() => useDatabase());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(result.current.getCachedEntry(' Gengar ')).toEqual(makeEntry());
    expect(result.current.getCachedEntry('rillaboom')).toBeNull();
  });

  it('getCachedEntry returns null for an expired entry', async () => {
    const cache = makeCache({ gengar: makeEntry({ expiresAt: Date.now() - 1000 }) });
    vi.mocked(window.electron.readPokeAPICache).mockResolvedValueOnce(cache);

    const { result } = renderHook(() => useDatabase());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(result.current.getCachedEntry('gengar')).toBeNull();
    expect(result.current.isCacheEntryValid('gengar')).toBe(false);
  });

  it('setCacheEntry normalizes the species key, persists, and updates state', async () => {
    const { result } = renderHook(() => useDatabase());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    let success = false;
    await act(async () => {
      success = await result.current.setCacheEntry(' Gengar ', makeEntry());
    });

    expect(success).toBe(true);
    expect(result.current.getCachedEntry('gengar')).toEqual(makeEntry());
    expect(window.electron.writePokeAPICache).toHaveBeenCalledWith(
      expect.objectContaining({ entries: { gengar: makeEntry() } })
    );
  });

  it('setCacheEntry leaves state untouched and returns false when the write fails', async () => {
    const { result } = renderHook(() => useDatabase());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    vi.mocked(window.electron.writePokeAPICache).mockResolvedValueOnce(false);

    let success = true;
    await act(async () => {
      success = await result.current.setCacheEntry('gengar', makeEntry());
    });

    expect(success).toBe(false);
    expect(result.current.getCachedEntry('gengar')).toBeNull();
  });

  it('cleanExpiredEntries removes only expired entries', async () => {
    const cache = makeCache({
      gengar: makeEntry({ expiresAt: Date.now() - 1000 }),
      rillaboom: makeEntry({ species: 'rillaboom', expiresAt: Date.now() + 100_000 }),
    });
    vi.mocked(window.electron.readPokeAPICache).mockResolvedValueOnce(cache);

    const { result } = renderHook(() => useDatabase());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    await act(async () => {
      await result.current.cleanExpiredEntries();
    });

    expect(Object.keys(result.current.cache?.entries ?? {})).toEqual(['rillaboom']);
  });

  it('clearCache resets to an empty cache', async () => {
    const cache = makeCache({ gengar: makeEntry() });
    vi.mocked(window.electron.readPokeAPICache).mockResolvedValueOnce(cache);

    const { result } = renderHook(() => useDatabase());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    await act(async () => {
      await result.current.clearCache();
    });

    expect(result.current.cache?.entries).toEqual({});
  });

  it('refreshCache re-reads the cache from disk', async () => {
    const { result } = renderHook(() => useDatabase());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const cache = makeCache({ gengar: makeEntry() });
    vi.mocked(window.electron.readPokeAPICache).mockResolvedValueOnce(cache);

    await act(async () => {
      await result.current.refreshCache();
    });

    expect(result.current.getCachedEntry('gengar')).toEqual(makeEntry());
  });
});

describe('createCacheEntry', () => {
  it('builds an entry that never expires, normalizing the species key', () => {
    const entry = createCacheEntry(' Gengar ', 94, ['ghost', 'poison'], BASE_STATS, 'https://example.com/gengar.png', ['cursed-body']);

    expect(entry.species).toBe('gengar');
    expect(entry.expiresAt).toBe(NEVER_EXPIRES);
    expect(entry.baseStats).toEqual(BASE_STATS);
  });
});
