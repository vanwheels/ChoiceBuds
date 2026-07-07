/**
 * useInitialSync Hook - One-Time Bulk First-Launch Data Sync
 * Drives the LoadingScreen: on the very first launch (tracked via
 * GameDataCache.initialBulkSyncCompletedAt, see useGameData.ts), eagerly
 * downloads sprites and move/ability/learnset data for the entire Reg M-B
 * legal species roster, so every later launch is fully offline and instant -
 * even for species never actually added to a team. On every launch after
 * that, this just reports done immediately (no re-sync).
 *
 * Move/ability de-duplication across species needs no special handling here:
 * getMoveData/getAbilityData (useGameData.ts) already check their own cache
 * before fetching, so a move known by 40 species is only ever fetched once.
 * Item data is handled by useGameData's own background effect, not here.
 */

import { useEffect, useRef, useState } from 'react';
import type { UseGameDataReturn } from './useGameData';
import type { UseSpeciesRosterReturn } from './useSpeciesRoster';
import type { UseSpriteCacheReturn } from './useSpriteCache';
import { validateSpeciesLegality } from '../utils/pokemonRules';

const CONCURRENCY = 8;

export interface SyncProgress {
  label: string;
  current: number;
  total: number;
}

export interface UseInitialSyncReturn {
  isDone: boolean;
  progress: SyncProgress;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  onTick: () => void,
  worker: (item: T) => Promise<unknown>
): Promise<void> {
  let index = 0;
  async function runNext(): Promise<void> {
    const current = index++;
    if (current >= items.length) return;
    try {
      await worker(items[current]);
    } catch {
      // Per-item failures are skipped, not fatal to the overall sync
    } finally {
      onTick();
    }
    return runNext();
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runNext));
}

export function useInitialSync(
  gameDataState: UseGameDataReturn,
  speciesRosterState: UseSpeciesRosterReturn,
  spriteCacheState: UseSpriteCacheReturn
): UseInitialSyncReturn {
  const [isDone, setIsDone] = useState(false);
  const [progress, setProgress] = useState<SyncProgress>({ label: 'Starting up...', current: 0, total: 1 });
  const hasStarted = useRef(false);

  const { isInitialized, hasCompletedInitialBulkSync, markInitialBulkSyncCompleted, getEnrichedSpeciesOptions } = gameDataState;
  const { roster, isLoading: isRosterLoading } = speciesRosterState;
  const { downloadSprite } = spriteCacheState;

  useEffect(() => {
    if (hasStarted.current) return;
    if (!isInitialized || isRosterLoading || roster.length === 0) return;

    if (hasCompletedInitialBulkSync) {
      setIsDone(true);
      return;
    }

    hasStarted.current = true;

    const legalRoster = roster.filter(entry => validateSpeciesLegality(entry.name, 'REG-MB'));

    (async () => {
      let completed = 0;
      setProgress({ label: 'Downloading Sprites', current: 0, total: legalRoster.length });
      await runWithConcurrency(
        legalRoster, CONCURRENCY,
        () => setProgress({ label: 'Downloading Sprites', current: ++completed, total: legalRoster.length }),
        entry => downloadSprite(entry.spriteUrl)
      );

      completed = 0;
      setProgress({ label: 'Downloading Move & Ability Data', current: 0, total: legalRoster.length });
      await runWithConcurrency(
        legalRoster, CONCURRENCY,
        () => setProgress({ label: 'Downloading Move & Ability Data', current: ++completed, total: legalRoster.length }),
        entry => getEnrichedSpeciesOptions(entry.name)
      );

      markInitialBulkSyncCompleted();
      setIsDone(true);
    })();
  }, [isInitialized, isRosterLoading, roster, hasCompletedInitialBulkSync, markInitialBulkSyncCompleted, getEnrichedSpeciesOptions, downloadSprite]);

  return { isDone, progress };
}
