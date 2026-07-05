/**
 * useGameData Hook - Dynamic Move & Item Data Cache Manager
 * Implements real-time PokeAPI fetching with local caching for moves and items
 * Eliminates hardcoded MOVE_TYPE_MAP by dynamically querying and caching metadata
 */

import { useState, useEffect, useCallback } from 'react';
import type { GameDataCache, MoveData, ItemData } from '../types/pokemon';

export interface UseGameDataReturn {
  cache: GameDataCache | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Move operations
  getMoveData: (moveName: string) => Promise<MoveData | null>;
  getCachedMove: (moveName: string) => MoveData | null;
  
  // Item operations
  getItemData: (itemName: string) => Promise<ItemData | null>;
  getCachedItem: (itemName: string) => ItemData | null;
  
  // Maintenance
  clearCache: () => Promise<boolean>;
}

/**
 * Cache expiration duration: 30 days in milliseconds
 * Move/item data is static, so long cache duration is acceptable
 */
const CACHE_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * PokeAPI base URL
 */
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

/**
 * Custom hook for managing game data (moves & items) with dynamic PokeAPI fetching
 */
export function useGameData(): UseGameDataReturn {
  const [cache, setCache] = useState<GameDataCache | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize cache on mount
   */
  useEffect(() => {
    initializeCache();
  }, []);

  /**
   * Initialize empty cache structure
   */
  const initializeCache = async (): Promise<void> => {
    try {
      // For now, initialize with empty in-memory cache
      // Future enhancement: persist to disk via electron IPC
      const emptyCache: GameDataCache = {
        version: 1,
        moves: {},
        items: {},
        lastCleaned: Date.now(),
      };
      
      setCache(emptyCache);
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize game data cache';
      setError(errorMessage);
      console.error('Error initializing game data cache:', err);
      setIsInitialized(true); // Still mark as initialized to allow app to function
    }
  };

  /**
   * Normalize move/item name for API requests and cache keys
   * Enhanced sanitizer for items like 'Fairy Feather' to map cleanly to 'fairy-feather'
   */
  const normalizeNameForAPI = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s\-]/g, '') // Remove all non-alphanumeric except spaces and hyphens
      .replace(/[\s_]+/g, '-'); // Spaces and underscores to hyphens
  };

  /**
   * Get cached move data (synchronous)
   */
  const getCachedMove = useCallback((moveName: string): MoveData | null => {
    if (!cache) return null;
    
    const normalizedName = normalizeNameForAPI(moveName);
    const moveData = cache.moves[normalizedName];
    
    if (!moveData) return null;
    
    // Check if entry is expired
    if (moveData.expiresAt < Date.now()) {
      return null;
    }
    
    return moveData;
  }, [cache]);

  /**
   * Get cached item data (synchronous)
   */
  const getCachedItem = useCallback((itemName: string): ItemData | null => {
    if (!cache) return null;
    
    const normalizedName = normalizeNameForAPI(itemName);
    const itemData = cache.items[normalizedName];
    
    if (!itemData) return null;
    
    // Check if entry is expired
    if (itemData.expiresAt < Date.now()) {
      return null;
    }
    
    return itemData;
  }, [cache]);

  /**
   * Fetch move data from PokeAPI and cache it
   */
  const getMoveData = useCallback(async (moveName: string): Promise<MoveData | null> => {
    if (!cache) return null;
    
    const normalizedName = normalizeNameForAPI(moveName);
    
    // Check cache first
    const cachedMove = getCachedMove(moveName);
    if (cachedMove) {
      return cachedMove;
    }
    
    // Fetch from API
    setIsLoading(true);
    try {
      const url = `${POKEAPI_BASE_URL}/move/${normalizedName}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Move "${moveName}" not found in PokeAPI`);
          return null;
        }
        throw new Error(`PokeAPI request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract move data
      const now = Date.now();
      const moveData: MoveData = {
        name: normalizedName,
        type: data.type?.name?.toLowerCase() || 'normal',
        category: (data.damage_class?.name?.toLowerCase() || 'status') as 'physical' | 'special' | 'status',
        power: data.power,
        pp: data.pp || 0,
        accuracy: data.accuracy,
        description: extractEffectDescription(data.effect_entries),
        cachedAt: now,
        expiresAt: now + CACHE_EXPIRATION_MS,
      };
      
      // Update cache
      const updatedCache: GameDataCache = {
        ...cache,
        moves: {
          ...cache.moves,
          [normalizedName]: moveData,
        },
      };
      
      setCache(updatedCache);
      setError(null);
      
      console.log(`[useGameData] Cached move: ${moveName} (${moveData.type}, ${moveData.category})`);
      
      return moveData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch move data';
      setError(errorMessage);
      console.error(`Error fetching move "${moveName}":`, err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [cache, getCachedMove]);

  /**
   * Fetch item data from PokeAPI and cache it
   */
  const getItemData = useCallback(async (itemName: string): Promise<ItemData | null> => {
    if (!cache) return null;
    
    const normalizedName = normalizeNameForAPI(itemName);
    
    // Check cache first
    const cachedItem = getCachedItem(itemName);
    if (cachedItem) {
      return cachedItem;
    }
    
    // Fetch from API
    setIsLoading(true);
    try {
      const url = `${POKEAPI_BASE_URL}/item/${normalizedName}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Item "${itemName}" not found in PokeAPI`);
          return null;
        }
        throw new Error(`PokeAPI request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract item data
      const now = Date.now();
      
      // Bug Fix 1: Hardcoded fallback for Fairy Feather description
      let itemEffect = extractItemEffect(data.effect_entries);
      let itemDescription = extractItemDescription(data.flavor_text_entries);
      
      if (normalizedName === 'fairy-feather') {
        if (!itemEffect || itemEffect === 'No effect available') {
          itemEffect = "An item to be held by a Pokémon. It boosts the power of Fairy-type moves.";
        }
        if (!itemDescription || itemDescription === 'No description available') {
          itemDescription = "An item to be held by a Pokémon. It boosts the power of Fairy-type moves.";
        }
      }
      
      const itemData: ItemData = {
        name: normalizedName,
        category: data.category?.name?.toLowerCase() || 'held-items',
        effect: itemEffect,
        description: itemDescription,
        spriteUrl: data.sprites?.default || '',
        cachedAt: now,
        expiresAt: now + CACHE_EXPIRATION_MS,
      };
      
      // Update cache
      const updatedCache: GameDataCache = {
        ...cache,
        items: {
          ...cache.items,
          [normalizedName]: itemData,
        },
      };
      
      setCache(updatedCache);
      setError(null);
      
      console.log(`[useGameData] Cached item: ${itemName} (${itemData.category})`);
      
      return itemData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch item data';
      setError(errorMessage);
      console.error(`Error fetching item "${itemName}":`, err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [cache, getCachedItem]);

  /**
   * Clear entire cache
   */
  const clearCache = useCallback(async (): Promise<boolean> => {
    try {
      const emptyCache: GameDataCache = {
        version: 1,
        moves: {},
        items: {},
        lastCleaned: Date.now(),
      };
      
      setCache(emptyCache);
      setError(null);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear cache';
      setError(errorMessage);
      console.error('Error clearing game data cache:', err);
      return false;
    }
  }, []);

  return {
    cache,
    isInitialized,
    isLoading,
    error,
    getMoveData,
    getCachedMove,
    getItemData,
    getCachedItem,
    clearCache,
  };
}

/**
 * Extract effect description from PokeAPI effect_entries array
 */
function extractEffectDescription(effectEntries: any[]): string {
  if (!effectEntries || effectEntries.length === 0) {
    return 'No description available';
  }
  
  // Prefer English short effect
  const englishEntry = effectEntries.find(
    (entry: any) => entry.language?.name === 'en'
  );
  
  if (englishEntry) {
    return englishEntry.short_effect || englishEntry.effect || 'No description available';
  }
  
  return effectEntries[0]?.short_effect || effectEntries[0]?.effect || 'No description available';
}

/**
 * Extract item effect from PokeAPI effect_entries array
 */
function extractItemEffect(effectEntries: any[]): string {
  if (!effectEntries || effectEntries.length === 0) {
    return 'No effect available';
  }
  
  // Prefer English short effect
  const englishEntry = effectEntries.find(
    (entry: any) => entry.language?.name === 'en'
  );
  
  if (englishEntry) {
    return englishEntry.short_effect || englishEntry.effect || 'No effect available';
  }
  
  return effectEntries[0]?.short_effect || effectEntries[0]?.effect || 'No effect available';
}

/**
 * Extract item description from PokeAPI flavor_text_entries array
 */
function extractItemDescription(flavorTextEntries: any[]): string {
  if (!flavorTextEntries || flavorTextEntries.length === 0) {
    return 'No description available';
  }
  
  // Prefer English flavor text from latest version
  const englishEntries = flavorTextEntries.filter(
    (entry: any) => entry.language?.name === 'en'
  );
  
  if (englishEntries.length > 0) {
    // Get the most recent entry
    const latestEntry = englishEntries[englishEntries.length - 1];
    return latestEntry.text?.replace(/\n/g, ' ').trim() || 'No description available';
  }
  
  return flavorTextEntries[0]?.text?.replace(/\n/g, ' ').trim() || 'No description available';
}
