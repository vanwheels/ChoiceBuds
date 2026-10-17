/**
 * useBattles Hook - Battle Log CRUD Operations Manager
 * Mirrors useTeams.ts's load/persist/mutate recipe exactly, for the Battle
 * Logger's own battles.json store. See useBattleLogActions.ts for the
 * higher-level in-progress-editing methods (add action, add opponent
 * Pokemon, etc.) built on top of updateBattle here.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  Battle,
  BattleAction,
  BattlesDatabase,
  BroughtPokemonSnapshot,
  OpponentPokemonEntry,
  SyncTombstone,
} from '../types/pokemon';
import { getStorageAdapter } from '../services/storage';

/** A BattleAction's target as it may exist on disk before `target` became an array. */
type LegacyTarget =
  NonNullable<BattleAction['target']> | { side: BattleAction['side']; pokemonId: string };

/** Shape of a Battle as it may exist on disk from before a schema change - never exported, read-boundary only. */
interface LegacyBattleShape {
  broughtFour?: BroughtPokemonSnapshot[];
  playerRoster?: BroughtPokemonSnapshot[];
  broughtIds?: string[];
  megaEvolvedIds?: string[];
  statStages?: Battle['statStages'];
  statusConditions?: Battle['statusConditions'];
  statusSetOnTurn?: Battle['statusSetOnTurn'];
  playerActiveIds?: (string | null)[];
  opponentActiveIds?: (string | null)[];
  opponentRoster?: (OpponentPokemonEntry & { types?: string[] })[];
}

/** A legacy active-id list had no slot meaning (just insertion order, 0-2 entries) - pad to the fixed 2-slot tuple, best effort. */
function toActiveSlots(ids: (string | null)[] | undefined): (string | null)[] {
  const arr = ids ?? [];
  return [arr[0] ?? null, arr[1] ?? null];
}

/** Current on-disk shape version for BattlesDatabase - see BattlesDatabase.schemaVersion. */
const BATTLES_SCHEMA_VERSION = 1;

/**
 * Migration hook point for BattlesDatabase - runs once per load, before
 * normalizeBattle's per-battle backfills below. No migrations exist yet
 * (schemaVersion 1 is the first version); a future on-disk shape change
 * bumps BATTLES_SCHEMA_VERSION and adds its upgrade step here, keyed off
 * database.schemaVersion. A database persisted before schemaVersion
 * existed is treated as version 1.
 */
function migrateBattlesDatabase(database: BattlesDatabase): BattlesDatabase {
  return { ...database, schemaVersion: database.schemaVersion ?? BATTLES_SCHEMA_VERSION };
}

/**
 * Backfills battles saved before a schema change, at the read boundary
 * (mirrors the Champions data-override pattern elsewhere in the app) so
 * older records don't crash newer UI:
 * - fieldState: added for field/side-condition tracking
 * - playerRoster/broughtIds: replaced the old fixed-4 broughtFour - a
 *   legacy record's 4 brought Pokemon become playerRoster with all 4
 *   marked brought (matches what the old picker screen already enforced)
 * - megaEvolvedIds: added for the click-to-log flow's Mega tracking
 * - statStages: added for stat-stage tracking
 * - statusConditions/statusSetOnTurn: added for major-status tracking
 * - playerActiveIds/opponentActiveIds: were a plain 0-2-length array with no
 *   slot meaning - padded into the fixed 2-slot tuple (see toActiveSlots)
 * - opponentRoster entries: gained `types` (for type-effectiveness tags) -
 *   backfilled empty for pre-existing entries, since there's no live-fetch
 *   opportunity at the read boundary the way there was at add-time
 * - a logged action's `target` was a single object before spread-move
 *   support - coerce it into a one-element array
 * - setId: added for Bo3 set grouping - a pre-existing battle becomes its
 *   own singleton set (its own id), since every battle must always belong
 *   to a set of at least 1 (see types/pokemon.ts's Battle.setId doc)
 */
function normalizeBattle(b: Battle & LegacyBattleShape): Battle {
  const playerRoster = b.playerRoster ?? b.broughtFour ?? [];
  const broughtIds = b.broughtIds ?? playerRoster.map((p) => p.id);
  return {
    ...b,
    playerRoster,
    broughtIds,
    setId: b.setId ?? b.id,
    playerActiveIds: toActiveSlots(b.playerActiveIds),
    opponentActiveIds: toActiveSlots(b.opponentActiveIds),
    opponentRoster: (b.opponentRoster ?? []).map((o) => ({ ...o, types: o.types ?? [] })),
    megaEvolvedIds: b.megaEvolvedIds ?? [],
    statStages: b.statStages ?? {},
    statusConditions: b.statusConditions ?? {},
    statusSetOnTurn: b.statusSetOnTurn ?? {},
    fieldState: b.fieldState ?? { playerSide: {}, opponentSide: {} },
    turns: b.turns.map((turn) => ({
      ...turn,
      actions: turn.actions.map((action) => {
        const target = action.target as unknown as LegacyTarget | undefined;
        return { ...action, target: target && !Array.isArray(target) ? [target] : target };
      }),
    })),
  };
}

