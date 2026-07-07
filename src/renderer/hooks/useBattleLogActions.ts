/**
 * useBattleLogActions Hook - Battle Log In-Progress Mutations
 * Same relationship to useBattles as useRosterActions has to useTeams:
 * composes over the already-lifted useBattles state (updateBattle/addBattle
 * passed in, never re-instantiated here), exposing higher-level methods that
 * compute a new Battle and write through the same single source of truth.
 */

import { useCallback } from 'react';
import type {
  Battle, BattleAction, BattleSide, Team, SpeciesRosterEntry,
  WeatherType, TerrainType, SideConditions,
} from '../types/pokemon';
import type { TurnTrackedCondition, BooleanHazard, StackableHazard } from '../config/fieldConditions';
import { findBattlePokemon } from '../utils/battleLookup';

export const MAX_OPPONENT_ROSTER_SIZE = 6;
export const MAX_BROUGHT = 4;

/** Pure append - shared by logAction and any mutation that needs to bundle a log entry into its own single updateBattle call (avoids racing two sequential updateBattle calls off the same stale closure). */
function appendAction(turns: Battle['turns'], action: Omit<BattleAction, 'id'>): Battle['turns'] {
  const next = [...turns];
  const lastTurn = next[next.length - 1];
  next[next.length - 1] = { ...lastTurn, actions: [...lastTurn.actions, { ...action, id: crypto.randomUUID() }] };
  return next;
}

export interface UseBattleLogActionsReturn {
  startBattle: (team: Team) => Promise<string | null>;
  toggleBrought: (battle: Battle, pokemonId: string) => Promise<boolean>;
  addOpponentPokemon: (battle: Battle, species: SpeciesRosterEntry) => Promise<boolean>;
  updateOpponentMoveTags: (battle: Battle, opponentId: string, ability?: string, item?: string) => Promise<boolean>;
  addOpponentMove: (battle: Battle, opponentId: string, move: string) => Promise<boolean>;
  removeOpponentMove: (battle: Battle, opponentId: string, move: string) => Promise<boolean>;
  switchActive: (battle: Battle, side: BattleSide, pokemonId: string) => Promise<boolean>;
  setMegaEvolved: (battle: Battle, pokemonId: string) => Promise<boolean>;
  setFainted: (battle: Battle, side: BattleSide, pokemonId: string, fainted: boolean) => Promise<boolean>;
  logAction: (battle: Battle, action: Omit<BattleAction, 'id'>) => Promise<boolean>;
  setActionFailed: (battle: Battle, turnNumber: number, actionId: string, failed: boolean) => Promise<boolean>;
  advanceTurn: (battle: Battle) => Promise<boolean>;
  undoLastAction: (battle: Battle) => Promise<boolean>;
  setResult: (battle: Battle, result: Battle['result']) => Promise<boolean>;
  setNotes: (battle: Battle, notes: string) => Promise<boolean>;
  setWeather: (battle: Battle, type: WeatherType | null, wasMegaEvolved?: boolean) => Promise<boolean>;
  setTerrain: (battle: Battle, type: TerrainType | null, wasMegaEvolved?: boolean) => Promise<boolean>;
  toggleTurnCondition: (battle: Battle, side: BattleSide, key: TurnTrackedCondition) => Promise<boolean>;
  toggleBooleanHazard: (battle: Battle, side: BattleSide, key: BooleanHazard) => Promise<boolean>;
  setStackableHazard: (battle: Battle, side: BattleSide, key: StackableHazard, layers: number) => Promise<boolean>;
}

