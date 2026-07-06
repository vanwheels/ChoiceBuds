/**
 * Generic read/merge/fetch-orchestration utilities for GameDataCache sections
 * (moves, items, abilities, learnsets). Centralizes expiration checks and the
 * functional setState pattern needed so concurrent fetches never stomp each
 * other's cache writes.
 */

import type { Dispatch, SetStateAction } from 'react';
import type { GameDataCache } from '../types/pokemon';

interface Expirable {
  expiresAt: number;
}

/**
 * Reads a single entry out of a cache section, returning null if missing or expired
 */
export function readCacheEntry<T extends Expirable>(
  section: Record<string, T> | undefined,
  key: string
): T | null {
  const entry = section?.[key];
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) return null;
  return entry;
}

type CacheSection = 'moves' | 'items' | 'abilities' | 'learnsets';

/**
 * Returns a new cache with a single entry merged into one section.
 * Pass the previous cache from a functional setState update (never a
 * closured snapshot) so concurrent writes merge instead of overwriting.
 */
export function withCacheEntry<K extends CacheSection>(
  cache: GameDataCache,
  section: K,
  key: string,
  value: GameDataCache[K][string]
): GameDataCache {
  return {
    ...cache,
    [section]: {
      ...cache[section],
      [key]: value,
    },
  };
}

/**
 * Builds a fresh, empty GameDataCache (used on init and on clear)
 */
export function createEmptyGameDataCache(): GameDataCache {
  return {
    version: 1,
    moves: {},
    items: {},
    abilities: {},
    learnsets: {},
    lastCleaned: Date.now(),
  };
}

/**
 * Concurrency handler for a single cache-backed fetch: flips loading state,
 * merges a successful result into its cache section via a functional setState
 * update (so parallel in-flight fetches never stomp each other), and surfaces
 * failures through the shared error state. This is the one place a fetch
 * result touches React state - callers only supply the fetcher itself.
 */
export async function runCachedFetch<K extends CacheSection>(
  setCache: Dispatch<SetStateAction<GameDataCache | null>>,
  setIsLoading: Dispatch<SetStateAction<boolean>>,
  setError: Dispatch<SetStateAction<string | null>>,
  section: K,
  key: string,
  fetcher: () => Promise<GameDataCache[K][string] | null>,
  errorMessage: string
): Promise<GameDataCache[K][string] | null> {
  setIsLoading(true);
  try {
    const result = await fetcher();
    if (result) {
      setCache(prev => prev ? withCacheEntry(prev, section, key, result) : prev);
      setError(null);
    }
    return result;
  } catch (err) {
    setError(err instanceof Error ? err.message : errorMessage);
    console.error(errorMessage, err);
    return null;
  } finally {
    setIsLoading(false);
  }
}
