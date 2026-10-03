/**
 * useSpeciesStatsPrefetch Hook - Web Cold-Cache Species Stats Backfill
 * Non-gating web counterpart to useInitialSync's species-stats pass: once the
 * roster and pokeapi cache are ready, fetches stats/types for every
 * legal-roster species missing a cache entry so the Add-Pokémon table isn't
 * blank on a cold IndexedDB. Stats only - sprites/moves/learnsets stay lazy,
 * and there's no LoadingScreen. Low concurrency and one pass per session
 * (a species whose fetch fails is retried next launch, not looped): a
 * 250-species burst at concurrency 8 previously got rate-limited by PokeAPI
 * (see useInitialSync.ts's self-heal comment).
 */

import { useEffect, useRef } from 'react';
import type { UseSpeciesRosterReturn } from './useSpeciesRoster';
import type { UseDatabaseReturn } from './useDatabase';
import { syncSpeciesStats } from './useInitialSync';
import { validateSpeciesLegality, LATEST_REGULATION_ID } from '../utils/pokemonRules';
import { normalizeSpeciesForAPI } from '../services/pokeapi';
import { runWithConcurrency } from '../utils/concurrency';

const PREFETCH_CONCURRENCY = 3;

export function useSpeciesStatsPrefetch(
  speciesRosterState: UseSpeciesRosterReturn,
  databaseState: UseDatabaseReturn
): void {
  const hasRun = useRef(false);
  // Latest-state ref so the effect needn't depend on databaseState's identity,
  // which changes on every cache write this very pass makes.
  const databaseRef = useRef(databaseState);
  useEffect(() => {
    databaseRef.current = databaseState;
  });

  const { roster, isLoading } = speciesRosterState;
  const { isInitialized } = databaseState;

  useEffect(() => {
    if (hasRun.current || isLoading || !isInitialized || roster.length === 0) return;
    hasRun.current = true;
    const missing = roster
      .filter(entry => validateSpeciesLegality(entry.name, LATEST_REGULATION_ID))
      .filter(entry => !databaseRef.current.getCachedEntry(normalizeSpeciesForAPI(entry.name)));
    if (missing.length === 0) return;
    void runWithConcurrency(missing, PREFETCH_CONCURRENCY, () => {}, entry =>
      syncSpeciesStats(entry.name, databaseRef.current)
    );
  }, [roster, isLoading, isInitialized]);
}