export function useBattleLogActions(
  addBattle: (battle: Battle) => Promise<boolean>,
  updateBattle: (battleId: string, updates: Partial<Battle>) => Promise<boolean>
): UseBattleLogActionsReturn {
  /**
   * Snapshots the whole team (up to 6) at battle start - matches real VGC
   * Team Preview, where you see all 6 before choosing which 4 to bring.
   * broughtIds starts empty; toggleBrought fills it in live from the
   * roster column instead of a separate upfront picker screen.
   */
  const startBattle = useCallback(async (team: Team): Promise<string | null> => {
    const playerRoster = team.pokemon.map(p => ({
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
    }));

    const now = Date.now();
    const battle: Battle = {
      id: crypto.randomUUID(),
      date: now,
      teamId: team.id,
      teamName: team.name,
      format: team.format,
      playerRoster,
      broughtIds: [],
      playerActiveIds: [],
      playerFaintedIds: [],
      opponentRoster: [],
      opponentActiveIds: [],
      megaEvolvedIds: [],
      turns: [{ number: 1, actions: [] }],
      fieldState: { playerSide: {}, opponentSide: {} },
      result: 'in-progress',
      createdAt: now,
      updatedAt: now,
    };

    const success = await addBattle(battle);
    return success ? battle.id : null;
  }, [addBattle]);

  /** Capped at MAX_BROUGHT (4) - toggling off also drops the mon from active/fainted if it was there. */
  const toggleBrought = useCallback(async (battle: Battle, pokemonId: string): Promise<boolean> => {
    const isBrought = battle.broughtIds.includes(pokemonId);
    if (!isBrought && battle.broughtIds.length >= MAX_BROUGHT) return false;

    const broughtIds = isBrought
      ? battle.broughtIds.filter(id => id !== pokemonId)
      : [...battle.broughtIds, pokemonId];
    const playerActiveIds = isBrought ? battle.playerActiveIds.filter(id => id !== pokemonId) : battle.playerActiveIds;
    const playerFaintedIds = isBrought ? battle.playerFaintedIds.filter(id => id !== pokemonId) : battle.playerFaintedIds;
    return updateBattle(battle.id, { broughtIds, playerActiveIds, playerFaintedIds });
  }, [updateBattle]);

  const addOpponentPokemon = useCallback(async (battle: Battle, species: SpeciesRosterEntry): Promise<boolean> => {
    if (battle.opponentRoster.length >= MAX_OPPONENT_ROSTER_SIZE) return false;
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
    item?: string
  ): Promise<boolean> => {
    const opponentRoster = battle.opponentRoster.map(o =>
      o.id === opponentId ? { ...o, ability, item } : o
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

  /**
   * Appends to the last turn's action list, in the order logged. Logging an
   * opponent's move also reveals it (dedup, same rule as addOpponentMove)
   * in this same updateBattle call - the click-to-log flow never needs a
   * separate reveal step for a freshly-typed opponent move.
   */
  const logAction = useCallback(async (battle: Battle, action: Omit<BattleAction, 'id'>): Promise<boolean> => {
    if (battle.turns.length === 0) return false;
    const trimmedMove = action.move?.trim();
    const opponentRoster = action.side === 'opponent' && trimmedMove
      ? battle.opponentRoster.map(o => {
          if (o.id !== action.pokemonId || o.moves.some(m => m.toLowerCase() === trimmedMove.toLowerCase())) return o;
          return { ...o, moves: [...o.moves, trimmedMove] };
        })
      : battle.opponentRoster;
    return updateBattle(battle.id, { turns: appendAction(battle.turns, action), opponentRoster });
  }, [updateBattle]);

  /**
   * Toggles a Pokemon in/out of its side's active slots (capped at 2 - to
   * bring in a 3rd, bench one first, same ergonomic as before). Bringing a
   * Pokemon IN also logs a switch-phase action, which is what drives the
   * Battlefield's switched-in arrow for the rest of the current turn - both
   * changes go through one updateBattle call so they can't race each other.
   */
  const switchActive = useCallback(async (battle: Battle, side: BattleSide, pokemonId: string): Promise<boolean> => {
    const activeIds = side === 'player' ? battle.playerActiveIds : battle.opponentActiveIds;
    const isActive = activeIds.includes(pokemonId);
    if (!isActive && side === 'player' && !battle.broughtIds.includes(pokemonId)) return false;
    if (!isActive && activeIds.length >= 2) return false;

    const nextActiveIds = isActive ? activeIds.filter(id => id !== pokemonId) : [...activeIds, pokemonId];
    const turns = isActive ? battle.turns : appendAction(battle.turns, { side, pokemonId, phase: 'switch', note: 'Switched in' });
    return updateBattle(battle.id, {
      ...(side === 'player' ? { playerActiveIds: nextActiveIds } : { opponentActiveIds: nextActiveIds }),
      turns,
    });
  }, [updateBattle]);

  /** Marks a Pokemon as having Mega Evolved this battle (once only) and logs a mega-phase action. */
  const setMegaEvolved = useCallback(async (battle: Battle, pokemonId: string): Promise<boolean> => {
    if (battle.megaEvolvedIds.includes(pokemonId)) return false;
    const side: BattleSide = battle.playerRoster.some(p => p.id === pokemonId) ? 'player' : 'opponent';
    if (!findBattlePokemon(battle, side, pokemonId)) return false;

    return updateBattle(battle.id, {
      megaEvolvedIds: [...battle.megaEvolvedIds, pokemonId],
      turns: appendAction(battle.turns, { side, pokemonId, phase: 'mega', note: 'Mega Evolved' }),
    });
  }, [updateBattle]);

  /** Powers the TurnLog's "Failed?" chip on a repeat Protect-family use. */
  const setActionFailed = useCallback(async (
    battle: Battle,
    turnNumber: number,
    actionId: string,
    failed: boolean
  ): Promise<boolean> => {
    const turns = battle.turns.map(turn => turn.number !== turnNumber ? turn : {
      ...turn,
      actions: turn.actions.map(action => action.id !== actionId ? action : { ...action, failed }),
    });
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

  const setWeather = useCallback(async (
    battle: Battle,
    type: WeatherType | null,
    wasMegaEvolved?: boolean
  ): Promise<boolean> => {
    const currentTurn = battle.turns.length;
    return updateBattle(battle.id, {
      fieldState: { ...battle.fieldState, weather: type ? { type, setOnTurn: currentTurn, wasMegaEvolved } : undefined },
    });
  }, [updateBattle]);

  const setTerrain = useCallback(async (
    battle: Battle,
    type: TerrainType | null,
    wasMegaEvolved?: boolean
  ): Promise<boolean> => {
    const currentTurn = battle.turns.length;
    return updateBattle(battle.id, {
      fieldState: { ...battle.fieldState, terrain: type ? { type, setOnTurn: currentTurn, wasMegaEvolved } : undefined },
    });
  }, [updateBattle]);

  const updateSideConditions = useCallback((battle: Battle, side: BattleSide, next: SideConditions) => {
    const key = side === 'player' ? 'playerSide' : 'opponentSide';
    return updateBattle(battle.id, { fieldState: { ...battle.fieldState, [key]: next } });
  }, [updateBattle]);

  const sideConditionsFor = (battle: Battle, side: BattleSide): SideConditions =>
    side === 'player' ? battle.fieldState.playerSide : battle.fieldState.opponentSide;

  const toggleTurnCondition = useCallback(async (
    battle: Battle,
    side: BattleSide,
    key: TurnTrackedCondition
  ): Promise<boolean> => {
    const currentTurn = battle.turns.length;
    const conditions = sideConditionsFor(battle, side);
    const next: SideConditions = {
      ...conditions,
      [key]: conditions[key] != null ? undefined : currentTurn,
    };
    return updateSideConditions(battle, side, next);
  }, [updateSideConditions]);

  const toggleBooleanHazard = useCallback(async (
    battle: Battle,
    side: BattleSide,
    key: BooleanHazard
  ): Promise<boolean> => {
    const conditions = sideConditionsFor(battle, side);
    const next: SideConditions = { ...conditions, [key]: conditions[key] ? undefined : true };
    return updateSideConditions(battle, side, next);
  }, [updateSideConditions]);

  const setStackableHazard = useCallback(async (
    battle: Battle,
    side: BattleSide,
    key: StackableHazard,
    layers: number
  ): Promise<boolean> => {
    const conditions = sideConditionsFor(battle, side);
    const next: SideConditions = { ...conditions, [key]: layers > 0 ? layers : undefined };
    return updateSideConditions(battle, side, next);
  }, [updateSideConditions]);

  return {
    startBattle,
    toggleBrought,
    addOpponentPokemon,
    updateOpponentMoveTags,
    addOpponentMove,
    removeOpponentMove,
    switchActive,
    setMegaEvolved,
    setFainted,
    logAction,
    setActionFailed,
    advanceTurn,
    undoLastAction,
    setResult,
    setNotes,
    setWeather,
    setTerrain,
    toggleTurnCondition,
    toggleBooleanHazard,
    setStackableHazard,
  };
}
