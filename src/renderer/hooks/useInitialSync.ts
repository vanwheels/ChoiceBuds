/**
 * useInitialSync Hook - First-Launch / Regulation-Delta Bulk Data Sync
 * Drives the LoadingScreen: whenever the legal species roster contains
 * species not yet in GameDataCache.lastSyncedSpeciesNames (see
 * useGameData.ts) - which on a fresh install is the entire Reg M-B legal
 * roster, and after that is only species a future regulation update adds -
 * eagerly downloads sprites (normal + shiny), move/ability/learnset data,
 * and PokeAPICache species stats/types for those species, plus every
 * VGC-legal item's sprite, so every later launch is fully offline and
 * instant - even for species/items never actually added to a team. Once
 * nothing is unsynced, this reports done immediately with no network calls
 * at all - the app never auto-revalidates already-synced data (see
 * utils/cacheExpiry.ts), it only ever syncs what's genuinely new.
 *
 * Move/ability de-duplication across species needs no special handling here:
 * getMoveData/getAbilityData (useGameData.ts) already check their own cache
 * before fetching, so a move known by 40 species is only ever fetched once.
 * Item metadata (name/category/description/spriteUrl) is fetched by
 * useGameData's own background effect, not here - this hook only needs to
 * wait on getItemData per item to know each one's spriteUrl before it can
 * download the actual sprite image bytes.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { UseGameDataReturn } from './useGameData';
import type { UseSpeciesRosterReturn } from './useSpeciesRoster';
import type { UseSpriteCacheReturn } from './useSpriteCache';
import type { UseDatabaseReturn } from './useDatabase';
import { validateSpeciesLegality } from '../utils/pokemonRules';
import { VGC_ITEMS } from '../config/vgcData';
import { fetchPokemonData, normalizeSpeciesForAPI } from '../services/pokeapi';

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
  items: readonly T[],
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

/** Populates pokeapi-cache.json's species stats/types entry, skipping species already cached from a prior partial sync */
async function syncSpeciesStats(speciesName: string, databaseState: UseDatabaseReturn): Promise<void> {
  const cacheKey = normalizeSpeciesForAPI(speciesName);
  if (databaseState.getCachedEntry(cacheKey)) return;
  const entry = await fetchPokemonData(speciesName);
  await databaseState.setCacheEntry(cacheKey, entry);
}

export function useInitialSync(
  gameDataState: UseGameDataReturn,
  speciesRosterState: UseSpeciesRosterReturn,
  spriteCacheState: UseSpriteCacheReturn,
  databaseState: UseDatabaseReturn
): UseInitialSyncReturn {
  const [progress, setProgress] = useState<SyncProgress>({ label: 'Starting up...', current: 0, total: 1 });
  // A mutex for "a sync is currently running," not a one-shot "has this ever
  // run" latch - a manual cache reset (Settings' "Refresh Game Data") can
  // make unsyncedSpecies non-empty again after this hook already completed
  // a sync earlier in the same session, and that needs to be able to
  // trigger a second real sync pass, not be permanently ignored.
  const isSyncing = useRef(false);

  const { isInitialized, getUnsyncedSpecies, markSpeciesSynced, getEnrichedSpeciesOptions, getItemData } = gameDataState;
  const { roster, isLoading: isRosterLoading } = speciesRosterState;
  const { downloadSprite } = spriteCacheState;
  const { isInitialized: isDatabaseInitialized } = databaseState;

  const legalRoster = useMemo(
    () => roster.filter(entry => validateSpeciesLegality(entry.name, 'REG-MB')),
    [roster]
  );
  const unsyncedSpecies = useMemo(() => getUnsyncedSpecies(legalRoster), [legalRoster, getUnsyncedSpecies]);

  const ready = isInitialized && isDatabaseInitialized && !isRosterLoading && roster.length > 0;

  // "Nothing new to sync" is a pure function of props/state already
  // available at render time - no effect/setState needed for that path at
  // all, only the genuine sync path below needs one.
  const alreadySynced = ready && unsyncedSpecies.length === 0;
  const [heavySyncDone, setHeavySyncDone] = useState(false);
  const isDone = alreadySynced || heavySyncDone;

  useEffect(() => {
    if (isSyncing.current) return;
    if (!ready || unsyncedSpecies.length === 0) return;

    isSyncing.current = true;

    const spriteUrls = unsyncedSpecies.flatMap(entry => [entry.spriteUrl, entry.shinySpriteUrl]);

    (async () => {
      // A prior sync in this same session may have already set this true -
      // reset it so isDone (and the LoadingScreen gate) correctly reflects
      // this new sync being in progress rather than the previous one's result.
      let completed = 0;
      setHeavySyncDone(false);
      setProgress({ label: 'Downloading Sprites', current: 0, total: spriteUrls.length });
      await runWithConcurrency(
        spriteUrls, CONCURRENCY,
        () => setProgress({ label: 'Downloading Sprites', current: ++completed, total: spriteUrls.length }),
        url => downloadSprite(url)
      );

      completed = 0;
      setProgress({ label: 'Downloading Species Data', current: 0, total: unsyncedSpecies.length });
      await runWithConcurrency(
        unsyncedSpecies, CONCURRENCY,
        () => setProgress({ label: 'Downloading Species Data', current: ++completed, total: unsyncedSpecies.length }),
        entry => Promise.all([getEnrichedSpeciesOptions(entry.name), syncSpeciesStats(entry.name, databaseState)])
      );

      completed = 0;
      setProgress({ label: 'Downloading Item Sprites', current: 0, total: VGC_ITEMS.length });
      await runWithConcurrency(
        VGC_ITEMS, CONCURRENCY,
        () => setProgress({ label: 'Downloading Item Sprites', current: ++completed, total: VGC_ITEMS.length }),
        async itemName => {
          const item = await getItemData(itemName);
          if (item?.spriteUrl) await downloadSprite(item.spriteUrl);
        }
      );

      markSpeciesSynced(unsyncedSpecies.map(entry => entry.name));
      isSyncing.current = false;
      setHeavySyncDone(true);
    })();
  }, [ready, unsyncedSpecies, markSpeciesSynced, getEnrichedSpeciesOptions, getItemData, downloadSprite, databaseState]);

  return { isDone, progress };
}
