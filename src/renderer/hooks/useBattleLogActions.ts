/**
 * useBattleLogActions Hook - Battle Log In-Progress Mutations
 * Same relationship to useBattles as useRosterActions has to useTeams:
 * composes over the already-lifted useBattles state (updateBattle/addBattle
 * passed in, never re-instantiated here), exposing higher-level methods that
 * compute a new Battle and write through the same single source of truth.
 */

import { useCallback } from 'react';
import type { Battle, BattleAction, BattleSide, Team, SpeciesRosterEntry } from '../types/pokemon';

export interface UseBattleLogActionsReturn {
  startBattle: (team: Team, selectedIndices: number[]) => Promise<string | null>;
  addOpponentPokemon: (battle: Battle, species: SpeciesRosterEntry) => Promise<boolean>;
  updateOpponentMoveTags: (battle: Battle, opponentId: string, ability?: string, item?: string, teraType?: string) => Promise<boolean>;
  addOpponentMove: (battle: Battle, opponentId: string, move: string) => Promise<boolean>;
  removeOpponentMove: (battle: Battle, opponentId: string, move: string) => Promise<boolean>;
  setActive: (battle: Battle, side: BattleSide, ids: string[]) => Promise<boolean>;
  setFainted: (battle: Battle, side: BattleSide, pokemonId: string, fainted: boolean) => Promise<boolean>;
  logAction: (battle: Battle, action: Omit<BattleAction, 'id'>) => Promise<boolean>;
  advanceTurn: (battle: Battle) => Promise<boolean>;
  undoLastAction: (battle: Battle) => Promise<boolean>;
  setResult: (battle: Battle, result: Battle['result']) => Promise<boolean>;
  setNotes: (battle: Battle, notes: string) => Promise<boolean>;
}

