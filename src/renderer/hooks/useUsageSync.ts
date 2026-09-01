/**
 * useUsageSync Hook - Champions Ranked-Usage Batched Sync
 * Team Gap Analysis Leg 1 (see TODO.md): bulk-populates GameDataCache.usage
 * (championsbattledata.com ranked-ladder data, including each species'
 * `columnPosition` ladder-usage rank - see ChampionsUsageEntry's doc comment)
 * for every currently-legal roster species, same batched shape as
 * useInitialSync.ts.
 *
 * Unlike useInitialSync, this never gates any UI - the LoadingScreen only
 * waits on useInitialSync, and nothing yet consumes usage.columnPosition
 * (that's Leg 2, the actual ranked-gap-list feature). This hook just needs
 * to run quietly in the background so the data is warm by the time Leg 2
 * exists.
 *
 * "Refreshed on a cadence" here means the existing per-entry 5-day TTL
 * (services/championsBattleData.ts's USAGE_CACHE_DURATION_MS), not a new
 * mechanism - getCachedChampionsUsage already returns null for an expired
 * entry (utils/cacheManager.ts's readCacheEntry), so a species whose cached
 * usage has gone stale is indistinguishable here from one never synced at
 * all: both just get re-fetched the next time this hook runs (every app
 * launch, same as useInitialSync).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { UseGameDataReturn } from './useGameData';
import type { UseSpeciesRosterReturn } from './useSpeciesRoster';
import { validateSpeciesLegality } from '../utils/pokemonRules';
import { runWithConcurrency } from '../utils/concurrency';

const CONCURRENCY = 8;

export interface UseUsageSyncReturn {
  isDone: boolean;
}

export function useUsageSync(
  gameDataState: UseGameDataReturn,
  speciesRosterState: UseSpeciesRosterReturn
): UseUsageSyncReturn {
  const [batchDone, setBatchDone] = useState(false);
  // Same "mutex, not a one-shot latch" reasoning as useInitialSync.ts's
  // isSyncing ref - a manual cache reset can make staleSpecies non-empty
  // again after this hook already finished a pass earlier in the session.
  const isSyncing = useRef(false);

  const { isInitialized, getCachedChampionsUsage, getChampionsUsage } = gameDataState;
  const { roster, isLoading: isRosterLoading } = speciesRosterState;

  const legalRoster = useMemo(
    () => roster.filter(entry => validateSpeciesLegality(entry.name, 'REG-MB')),
    [roster]
  );
  const staleSpecies = useMemo(
    () => legalRoster.filter(entry => !getCachedChampionsUsage(entry.name)),
    [legalRoster, getCachedChampionsUsage]
  );

  const ready = isInitialized && !isRosterLoading && roster.length > 0;
  const alreadyDone = ready && staleSpecies.length === 0;

  useEffect(() => {
    if (isSyncing.current) return;
    if (!ready || staleSpecies.length === 0) return;

    isSyncing.current = true;
    (async () => {
      // A prior batch in this same session may have already set this true -
      // reset it so a later cache reset that makes staleSpecies non-empty
      // again is correctly reflected as in-progress, same reasoning as
      // useInitialSync.ts's own heavySyncDone reset.
      setBatchDone(false);
      await runWithConcurrency(
        staleSpecies, CONCURRENCY,
        () => {},
        entry => getChampionsUsage(entry.name)
      );
      isSyncing.current = false;
      setBatchDone(true);
    })();
  }, [ready, staleSpecies, getChampionsUsage]);

  return { isDone: alreadyDone || batchDone };
}
