/**
 * useGameData Hook - Dynamic Move & Item Data Cache Manager
 * Thin React orchestration layer only: delegates raw PokeAPI fetching to
 * services/pokeapiService and cache read/merge/fetch handling to utils/cacheManager
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GameDataCache, MoveData, ItemData, AbilityData, SpeciesLearnsetEntry } from '../types/pokemon';
import { VGC_ITEMS } from '../config/vgcData';
import { normalizeSpeciesForAPI } from '../services/pokeapi';
import {
  normalizeNameForAPI,
  fetchMoveData,
  fetchItemData,
  fetchAbilityData,
  fetchSpeciesLearnset,
  CACHE_EXPIRATION_MS,
} from '../services/pokeapiService';
import { readCacheEntry, runCachedFetch, withCacheEntry, createEmptyGameDataCache } from '../utils/cacheManager';

type Gender = 'M' | 'F' | 'N' | '';

export interface UseGameDataReturn {
  cache: GameDataCache | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Global legal items collection (VGC_ITEMS enriched with live PokeAPI metadata)
  items: ItemData[];

  getMoveData: (moveName: string) => Promise<MoveData | null>;
  getCachedMove: (moveName: string) => MoveData | null;

  getItemData: (itemName: string) => Promise<ItemData | null>;
  getCachedItem: (itemName: string) => ItemData | null;

  getAbilityData: (abilityName: string) => Promise<AbilityData | null>;
  getCachedAbility: (abilityName: string) => AbilityData | null;

  // Species learnset operations (validates real legal movepool/abilities per species)
  getSpeciesLearnset: (species: string, gender?: Gender) => Promise<SpeciesLearnsetEntry | null>;
  getEnrichedSpeciesOptions: (species: string, gender?: Gender) => Promise<{ moves: MoveData[]; abilities: AbilityData[] }>;

  clearCache: () => Promise<boolean>;

  // One-time bulk first-launch sync tracking (see useInitialSync.ts)
  hasCompletedInitialBulkSync: boolean;
  markInitialBulkSyncCompleted: () => void;
}

/**
 * Custom hook for managing game data (moves, items, abilities, learnsets)
 */
