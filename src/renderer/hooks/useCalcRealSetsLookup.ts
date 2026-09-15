/**
 * useCalcRealSetsLookup - Per-Panel VGCPastes Real-Set Lookup State
 * Extracted out of CalcPokemonPanel.tsx (VGCPastes Per-Species Real-Set
 * Extraction: Calc Panel Real Sets UI, see TODO.md) purely to keep that
 * file's own bulk down - the state/logic here is specific to one
 * CalcPokemonPanel instance's real-set lookup, not shared app state, so it
 * doesn't belong in useVgcRealSetsCache.ts itself (that hook is the shared,
 * persisted-cache instance mounted once in CalcPage.tsx and passed down to
 * both panels - see its own header comment on why a per-panel instance of
 * *that* hook would race on its own writes).
 *
 * entry/isLoading/error are tracked locally here (one instance per
 * CalcPokemonPanel call site) rather than reusing vgcRealSetsState's own
 * isLoading/error, since that underlying hook instance is shared between
 * both Pokemon panels - a single shared flag would cross-contaminate one
 * panel's spinner with the other panel's in-flight lookup.
 */

import { useCallback, useRef, useState } from 'react';
import type { RegulationLabel, VgcRealSetsEntry } from '../types/pokemon';
import type { UseVgcPastesCacheReturn } from './useVgcPastesCache';
import type { UseVgcRealSetsCacheReturn } from './useVgcRealSetsCache';

export interface UseCalcRealSetsLookupReturn {
  entry: VgcRealSetsEntry | null;
  isLoading: boolean;
  error: string | null;
  /** Looks up (cached, or extracts+caches on miss) real sets for `species` in `regulation`. A no-op (leaves entry/isLoading alone) when the regulation's Sample Team Catalog hasn't been refreshed yet - see hasCatalogRows in the caller, which renders a "refresh the catalog" prompt instead of a false "no real sets found" in that case. */
  lookup: (species: string) => Promise<void>;
  /** Refreshes the Sample Team Catalog for `regulation`, then retries `lookup(species)` if that succeeded - the action behind CalcRealSetsSection's empty-catalog "Refresh Catalog" button. */
  refreshCatalogAndRetry: (species: string) => Promise<void>;
}

export function useCalcRealSetsLookup(
  regulation: RegulationLabel,
  vgcPastesState: UseVgcPastesCacheReturn,
  vgcRealSetsState: UseVgcRealSetsCacheReturn
): UseCalcRealSetsLookupReturn {
  // Guards a slower, now-superseded lookup from clobbering a faster one -
  // same pattern as CalcPokemonPanel.tsx's own autoFillRequestRef.
  const requestRef = useRef(0);
  const [entry, setEntry] = useState<VgcRealSetsEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (species: string) => {
    const requestId = ++requestRef.current;
    setEntry(null);
    setError(null);
    const rows = vgcPastesState.getRows(regulation);
    if (rows.length === 0) return;
    setIsLoading(true);
    const result = await vgcRealSetsState.getRealSets(regulation, species, rows);
    if (requestRef.current !== requestId) return;
    setIsLoading(false);
    if (result) {
      setEntry(result);
    } else {
      // getRealSets() swallows its own fetch/parse errors internally (see
      // services/vgcRealSets.ts) and returns null on a genuine failure here
      // (rows were already confirmed non-empty above) - vgcRealSetsState's
      // own `error` is the best signal available, best-effort since that
      // hook instance is shared with the other panel (see this file's
      // header comment).
      setError(vgcRealSetsState.error ?? `Failed to load real sets for "${species}"`);
    }
  }, [regulation, vgcPastesState, vgcRealSetsState]);

  const refreshCatalogAndRetry = useCallback(async (species: string) => {
    const success = await vgcPastesState.refresh(regulation);
    if (success && species) await lookup(species);
  }, [regulation, vgcPastesState, lookup]);

  return { entry, isLoading, error, lookup, refreshCatalogAndRetry };
}
