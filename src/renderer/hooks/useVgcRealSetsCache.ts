/**
 * useVgcRealSetsCache Hook - VGCPastes Per-Species Real-Set Extraction Cache
 * Same SWR read-on-mount + debounced write-through shape as
 * useVgcPastesCache.ts, but keyed by (regulation, species) rather than just
 * regulation, and with a get-cached-or-fetch-on-miss getter matching
 * useGameData.ts's getChampionsUsage shape instead of a manual refresh()
 * button - extraction here is triggered by a species lookup, not a user
 * clicking Refresh.
 *
 * getRealSets() takes the target regulation's already-cached
 * VgcPasteTeamRow[] as an explicit argument rather than reaching into
 * useVgcPastesCache itself - callers (Leg 4's CalcPokemonPanel.tsx) already
 * have both hooks mounted, and keeping this hook headless/row-source-agnostic
 * is what makes it independently testable per the scoping session's "no UI,
 * unit-testable in isolation" leg boundary.
 */

import { useState, useEffect, useCallback } from 'react';
import type { RegulationLabel, VgcPasteTeamRow, VgcRealSetsCache, VgcRealSetsEntry } from '../types/pokemon';
import { normalizeUsageCacheKey } from '../services/championsBattleData';
import { filterRowsBySpecies, extractRealSetsForSpecies } from '../services/vgcRealSets';
import { useDebouncedWrite } from './useDebouncedWrite';

export interface UseVgcRealSetsCacheReturn {
  cache: VgcRealSetsCache | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  getCachedRealSets: (regulation: RegulationLabel, species: string) => VgcRealSetsEntry | null;
  getRealSets: (
    regulation: RegulationLabel,
    species: string,
    availableRows: VgcPasteTeamRow[]
  ) => Promise<VgcRealSetsEntry | null>;
}

function createEmptyCache(): VgcRealSetsCache {
  return { version: 1, entriesByRegulation: {} };
}

export function useVgcRealSetsCache(): UseVgcRealSetsCacheReturn {
  const [cache, setCache] = useState<VgcRealSetsCache | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Snapshot of what was actually on disk at mount - see useDebouncedWrite.ts's
  // header and useVgcPastesCache.ts's identical use of this pattern.
  const [diskSnapshot, setDiskSnapshot] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    window.electron.readVgcRealSetsCache()
      .then((persisted: VgcRealSetsCache | null) => {
        if (cancelled) return;
        setDiskSnapshot(persisted ? JSON.stringify(persisted) : undefined);
        setCache(persisted ?? createEmptyCache());
        setIsInitialized(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Error reading VGC real-sets cache:', err);
        setDiskSnapshot(undefined);
        setCache(createEmptyCache());
        setIsInitialized(true);
      });
    return () => { cancelled = true; };
  }, []);

  useDebouncedWrite(cache, isInitialized, window.electron.writeVgcRealSetsCache, 'Error persisting VGC real-sets cache:', undefined, diskSnapshot);

  const getCachedRealSets = useCallback((regulation: RegulationLabel, species: string): VgcRealSetsEntry | null => {
    const key = normalizeUsageCacheKey(species);
    return cache?.entriesByRegulation[regulation]?.[key] ?? null;
  }, [cache]);

  const getRealSets = useCallback(async (
    regulation: RegulationLabel,
    species: string,
    availableRows: VgcPasteTeamRow[]
  ): Promise<VgcRealSetsEntry | null> => {
    const cached = getCachedRealSets(regulation, species);
    if (cached) return cached;

    // Empty availableRows means this regulation's catalog hasn't been
    // refreshed yet (useVgcPastesCache.ts), not that the species genuinely
    // has zero real sets - skip extracting, and skip caching a false "0
    // sampled" verdict, until the catalog is actually populated.
    if (availableRows.length === 0) return null;

    setIsLoading(true);
    setError(null);
    try {
      const matchingRows = filterRowsBySpecies(availableRows, species);
      const entry = await extractRealSetsForSpecies(species, matchingRows);
      const key = normalizeUsageCacheKey(species);
      setCache(prev => {
        const base = prev ?? createEmptyCache();
        return {
          ...base,
          entriesByRegulation: {
            ...base.entriesByRegulation,
            [regulation]: { ...base.entriesByRegulation[regulation], [key]: entry },
          },
        };
      });
      return entry;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to extract real sets for "${species}"`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getCachedRealSets]);

  return { cache, isInitialized, isLoading, error, getCachedRealSets, getRealSets };
}
