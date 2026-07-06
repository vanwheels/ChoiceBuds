/**
 * useGameData Hook - Dynamic Move & Item Data Cache Manager
 * Implements real-time PokeAPI fetching with local caching for moves and items
 * Eliminates hardcoded MOVE_TYPE_MAP by dynamically querying and caching metadata
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GameDataCache, MoveData, ItemData, AbilityData, SpeciesLearnsetEntry } from '../types/pokemon';
import { normalizeSpeciesForAPI } from '../services/pokeapi';
import { VGC_ITEMS } from '../config/vgcData';

export interface UseGameDataReturn {
  cache: GameDataCache | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Global legal items collection (VGC_ITEMS enriched with live PokeAPI metadata)
  items: ItemData[];

  // Move operations
  getMoveData: (moveName: string) => Promise<MoveData | null>;
  getCachedMove: (moveName: string) => MoveData | null;

  // Item operations
  getItemData: (itemName: string) => Promise<ItemData | null>;
  getCachedItem: (itemName: string) => ItemData | null;

  // Ability operations
  getAbilityData: (abilityName: string) => Promise<AbilityData | null>;
  getCachedAbility: (abilityName: string) => AbilityData | null;

  // Species learnset operations (validates real legal movepool/abilities per species)
  getSpeciesLearnset: (species: string, gender?: 'M' | 'F' | 'N' | '') => Promise<SpeciesLearnsetEntry | null>;
  getEnrichedSpeciesOptions: (
    species: string,
    gender?: 'M' | 'F' | 'N' | ''
  ) => Promise<{ moves: MoveData[]; abilities: AbilityData[] }>;

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
        abilities: {},
        learnsets: {},
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
   * Get cached ability data (synchronous)
   */
  const getCachedAbility = useCallback((abilityName: string): AbilityData | null => {
    if (!cache) return null;
    
    const normalizedName = normalizeNameForAPI(abilityName);
    const abilityData = cache.abilities[normalizedName];
    
    if (!abilityData) return null;
    
    // Check if entry is expired
    if (abilityData.expiresAt < Date.now()) {
      return null;
    }
    
    return abilityData;
  }, [cache]);

  /**
   * Get cached species learnset (synchronous)
   */
  const getCachedSpeciesLearnset = useCallback((
    species: string,
    gender?: 'M' | 'F' | 'N' | ''
  ): SpeciesLearnsetEntry | null => {
    if (!cache) return null;

    const normalizedSpecies = normalizeSpeciesForAPI(species, gender);
    const learnset = cache.learnsets[normalizedSpecies];

    if (!learnset) return null;

    // Check if entry is expired
    if (learnset.expiresAt < Date.now()) {
      return null;
    }

    return learnset;
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
      setCache(prev => prev ? {
        ...prev,
        moves: {
          ...prev.moves,
          [normalizedName]: moveData,
        },
      } : prev);
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
      setCache(prev => prev ? {
        ...prev,
        items: {
          ...prev.items,
          [normalizedName]: itemData,
        },
      } : prev);
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
   * Fetch ability data from PokeAPI and cache it
   */
  const getAbilityData = useCallback(async (abilityName: string): Promise<AbilityData | null> => {
    if (!cache) return null;
    
    const normalizedName = normalizeNameForAPI(abilityName);
    
    // Check cache first
    const cachedAbility = getCachedAbility(abilityName);
    if (cachedAbility) {
      return cachedAbility;
    }
    
    // Fetch from API
    setIsLoading(true);
    try {
      const url = `${POKEAPI_BASE_URL}/ability/${normalizedName}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Ability "${abilityName}" not found in PokeAPI`);
          return null;
        }
        throw new Error(`PokeAPI request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract ability data
      const now = Date.now();
      const abilityData: AbilityData = {
        name: normalizedName,
        description: extractEffectDescription(data.effect_entries),
        cachedAt: now,
        expiresAt: now + CACHE_EXPIRATION_MS,
      };
      
      // Update cache
      setCache(prev => prev ? {
        ...prev,
        abilities: {
          ...prev.abilities,
          [normalizedName]: abilityData,
        },
      } : prev);
      setError(null);
      
      console.log(`[useGameData] Cached ability: ${abilityName}`);
      
      return abilityData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch ability data';
      setError(errorMessage);
      console.error(`Error fetching ability "${abilityName}":`, err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [cache, getCachedAbility]);

  /**
   * Fetch a species' true legal learnset (abilities + learnable moves) from PokeAPI
   * and cache it. This is the validation source of truth for what a given species
   * can actually have equipped - never a static or per-Pokemon fallback list.
   */
  const getSpeciesLearnset = useCallback(async (
    species: string,
    gender?: 'M' | 'F' | 'N' | ''
  ): Promise<SpeciesLearnsetEntry | null> => {
    if (!cache) return null;

    const normalizedSpecies = normalizeSpeciesForAPI(species, gender);

    // Check cache first
    const cachedLearnset = getCachedSpeciesLearnset(species, gender);
    if (cachedLearnset) {
      return cachedLearnset;
    }

    setIsLoading(true);
    try {
      const url = `${POKEAPI_BASE_URL}/pokemon/${normalizedSpecies}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Species "${species}" not found in PokeAPI`);
          return null;
        }
        throw new Error(`PokeAPI request failed with status ${response.status}`);
      }

      const data = await response.json();

      const now = Date.now();
      const learnset: SpeciesLearnsetEntry = {
        species: normalizedSpecies,
        abilities: (data.abilities || []).map((a: { ability: { name: string } }) => a.ability.name.toLowerCase()),
        moves: (data.moves || []).map((m: { move: { name: string } }) => m.move.name.toLowerCase()),
        cachedAt: now,
        expiresAt: now + CACHE_EXPIRATION_MS,
      };

      setCache(prev => prev ? {
        ...prev,
        learnsets: {
          ...prev.learnsets,
          [normalizedSpecies]: learnset,
        },
      } : prev);
      setError(null);

      console.log(`[useGameData] Cached learnset: ${normalizedSpecies} (${learnset.moves.length} moves, ${learnset.abilities.length} abilities)`);

      return learnset;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch species learnset';
      setError(errorMessage);
      console.error(`Error fetching learnset for "${species}":`, err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [cache, getCachedSpeciesLearnset]);

  /**
   * Resolve a species' full legal option set: its real learnable moves and real
   * possible abilities, each enriched with full metadata via the move/ability caches
   */
  const getEnrichedSpeciesOptions = useCallback(async (
    species: string,
    gender?: 'M' | 'F' | 'N' | ''
  ): Promise<{ moves: MoveData[]; abilities: AbilityData[] }> => {
    const learnset = await getSpeciesLearnset(species, gender);
    if (!learnset) {
      return { moves: [], abilities: [] };
    }

    const [moveResults, abilityResults] = await Promise.all([
      Promise.all(learnset.moves.map(name => getMoveData(name))),
      Promise.all(learnset.abilities.map(name => getAbilityData(name))),
    ]);

    return {
      moves: moveResults.filter((move): move is MoveData => move !== null),
      abilities: abilityResults.filter((ability): ability is AbilityData => ability !== null),
    };
  }, [getSpeciesLearnset, getMoveData, getAbilityData]);

  /**
   * The true global items collection: every VGC-legal item (config/vgcData.ts),
   * enriched with live PokeAPI metadata as each entry is fetched and cached
   */
  const items = useMemo((): ItemData[] => {
    if (!cache) return [];
    return VGC_ITEMS
      .map(itemName => getCachedItem(itemName))
      .filter((item): item is ItemData => item !== null);
  }, [cache, getCachedItem]);

  /**
   * Background-load every VGC-legal item once the cache is ready, so the
   * global items collection is complete rather than populated one-slot-at-a-time
   */
  useEffect(() => {
    if (!isInitialized) return;

    const missingItems = VGC_ITEMS.filter(itemName => !getCachedItem(itemName));
    if (missingItems.length === 0) return;

    missingItems.forEach(itemName => {
      getItemData(itemName);
    });
    // Runs once per cache initialization; getItemData itself is cache-aware and idempotent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  /**
   * Clear entire cache
   */
  const clearCache = useCallback(async (): Promise<boolean> => {
    try {
      const emptyCache: GameDataCache = {
        version: 1,
        moves: {},
        items: {},
        abilities: {},
        learnsets: {},
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
    items,
    getMoveData,
    getCachedMove,
    getItemData,
    getCachedItem,
    getAbilityData,
    getCachedAbility,
    getSpeciesLearnset,
    getEnrichedSpeciesOptions,
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