export interface UseBattlesReturn {
  battles: Battle[];
  isLoading: boolean;
  error: string | null;

  // Pending deletes not yet confirmed synced (see TODO.md's Sync Data Model
  // leg) - included in the next sync push, then cleared by applySyncedState.
  tombstones: SyncTombstone[];

  addBattle: (battle: Battle) => Promise<boolean>;
  updateBattle: (battleId: string, updates: Partial<Battle>) => Promise<boolean>;
  deleteBattle: (battleId: string) => Promise<boolean>;

  refreshBattles: () => Promise<void>;
  getBattleById: (battleId: string) => Battle | undefined;
  /**
   * Reconciles local state with a sync merge's result - mirrors
   * useTeams.ts::applySyncedState exactly (same race, same fix; see its own
   * doc comment and docs/investigations/teamcard-notes-sync-race.md for the
   * full rationale). Per battle, keeps whichever side has the newer
   * `updatedAt`; keeps any local-only battle `records` doesn't know about
   * yet, preserving its local list position rather than appending it;
   * drops a `records` entry whose id still has a pending local tombstone
   * instead of letting a locally-deleted battle resurrect. `pushedTombstones`
   * is the tombstone list actually included in the push this response
   * answers - only those are cleared from `tombstones`.
   */
  applySyncedState: (records: Battle[], pushedTombstones: SyncTombstone[]) => Promise<boolean>;
}

