/**
 * useDatabase Hook - Local File Data-Fetch Initialization Manager
 * Implements Stale-While-Revalidate (SWR) cache workflow for offline-first operation
 * Instantly serves cached data while quietly validating for updates in background
 */

import { useState, useEffect, useCallback } from 'react';
import type { PokeAPICache, PokeAPICacheEntry } from '../types/pokemon';
import { NEVER_EXPIRES } from '../utils/cacheExpiry';
import { useDebouncedWrite } from './useDebouncedWrite';

export interface UseDatabaseReturn {
  cache: PokeAPICache | null;
  isInitialized: boolean;
  isRevalidating: boolean;
  error: string | null;
  
  // Cache operations
  getCachedEntry: (species: string) => PokeAPICacheEntry | null;
  setCacheEntry: (species: string, entry: PokeAPICacheEntry) => Promise<boolean>;
  isCacheEntryValid: (species: string) => boolean;
  
  // Maintenance
  cleanExpiredEntries: () => Promise<boolean>;
  clearCache: () => Promise<boolean>;
  refreshCache: () => Promise<void>;
}

/**
 * Cache cleaning interval: 7 days in milliseconds. Entries no longer expire
 * (species data is treated as permanent once synced - see NEVER_EXPIRES), so
 * this pass is now effectively a no-op safety net rather than a real
 * maintenance cycle, kept only in case something still slips through with a
 * real expiresAt (e.g. data cached before this change).
 */
const CACHE_CLEAN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Custom hook for managing PokeAPI cache with SWR pattern
 * Provides offline-first operation with background revalidation
 */
