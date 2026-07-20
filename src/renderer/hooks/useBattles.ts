/**
 * useBattles Hook - Battle Log CRUD Operations Manager
 * Mirrors useTeams.ts's load/persist/mutate recipe exactly, for the Battle
 * Logger's own battles.json store. See useBattleLogActions.ts for the
 * higher-level in-progress-editing methods (add action, add opponent
 * Pokemon, etc.) built on top of updateBattle here.
 */

import { useState, useCallback, useEffect } from 'react';
import type { Battle, BattleAction, BattlesDatabase, BroughtPokemonSnapshot, OpponentPokemonEntry } from '../types/pokemon';

/** A BattleAction's target as it may exist on disk before `target` became an array. */
type LegacyTarget = NonNullable<BattleAction['target']> | { side: BattleAction['side']; pokemonId: string };

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
  const broughtIds = b.broughtIds ?? playerRoster.map(p => p.id);
  return {
    ...b,
    playerRoster,
    broughtIds,
    setId: b.setId ?? b.id,
    playerActiveIds: toActiveSlots(b.playerActiveIds),
    opponentActiveIds: toActiveSlots(b.opponentActiveIds),
    opponentRoster: (b.opponentRoster ?? []).map(o => ({ ...o, types: o.types ?? [] })),
    megaEvolvedIds: b.megaEvolvedIds ?? [],
    statStages: b.statStages ?? {},
    statusConditions: b.statusConditions ?? {},
    statusSetOnTurn: b.statusSetOnTurn ?? {},
    fieldState: b.fieldState ?? { playerSide: {}, opponentSide: {} },
    turns: b.turns.map(turn => ({
      ...turn,
      actions: turn.actions.map(action => {
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

  addBattle: (battle: Battle) => Promise<boolean>;
  updateBattle: (battleId: string, updates: Partial<Battle>) => Promise<boolean>;
  deleteBattle: (battleId: string) => Promise<boolean>;

  refreshBattles: () => Promise<void>;
  getBattleById: (battleId: string) => Battle | undefined;
}

export function useBattles(): UseBattlesReturn {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadBattlesFromDisk = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const database = await window.electron.readBattlesDatabase();

      if (database) {
        setBattles(database.battles.map(normalizeBattle));
      } else {
        setBattles([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load battles';
      setError(errorMessage);
      console.error('Error loading battles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBattlesFromDisk();
  }, []);

  const persistBattlesToDisk = async (updatedBattles: Battle[]): Promise<boolean> => {
    try {
      const database: BattlesDatabase = {
        version: 1,
        battles: updatedBattles,
        lastModified: Date.now(),
      };

      const success = await window.electron.writeBattlesDatabase(database);

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

  const addBattle = useCallback(async (battle: Battle): Promise<boolean> => {
    const updatedBattles = [battle, ...battles];
    const success = await persistBattlesToDisk(updatedBattles);

    if (success) {
      setBattles(updatedBattles);
      setError(null);
    }

    return success;
  }, [battles]);

  const updateBattle = useCallback(async (
    battleId: string,
    updates: Partial<Battle>
  ): Promise<boolean> => {
    const battleIndex = battles.findIndex(b => b.id === battleId);

    if (battleIndex === -1) {
      setError(`Battle with ID ${battleId} not found`);
      return false;
    }

    const updatedBattles = [...battles];
    updatedBattles[battleIndex] = {
      ...updatedBattles[battleIndex],
      ...updates,
      updatedAt: Date.now(),
    };

    const success = await persistBattlesToDisk(updatedBattles);

    if (success) {
      setBattles(updatedBattles);
      setError(null);
    }

    return success;
  }, [battles]);

  const deleteBattle = useCallback(async (battleId: string): Promise<boolean> => {
    const updatedBattles = battles.filter(b => b.id !== battleId);
    const success = await persistBattlesToDisk(updatedBattles);

    if (success) {
      setBattles(updatedBattles);
      setError(null);
    }

    return success;
  }, [battles]);

  const refreshBattles = useCallback(async (): Promise<void> => {
    await loadBattlesFromDisk();
  }, []);

  const getBattleById = useCallback((battleId: string): Battle | undefined => {
    return battles.find(b => b.id === battleId);
  }, [battles]);

  return {
    battles,
    isLoading,
    error,
    addBattle,
    updateBattle,
    deleteBattle,
    refreshBattles,
    getBattleById,
  };
}