export function useBattles(): UseBattlesReturn {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [tombstones, setTombstones] = useState<SyncTombstone[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Mirrors of `battles`/`tombstones` that every mutator below reads as its
  // base instead of the `battles`/`tombstones` closure variables, plus a
  // queue serializing every mutation - same useTeams.ts-style ref+queue fix
  // for the lost-update race (see
  // docs/investigations/sibling-hooks-lost-update-audit.md): two mutations
  // fired before React re-renders used to both read the same stale
  // `battles` closure (most exposed in practice via updateBattle, the
  // single mutator useBattleLogActions.ts funnels every live
  // battle-logging edit through), each build their own "base + my one
  // change" snapshot, and persist independently, silently dropping
  // whichever edit lost the race. Updated synchronously the instant a
  // mutation computes its result, and only ever read/written by code
  // running inside enqueueMutation below.
  const battlesRef = useRef<Battle[]>(battles);
  const tombstonesRef = useRef<SyncTombstone[]>(tombstones);
  const writeQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const enqueueMutation = useCallback(<T>(job: () => Promise<T>): Promise<T> => {
    const run = writeQueueRef.current.then(job, job);
    writeQueueRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  /**
   * Internal: Load battles from disk via preload bridge. Only called from
   * refreshBattles() now - the mount path below inlines its own copy of
   * this logic (see that effect's comment for why).
   */
  const loadBattlesFromDisk = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const raw = await getStorageAdapter().read<BattlesDatabase>('battles-database');
      const database = raw ? migrateBattlesDatabase(raw) : null;

      if (database) {
        const loadedBattles = database.battles.map(normalizeBattle);
        const loadedTombstones = database.tombstones ?? [];
        battlesRef.current = loadedBattles;
        tombstonesRef.current = loadedTombstones;
        setBattles(loadedBattles);
        setTombstones(loadedTombstones);
      } else {
        battlesRef.current = [];
        tombstonesRef.current = [];
        setBattles([]);
        setTombstones([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load battles';
      setError(errorMessage);
      console.error('Error loading battles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load battles from disk on mount. Inlined (rather than calling
   * loadBattlesFromDisk by reference) to match React's own recognized
   * fetch-in-effect idiom - see docs/investigations/set-state-in-effect-lint-fix.md
   * for why the outer-scope function trips react-hooks/set-state-in-effect
   * even though its behavior here is identical.
   */
  useEffect(() => {
    let ignore = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const raw = await getStorageAdapter().read<BattlesDatabase>('battles-database');
        if (ignore) return;
        const database = raw ? migrateBattlesDatabase(raw) : null;

        if (database) {
          const loadedBattles = database.battles.map(normalizeBattle);
          const loadedTombstones = database.tombstones ?? [];
          battlesRef.current = loadedBattles;
          tombstonesRef.current = loadedTombstones;
          setBattles(loadedBattles);
          setTombstones(loadedTombstones);
        } else {
          battlesRef.current = [];
          tombstonesRef.current = [];
          setBattles([]);
          setTombstones([]);
        }
      } catch (err) {
        if (ignore) return;
        const errorMessage = err instanceof Error ? err.message : 'Failed to load battles';
        setError(errorMessage);
        console.error('Error loading battles:', err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const persistBattlesToDisk = async (
    updatedBattles: Battle[],
    updatedTombstones: SyncTombstone[],
  ): Promise<boolean> => {
    try {
      const database: BattlesDatabase = {
        schemaVersion: BATTLES_SCHEMA_VERSION,
        battles: updatedBattles,
        tombstones: updatedTombstones,
        lastModified: Date.now(),
      };

      const success = await getStorageAdapter().write('battles-database', database);

      if (!success) {
        throw new Error('Failed to write battles database');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save battles';
      setError(errorMessage);
      console.error('Error persisting battles:', err);
      return false;
    }
  };

  const addBattle = useCallback(
    (battle: Battle): Promise<boolean> =>
      enqueueMutation(async () => {
        const updatedBattles = [battle, ...battlesRef.current];
        const success = await persistBattlesToDisk(updatedBattles, tombstonesRef.current);

        if (success) {
          battlesRef.current = updatedBattles;
          setBattles(updatedBattles);
          setError(null);
        }

        return success;
      }),
    [enqueueMutation],
  );

  const updateBattle = useCallback(
    (battleId: string, updates: Partial<Battle>): Promise<boolean> =>
      enqueueMutation(async () => {
        const base = battlesRef.current;
        const battleIndex = base.findIndex((b) => b.id === battleId);

        if (battleIndex === -1) {
          setError(`Battle with ID ${battleId} not found`);
          return false;
        }

        const updatedBattles = [...base];
        updatedBattles[battleIndex] = {
          ...updatedBattles[battleIndex],
          ...updates,
          updatedAt: Date.now(),
        };

        const success = await persistBattlesToDisk(updatedBattles, tombstonesRef.current);

        if (success) {
          battlesRef.current = updatedBattles;
          setBattles(updatedBattles);
          setError(null);
        }

        return success;
      }),
    [enqueueMutation],
  );

  /**
   * Also records a tombstone (see TODO.md's Sync Data Model leg) so a future
   * sync merge knows this id was intentionally removed here - cleared once
   * confirmed synced (applySyncedState below).
   */
  const deleteBattle = useCallback(
    (battleId: string): Promise<boolean> =>
      enqueueMutation(async () => {
        const updatedBattles = battlesRef.current.filter((b) => b.id !== battleId);
        const updatedTombstones = [
          ...tombstonesRef.current,
          { id: battleId, deletedAt: Date.now() },
        ];
        const success = await persistBattlesToDisk(updatedBattles, updatedTombstones);

        if (success) {
          battlesRef.current = updatedBattles;
          tombstonesRef.current = updatedTombstones;
          setBattles(updatedBattles);
          setTombstones(updatedTombstones);
          setError(null);
        }

        return success;
      }),
    [enqueueMutation],
  );

  /**
   * Queued behind any in-flight mutation (same enqueueMutation as the
   * mutators above) so it can't read the disk mid-write and then stomp
   * battlesRef/state with a pre-write snapshot once that write actually
   * lands - mirrors useTeams.ts::refreshTeams.
   */
  const refreshBattles = useCallback(
    (): Promise<void> => enqueueMutation(loadBattlesFromDisk),
    [enqueueMutation],
  );

  const getBattleById = useCallback(
    (battleId: string): Battle | undefined => {
      return battles.find((b) => b.id === battleId);
    },
    [battles],
  );

  const applySyncedState = useCallback(
    (records: Battle[], pushedTombstones: SyncTombstone[]): Promise<boolean> =>
      enqueueMutation(async () => {
        const remoteById = new Map(records.map((b) => [b.id, b]));
        const localIds = new Set(battlesRef.current.map((b) => b.id));
        const tombstonedIds = new Set(tombstonesRef.current.map((t) => t.id));
        const reconciled = [
          ...battlesRef.current.map((local) => {
            const remote = remoteById.get(local.id);
            return remote && remote.updatedAt > local.updatedAt ? remote : local;
          }),
          ...records.filter((remote) => !localIds.has(remote.id) && !tombstonedIds.has(remote.id)),
        ];
        const pushedIds = new Set(pushedTombstones.map((t) => t.id));
        const remainingTombstones = tombstonesRef.current.filter((t) => !pushedIds.has(t.id));

        const success = await persistBattlesToDisk(reconciled, remainingTombstones);
        if (success) {
          battlesRef.current = reconciled;
          tombstonesRef.current = remainingTombstones;
          setBattles(reconciled);
          setTombstones(remainingTombstones);
          setError(null);
        }
        return success;
      }),
    [enqueueMutation],
  );

  return {
    battles,
    isLoading,
    error,
    tombstones,
    addBattle,
    updateBattle,
    deleteBattle,
    refreshBattles,
    getBattleById,
    applySyncedState,
  };
}