export function useDatabase(): UseDatabaseReturn {
  const [cache, setCache] = useState<PokeAPICache | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Internal: Clean expired entries from cache. Persistence is no longer
   * done here directly - it goes through the debounced write-through
   * effect below, same as every other cache mutation in this hook.
   */
  const cleanExpiredEntriesInternal = useCallback(async (currentCache: PokeAPICache): Promise<boolean> => {
    try {
      const now = Date.now();
      const cleanedEntries: Record<string, PokeAPICacheEntry> = {};
      let removedCount = 0;

      // Filter out expired entries
      for (const [species, entry] of Object.entries(currentCache.entries)) {
        if (entry.expiresAt > now) {
          cleanedEntries[species] = entry;
        } else {
          removedCount++;
        }
      }

      const updatedCache: PokeAPICache = {
        ...currentCache,
        entries: cleanedEntries,
        lastCleaned: now,
      };

      setCache(updatedCache);
      console.log(`[useDatabase] Cleaned ${removedCount} expired cache entries`);
      return true;
    } catch (err) {
      console.error('Error cleaning cache:', err);
      return false;
    }
  }, []);

  /**
   * Internal: Perform background revalidation checks
   * Quietly validates cache health and performs maintenance if needed
   */
  const performBackgroundRevalidation = useCallback(async (currentCache: PokeAPICache): Promise<void> => {
    try {
      const now = Date.now();
      const timeSinceLastClean = now - currentCache.lastCleaned;

      // Check if cache cleaning is due
      if (timeSinceLastClean > CACHE_CLEAN_INTERVAL_MS) {
        console.log('[useDatabase] Background revalidation: Cleaning expired entries');
        await cleanExpiredEntriesInternal(currentCache);
      } else {
        console.log('[useDatabase] Background revalidation: Cache is healthy');
      }
    } catch (err) {
      console.error('[useDatabase] Background revalidation failed:', err);
      // Don't set error state - this is a background operation
    }
  }, [cleanExpiredEntriesInternal]);

  /**
   * Internal: Initialize cache using Stale-While-Revalidate pattern
   * 1. Instantly read and serve cached data from disk (stale)
   * 2. Mark as initialized so app operates offline immediately
   * 3. Run background validation to check for updates (revalidate)
   * Only called from refreshCache() now - the mount effect below inlines
   * its own copy of this logic (see that effect's comment for why).
   */
  const initializeCacheWithSWR = useCallback(async (): Promise<void> => {
    try {
      // Step 1: Instantly serve stale cache from disk
      const cachedData = await window.electron.readPokeAPICache();
      
      if (cachedData) {
        setCache(cachedData);
        setIsInitialized(true);
        
        // Step 2: Background revalidation - check if cleaning is needed
        setIsRevalidating(true);
        await performBackgroundRevalidation(cachedData);
        setIsRevalidating(false);
      } else {
        // Initialize empty cache if none exists - persisted via the
        // debounced write-through effect below, same as every other
        // mutation, rather than an immediate write here.
        const emptyCache: PokeAPICache = {
          version: 1,
          entries: {},
          lastCleaned: Date.now(),
        };

        setCache(emptyCache);
        setIsInitialized(true);
      }

      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize cache';
      setError(errorMessage);
      console.error('Error initializing cache:', err);
      setIsInitialized(true); // Still mark as initialized to allow app to function
    }
  }, [performBackgroundRevalidation]);

  /**
   * Initialize cache on mount with SWR pattern. Inlined (rather than calling
   * initializeCacheWithSWR by reference) to match React's own recognized
   * fetch-in-effect idiom - see docs/investigations/set-state-in-effect-lint-fix.md
   * for why the outer-scope function trips react-hooks/set-state-in-effect
   * even though its behavior here is identical. This duplicates the
   * background-revalidation step's cache-cleaning logic inline too (rather
   * than calling performBackgroundRevalidation/cleanExpiredEntriesInternal
   * by reference), since those are themselves local functions whose bodies
   * setState - same reason the top-level call had to be inlined.
   * initializeCacheWithSWR itself is kept as the refreshCache-only path
   * above; cleanExpiredEntriesInternal is kept as-is for the manual
   * cleanExpiredEntries() path below.
   */
  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        // Step 1: Instantly serve stale cache from disk. Explicitly typed
        // (per CLAUDE.md's window.electron-casting convention) rather than
        // left as the preload bridge's `any` - needed here so the
        // Object.entries(cachedData.entries) call below can infer
        // PokeAPICacheEntry instead of unknown.
        const cachedData: PokeAPICache | null = await window.electron.readPokeAPICache();
        if (ignore) return;

        if (cachedData) {
          setCache(cachedData);
          setIsInitialized(true);

          // Step 2: Background revalidation - check if cleaning is needed
          setIsRevalidating(true);
          const now = Date.now();
          const timeSinceLastClean = now - cachedData.lastCleaned;

          if (timeSinceLastClean > CACHE_CLEAN_INTERVAL_MS) {
            console.log('[useDatabase] Background revalidation: Cleaning expired entries');
            try {
              const cleanedEntries: Record<string, PokeAPICacheEntry> = {};
              let removedCount = 0;

              for (const [species, entry] of Object.entries(cachedData.entries)) {
                if (entry.expiresAt > now) {
                  cleanedEntries[species] = entry;
                } else {
                  removedCount++;
                }
              }

              const updatedCache: PokeAPICache = {
                ...cachedData,
                entries: cleanedEntries,
                lastCleaned: now,
              };

              if (ignore) return;
              setCache(updatedCache);
              console.log(`[useDatabase] Cleaned ${removedCount} expired cache entries`);
            } catch (cleanErr) {
              console.error('[useDatabase] Background revalidation failed:', cleanErr);
              // Don't set error state - this is a background operation
            }
          } else {
            console.log('[useDatabase] Background revalidation: Cache is healthy');
          }

          if (!ignore) setIsRevalidating(false);
        } else {
          // Initialize empty cache if none exists - persisted via the
          // debounced write-through effect below.
          const emptyCache: PokeAPICache = {
            version: 1,
            entries: {},
            lastCleaned: Date.now(),
          };

          if (ignore) return;
          setCache(emptyCache);
          setIsInitialized(true);
        }

        if (!ignore) setError(null);
      } catch (err) {
        if (ignore) return;
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize cache';
        setError(errorMessage);
        console.error('Error initializing cache:', err);
        setIsInitialized(true); // Still mark as initialized to allow app to function
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // Debounced write-through to disk, once initialized - the sole
  // persistence path for every mutation above (initial empty-cache
  // creation, background cleaning, setCacheEntry, clearCache). See
  // useDebouncedWrite.ts's header and
  // docs/investigations/app-lag-investigation.md for why this replaced
  // each call site's own immediate write.
  useDebouncedWrite(cache, isInitialized, window.electron.writePokeAPICache, 'Error persisting PokeAPI cache:');

  /**
   * Get a cached entry for a specific species
   */
  const getCachedEntry = useCallback((species: string): PokeAPICacheEntry | null => {
    if (!cache) return null;
    
    const normalizedSpecies = species.toLowerCase().trim();
    const entry = cache.entries[normalizedSpecies];
    
    if (!entry) return null;
    
    // Check if entry is expired
    if (entry.expiresAt < Date.now()) {
      return null;
    }
    
    return entry;
  }, [cache]);

  /**
   * Set a cache entry for a specific species. Persistence goes through the
   * debounced write-through effect below rather than an immediate write
   * here (this is the hot path - one call per cache-miss, and the thing
   * app-lag-investigation.md root-caused). The resolved `true` means the
   * in-memory cache was updated and a disk write has been queued, not that
   * the write itself has been confirmed - matching useGameData.ts's
   * cache-mutation callbacks, which never confirmed disk success either.
   * No caller branches on a `false` result today.
   */
  const setCacheEntry = useCallback(async (
    species: string,
    entry: PokeAPICacheEntry
  ): Promise<boolean> => {
    if (!cache) return false;

    const normalizedSpecies = species.toLowerCase().trim();

    const updatedCache: PokeAPICache = {
      ...cache,
      entries: {
        ...cache.entries,
        [normalizedSpecies]: entry,
      },
    };

    setCache(updatedCache);
    setError(null);
    return true;
  }, [cache]);

  /**
   * Check if a cache entry is valid (exists and not expired)
   */
  const isCacheEntryValid = useCallback((species: string): boolean => {
    const entry = getCachedEntry(species);
    return entry !== null;
  }, [getCachedEntry]);

  /**
   * Manually clean expired entries from cache
   */
  const cleanExpiredEntries = useCallback(async (): Promise<boolean> => {
    if (!cache) return false;
    return cleanExpiredEntriesInternal(cache);
  }, [cache, cleanExpiredEntriesInternal]);

  /**
   * Clear entire cache (useful for debugging or user-initiated reset).
   * Persisted via the debounced write-through effect below.
   */
  const clearCache = useCallback(async (): Promise<boolean> => {
    const emptyCache: PokeAPICache = {
      version: 1,
      entries: {},
      lastCleaned: Date.now(),
    };

    setCache(emptyCache);
    setError(null);
    return true;
  }, []);

  /**
   * Manually refresh cache from disk
   */
  const refreshCache = useCallback(async (): Promise<void> => {
    await initializeCacheWithSWR();
  }, [initializeCacheWithSWR]);

  return {
    cache,
    isInitialized,
    isRevalidating,
    error,
    getCachedEntry,
    setCacheEntry,
    isCacheEntryValid,
    cleanExpiredEntries,
    clearCache,
    refreshCache,
  };
}

/**
 * Utility function to create a new cache entry (never expires)
 * Can be used by other services when fetching from PokeAPI
 */
export function createCacheEntry(
  species: string,
  pokedexNumber: number,
  types: string[],
  baseStats: { hp: number; attack: number; defense: number; specialAttack: number; specialDefense: number; speed: number },
  spriteUrl: string,
  abilities: string[]
): PokeAPICacheEntry {
  const now = Date.now();
  
  return {
    species: species.toLowerCase().trim(),
    pokedexNumber,
    types,
    baseStats,
    spriteUrl,
    abilities,
    cachedAt: now,
    expiresAt: NEVER_EXPIRES,
  };
}