export function useGameData(): UseGameDataReturn {
  const [cache, setCache] = useState<GameDataCache | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Read the persisted cache from disk on mount (SWR-style, matching
  // useDatabase.ts) - previously this always reset to empty on every launch,
  // meaning move/item/ability/learnset data could never survive a restart.
  useEffect(() => {
    let cancelled = false;
    window.electron.readGameDataCache()
      .then((persisted: GameDataCache | null) => {
        if (cancelled) return;
        setCache(persisted ?? createEmptyGameDataCache());
        setIsInitialized(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Error reading game data cache:', err);
        setCache(createEmptyGameDataCache());
        setIsInitialized(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Write-through to disk on every change, once initialized - mirrors
  // useTeams.ts/useDatabase.ts's "persist on every mutation" convention.
  useEffect(() => {
    if (!isInitialized || !cache) return;
    window.electron.writeGameDataCache(cache).catch((err: unknown) => {
      console.error('Error persisting game data cache:', err);
    });
  }, [isInitialized, cache]);

  const getCachedMove = useCallback((moveName: string): MoveData | null =>
    readCacheEntry(cache?.moves, normalizeNameForAPI(moveName)), [cache]);

  const getCachedItem = useCallback((itemName: string): ItemData | null =>
    readCacheEntry(cache?.items, normalizeNameForAPI(itemName)), [cache]);

  const getCachedAbility = useCallback((abilityName: string): AbilityData | null =>
    readCacheEntry(cache?.abilities, normalizeNameForAPI(abilityName)), [cache]);

  const getCachedSpeciesLearnset = useCallback((species: string, gender?: Gender): SpeciesLearnsetEntry | null =>
    readCacheEntry(cache?.learnsets, normalizeSpeciesForAPI(species, gender)), [cache]);

  const getMoveData = useCallback(async (moveName: string): Promise<MoveData | null> => {
    const cached = getCachedMove(moveName);
    if (cached) return cached;
    const normalizedName = normalizeNameForAPI(moveName);
    return runCachedFetch(setCache, setIsLoading, setError, 'moves', normalizedName,
      () => fetchMoveData(normalizedName), `Failed to fetch move "${moveName}"`);
  }, [getCachedMove]);

  const getItemData = useCallback(async (itemName: string): Promise<ItemData | null> => {
    const cached = getCachedItem(itemName);
    if (cached) return cached;
    const normalizedName = normalizeNameForAPI(itemName);
    return runCachedFetch(setCache, setIsLoading, setError, 'items', normalizedName,
      () => fetchItemData(normalizedName), `Failed to fetch item "${itemName}"`);
  }, [getCachedItem]);

  const getAbilityData = useCallback(async (abilityName: string): Promise<AbilityData | null> => {
    const cached = getCachedAbility(abilityName);
    if (cached) return cached;
    const normalizedName = normalizeNameForAPI(abilityName);
    return runCachedFetch(setCache, setIsLoading, setError, 'abilities', normalizedName,
      () => fetchAbilityData(normalizedName), `Failed to fetch ability "${abilityName}"`);
  }, [getCachedAbility]);

  const getSpeciesLearnset = useCallback(async (species: string, gender?: Gender): Promise<SpeciesLearnsetEntry | null> => {
    const cached = getCachedSpeciesLearnset(species, gender);
    if (cached) return cached;
    const normalizedSpecies = normalizeSpeciesForAPI(species, gender);
    return runCachedFetch(setCache, setIsLoading, setError, 'learnsets', normalizedSpecies,
      () => fetchSpeciesLearnset(species, gender), `Failed to fetch learnset for "${species}"`);
  }, [getCachedSpeciesLearnset]);

  /**
   * Resolve a species' full legal option set: its real learnable moves and real
   * possible abilities, each enriched with full metadata via the move/ability caches
   */
  const getEnrichedSpeciesOptions = useCallback(async (
    species: string,
    gender?: Gender
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
   * global items collection is complete rather than populated one-slot-at-a-time.
   *
   * Some configured items (newly-introduced Mega Stones this game added for
   * species that never had one in mainline Pokemon, e.g. Falinksite,
   * Scovillainite) don't exist in PokeAPI yet and 404. Rather than silently
   * dropping them from the picker, synthesize a minimal placeholder entry so
   * every item in VGC_ITEMS still shows up and is selectable, just without
   * a sprite/description until PokeAPI catches up.
   */
  useEffect(() => {
    if (!isInitialized) return;
    VGC_ITEMS
      .filter(itemName => !getCachedItem(itemName))
      .forEach(itemName => {
        getItemData(itemName).then(data => {
          if (data) return;
          const normalizedName = normalizeNameForAPI(itemName);
          const now = Date.now();
          const fallback: ItemData = {
            name: normalizedName,
            category: 'unknown',
            effect: 'No effect data available',
            description: 'No description available',
            spriteUrl: '',
            cachedAt: now,
            expiresAt: now + CACHE_EXPIRATION_MS,
          };
          setCache(prev => prev ? withCacheEntry(prev, 'items', normalizedName, fallback) : prev);
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  const clearCache = useCallback(async (): Promise<boolean> => {
    setCache(createEmptyGameDataCache());
    setError(null);
    return true;
  }, []);

  const hasCompletedInitialBulkSync = cache?.initialBulkSyncCompletedAt != null;
  const markInitialBulkSyncCompleted = useCallback(() => {
    setCache(prev => prev && { ...prev, initialBulkSyncCompletedAt: Date.now() });
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
    hasCompletedInitialBulkSync,
    markInitialBulkSyncCompleted,
  };
}
