/**
 * useVgcPastesCache Hook - VGCPastes Sample-Team Catalog Cache Manager
 * Same SWR read-on-mount + debounced write-through shape as useDatabase.ts,
 * but keyed by regulation rather than species, and with NO automatic
 * fetch ever - TODO.md's "manually refreshed (a button, no background job)"
 * applies to the very first load too, not just later refreshes. A
 * regulation with no cached rows yet just renders empty until the user
 * clicks Refresh (VgcPasteCatalogModal.tsx).
 */

import { useState, useEffect, useCallback } from 'react';
import type { RegulationLabel, VgcPasteTeamRow, VgcPastesCache } from '../types/pokemon';
import { fetchVgcPasteRows } from '../services/vgcPastes';
import { useDebouncedWrite } from './useDebouncedWrite';

export interface UseVgcPastesCacheReturn {
  cache: VgcPastesCache | null;
  isInitialized: boolean;
  isRefreshing: boolean;
  error: string | null;
  getRows: (regulation: RegulationLabel) => VgcPasteTeamRow[];
  getLastFetchedAt: (regulation: RegulationLabel) => number | null;
  refresh: (regulation: RegulationLabel) => Promise<boolean>;
}

function createEmptyCache(): VgcPastesCache {
  return { version: 1, rowsByRegulation: {}, lastFetchedAtByRegulation: {} };
}

export function useVgcPastesCache(): UseVgcPastesCacheReturn {
  const [cache, setCache] = useState<VgcPastesCache | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Snapshot of what was actually on disk at mount - see useDebouncedWrite.ts's
  // header and useDatabase.ts/useGameData.ts's identical use of this pattern.
  const [diskSnapshot, setDiskSnapshot] = useState<string | undefined>(undefined);

  // Read the persisted cache from disk on mount (SWR-style, matching
  // useDatabase.ts/useGameData.ts) - never fetches live on its own, only
  // ever reads what a prior manual refresh() already wrote.
  useEffect(() => {
    let cancelled = false;
    window.electron.readVgcPastesCache()
      .then((persisted: VgcPastesCache | null) => {
        if (cancelled) return;
        setDiskSnapshot(persisted ? JSON.stringify(persisted) : undefined);
        setCache(persisted ?? createEmptyCache());
        setIsInitialized(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Error reading VGCPastes cache:', err);
        setDiskSnapshot(undefined);
        setCache(createEmptyCache());
        setIsInitialized(true);
      });
    return () => { cancelled = true; };
  }, []);

  useDebouncedWrite(cache, isInitialized, window.electron.writeVgcPastesCache, 'Error persisting VGCPastes cache:', undefined, diskSnapshot);

  const getRows = useCallback((regulation: RegulationLabel): VgcPasteTeamRow[] => {
    return cache?.rowsByRegulation[regulation] ?? [];
  }, [cache]);

  const getLastFetchedAt = useCallback((regulation: RegulationLabel): number | null => {
    return cache?.lastFetchedAtByRegulation[regulation] ?? null;
  }, [cache]);

  const refresh = useCallback(async (regulation: RegulationLabel): Promise<boolean> => {
    setIsRefreshing(true);
    setError(null);
    try {
      const rows = await fetchVgcPasteRows(regulation);
      setCache(prev => {
        const base = prev ?? createEmptyCache();
        return {
          ...base,
          rowsByRegulation: { ...base.rowsByRegulation, [regulation]: rows },
          lastFetchedAtByRegulation: { ...base.lastFetchedAtByRegulation, [regulation]: Date.now() },
        };
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to refresh ${regulation} sample teams`);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return { cache, isInitialized, isRefreshing, error, getRows, getLastFetchedAt, refresh };
}
