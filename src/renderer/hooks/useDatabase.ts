/**
 * useDatabase Hook - Local File Data-Fetch Initialization Manager
 * Implements Stale-While-Revalidate (SWR) cache workflow for offline-first operation
 * Instantly serves cached data while quietly validating for updates in background
 */

import { useState, useEffect, useCallback } from 'react';
import type { PokeAPICache, PokeAPICacheEntry } from '../types/pokemon';

interface UseDatabaseReturn {
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
 * Cache expiration duration: 30 days in milliseconds
 * Pokémon data is relatively static, so long cache duration is acceptable
 */
const CACHE_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Cache cleaning interval: 7 days in milliseconds
 * Periodically remove expired entries to prevent cache bloat
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
   * Initialize cache on mount with SWR pattern
   */
  useEffect(() => {
    initializeCacheWithSWR();
  }, []);

  /**
   * Internal: Initialize cache using Stale-While-Revalidate pattern
   * 1. Instantly read and serve cached data from disk (stale)
   * 2. Mark as initialized so app operates offline immediately
   * 3. Run background validation to check for updates (revalidate)
   */
  const initializeCacheWithSWR = async (): Promise<void> => {
    try {
      // Step 1: Instantly serve stale cache from disk
      const cachedData = await window.electronAPI.readPokeAPICache();
      
      if (cachedData) {
        setCache(cachedData);
        setIsInitialized(true);
        
        // Step 2: Background revalidation - check if cleaning is needed
        setIsRevalidating(true);
        await performBackgroundRevalidation(cachedData);
        setIsRevalidating(false);
      } else {
        // Initialize empty cache if none exists
        const emptyCache: PokeAPICache = {
          version: 1,
          entries: {},
          lastCleaned: Date.now(),
        };
        
        await window.electronAPI.writePokeAPICache(emptyCache);
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
  };

  /**
   * Internal: Perform background revalidation checks
   * Quietly validates cache health and performs maintenance if needed
   */
  const performBackgroundRevalidation = async (currentCache: PokeAPICache): Promise<void> => {
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
  };

  /**
   * Internal: Clean expired entries from cache
   */
  const cleanExpiredEntriesInternal = async (currentCache: PokeAPICache): Promise<boolean> => {
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
      
      const success = await window.electronAPI.writePokeAPICache(updatedCache);
      
      if (success) {
        setCache(updatedCache);
        console.log(`[useDatabase] Cleaned ${removedCount} expired cache entries`);
      }
      
      return success;
    } catch (err) {
      console.error('Error cleaning cache:', err);
      return false;
    }
  };

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
   * Set a cache entry for a specific species
   */
  const setCacheEntry = useCallback(async (
    species: string,
    entry: PokeAPICacheEntry
  ): Promise<boolean> => {
    if (!cache) return false;
    
    try {
      const normalizedSpecies = species.toLowerCase().trim();
      
      const updatedCache: PokeAPICache = {
        ...cache,
        entries: {
          ...cache.entries,
          [normalizedSpecies]: entry,
        },
      };
      
      const success = await window.electronAPI.writePokeAPICache(updatedCache);
      
      if (success) {
        setCache(updatedCache);
        setError(null);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set cache entry';
      setError(errorMessage);
      console.error('Error setting cache entry:', err);
      return false;
    }
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
  }, [cache]);

  /**
   * Clear entire cache (useful for debugging or user-initiated reset)
   */
  const clearCache = useCallback(async (): Promise<boolean> => {
    try {
      const emptyCache: PokeAPICache = {
        version: 1,
        entries: {},
        lastCleaned: Date.now(),
      };
      
      const success = await window.electronAPI.writePokeAPICache(emptyCache);
      
      if (success) {
        setCache(emptyCache);
        setError(null);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear cache';
      setError(errorMessage);
      console.error('Error clearing cache:', err);
      return false;
    }
  }, []);

  /**
   * Manually refresh cache from disk
   */
  const refreshCache = useCallback(async (): Promise<void> => {
    await initializeCacheWithSWR();
  }, []);

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
 * Utility function to create a new cache entry with automatic expiration
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
    expiresAt: now + CACHE_EXPIRATION_MS,
  };
}