export function useBattleLogActions(
  addBattle: (battle: Battle) => Promise<boolean>,
  updateBattle: (battleId: string, updates: Partial<Battle>) => Promise<boolean>
): UseBattleLogActionsReturn {
  /**
   * Requires exactly 4 selected slots - VGC brings 4 of the team's up-to-6.
   * Snapshots each chosen Pokemon with a fresh id, independent of the live
   * Team, so later roster edits never touch this battle's log.
   */
  const startBattle = useCallback(async (team: Team, selectedIndices: number[]): Promise<string | null> => {
    if (selectedIndices.length !== 4) return null;

    const broughtFour = selectedIndices.map(index => {
      const p = team.pokemon[index];
      return {
        id: crypto.randomUUID(),
        species: p.showdownData.species,
        nickname: p.showdownData.nickname,
        ability: p.showdownData.ability,
        item: p.showdownData.item,
        teraType: p.showdownData.teraType,
        moves: p.showdownData.moves,
        gender: p.showdownData.gender,
        pokedexNumber: p.pokedexNumber,
        types: p.types,
        spriteUrl: p.spriteUrl,
      };
    });

    const now = Date.now();
    const battle: Battle = {
      id: crypto.randomUUID(),
      date: now,
      teamId: team.id,
      teamName: team.name,
      format: team.format,
      broughtFour,
      playerActiveIds: broughtFour.slice(0, 2).map(p => p.id),
      playerFaintedIds: [],
      opponentRoster: [],
      opponentActiveIds: [],
      turns: [{ number: 1, actions: [] }],
      result: 'in-progress',
      createdAt: now,
      updatedAt: now,
    };

    const success = await addBattle(battle);
    return success ? battle.id : null;
  }, [addBattle]);

  const addOpponentPokemon = useCallback(async (battle: Battle, species: SpeciesRosterEntry): Promise<boolean> => {
    const entry = {
      id: crypto.randomUUID(),
      species: species.name,
      pokedexNumber: species.id,
      spriteUrl: species.spriteUrl,
      moves: [],
      fainted: false,
      addedAt: Date.now(),
    };
    return updateBattle(battle.id, { opponentRoster: [...battle.opponentRoster, entry] });
  }, [updateBattle]);

  const updateOpponentMoveTags = useCallback(async (
    battle: Battle,
    opponentId: string,
    ability?: string,
    item?: string,
    teraType?: string
  ): Promise<boolean> => {
    const opponentRoster = battle.opponentRoster.map(o =>
      o.id === opponentId ? { ...o, ability, item, teraType } : o
    );
    return updateBattle(battle.id, { opponentRoster });
  }, [updateBattle]);

  const addOpponentMove = useCallback(async (battle: Battle, opponentId: string, move: string): Promise<boolean> => {
    const trimmed = move.trim();
    if (!trimmed) return false;

    const opponentRoster = battle.opponentRoster.map(o => {
      if (o.id !== opponentId) return o;
      if (o.moves.some(m => m.toLowerCase() === trimmed.toLowerCase())) return o;
      return { ...o, moves: [...o.moves, trimmed] };
    });
    return updateBattle(battle.id, { opponentRoster });
  }, [updateBattle]);

  const removeOpponentMove = useCallback(async (battle: Battle, opponentId: string, move: string): Promise<boolean> => {
    const opponentRoster = battle.opponentRoster.map(o =>
      o.id === opponentId ? { ...o, moves: o.moves.filter(m => m !== move) } : o
    );
    return updateBattle(battle.id, { opponentRoster });
  }, [updateBattle]);

  const setActive = useCallback(async (battle: Battle, side: BattleSide, ids: string[]): Promise<boolean> => {
    return updateBattle(battle.id, side === 'player' ? { playerActiveIds: ids } : { opponentActiveIds: ids });
  }, [updateBattle]);

  const setFainted = useCallback(async (
    battle: Battle,
    side: BattleSide,
    pokemonId: string,
    fainted: boolean
  ): Promise<boolean> => {
    if (side === 'player') {
      const playerFaintedIds = fainted
        ? [...new Set([...battle.playerFaintedIds, pokemonId])]
        : battle.playerFaintedIds.filter(id => id !== pokemonId);
      return updateBattle(battle.id, { playerFaintedIds });
    }

    const opponentRoster = battle.opponentRoster.map(o => o.id === pokemonId ? { ...o, fainted } : o);
    return updateBattle(battle.id, { opponentRoster });
  }, [updateBattle]);

  /** Appends to the last turn's action list, in the order logged. */
  const logAction = useCallback(async (battle: Battle, action: Omit<BattleAction, 'id'>): Promise<boolean> => {
    if (battle.turns.length === 0) return false;

    const turns = [...battle.turns];
    const lastTurn = turns[turns.length - 1];
    turns[turns.length - 1] = {
      ...lastTurn,
      actions: [...lastTurn.actions, { ...action, id: crypto.randomUUID() }],
    };
    return updateBattle(battle.id, { turns });
  }, [updateBattle]);

  const advanceTurn = useCallback(async (battle: Battle): Promise<boolean> => {
    const turns = [...battle.turns, { number: battle.turns.length + 1, actions: [] }];
    return updateBattle(battle.id, { turns });
  }, [updateBattle]);

  /** Cheap safety net for mis-taps during live logging - pops the last action off the last non-empty turn. */
  const undoLastAction = useCallback(async (battle: Battle): Promise<boolean> => {
    const turns = [...battle.turns];
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].actions.length > 0) {
        turns[i] = { ...turns[i], actions: turns[i].actions.slice(0, -1) };
        return updateBattle(battle.id, { turns });
      }
    }
    return false;
  }, [updateBattle]);

  const setResult = useCallback(async (battle: Battle, result: Battle['result']): Promise<boolean> => {
    return updateBattle(battle.id, { result });
  }, [updateBattle]);

  const setNotes = useCallback(async (battle: Battle, notes: string): Promise<boolean> => {
    return updateBattle(battle.id, { notes });
  }, [updateBattle]);

  return {
    startBattle,
    addOpponentPokemon,
    updateOpponentMoveTags,
    addOpponentMove,
    removeOpponentMove,
    setActive,
    setFainted,
    logAction,
    advanceTurn,
    undoLastAction,
    setResult,
    setNotes,
  };
}
