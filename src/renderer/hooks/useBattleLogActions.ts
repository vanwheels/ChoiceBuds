/**
 * useBattleLogActions Hook - Battle Log In-Progress Mutations
 * Same relationship to useBattles as useRosterActions has to useTeams:
 * composes over the already-lifted useBattles state (updateBattle/addBattle
 * passed in, never re-instantiated here), exposing higher-level methods that
 * compute a new Battle and write through the same single source of truth.
 */

import { useCallback } from 'react';
import type {
  Battle, BattleAction, BattleSide, FieldState, Team, SpeciesRosterEntry,
  WeatherType, TerrainType, SideConditions, StatKey, StatStages,
} from '../types/pokemon';
import type { TurnTrackedCondition, BooleanHazard, StackableHazard } from '../config/fieldConditions';
import { findBattlePokemon, canActThisTurn, canSwitchOutThisTurn, requiredActiveCount, compactActiveIds } from '../utils/battleLookup';
import { getSwitchInEffect } from '../config/onSwitchInAbilities';
import { getReactiveLowerEffect } from '../config/reactiveAbilities';
import { getMoveFieldEffect, type MoveFieldEffect } from '../config/moveFieldEffects';
import { getMoveStatEffect } from '../config/moveStatEffects';
import { getMegaApiSlug } from '../config/megaEvolution';
import { getMegaAbility } from '../config/megaAbilities';
import { fetchPokemonData } from '../services/pokeapi';
import { STAT_LABELS } from '../config/statStages';
import {
  WEATHER_LABELS, TERRAIN_LABELS, STACKABLE_HAZARD_MAX,
  SIDE_CONDITION_EXTENDED_FIELD,
} from '../config/fieldConditions';

export const MAX_OPPONENT_ROSTER_SIZE = 6;
export const MAX_BROUGHT = 4;

const clampStage = (n: number): number => Math.max(-6, Math.min(6, n));

/** Pure append - shared by logAction and any mutation that needs to bundle a log entry into its own single updateBattle call (avoids racing two sequential updateBattle calls off the same stale closure). */
function appendAction(turns: Battle['turns'], action: Omit<BattleAction, 'id'>): Battle['turns'] {
  const next = [...turns];
  const lastTurn = next[next.length - 1];
  next[next.length - 1] = { ...lastTurn, actions: [...lastTurn.actions, { ...action, id: crypto.randomUUID() }] };
  return next;
}

/** Which roster a pokemonId belongs to - used wherever an action needs `side` but the caller only has an id. */
function sideOf(battle: Battle, pokemonId: string): BattleSide {
  return battle.playerRoster.some(p => p.id === pokemonId) ? 'player' : 'opponent';
}

/** Removes a pokemonId's entry entirely - stat stages always reset to 0 when a Pokemon leaves the field. */
function clearStatStages(battle: Battle, pokemonId: string): Record<string, StatStages> {
  if (!(pokemonId in battle.statStages)) return battle.statStages;
  return Object.fromEntries(Object.entries(battle.statStages).filter(([id]) => id !== pokemonId));
}

/**
 * Pure application of a move's field effect (see config/moveFieldEffects.ts)
 * onto fieldState - used by logAction so a field-setting move updates the
 * tracker in the same updateBattle call it's logged in. Hazards always
 * land on the opposing side; everything else lands on the mover's own
 * side. Trick Room used while already active cancels it early (real game
 * behavior) rather than refreshing the duration.
 */
function applyMoveFieldEffect(
  fieldState: FieldState,
  side: BattleSide,
  effect: MoveFieldEffect | null,
  currentTurn: number
): FieldState {
  if (!effect) return fieldState;
  if (effect.kind === 'weather') return { ...fieldState, weather: { type: effect.weather, setOnTurn: currentTurn } };
  if (effect.kind === 'terrain') return { ...fieldState, terrain: { type: effect.terrain, setOnTurn: currentTurn } };
  if (effect.kind === 'trickRoom') {
    return { ...fieldState, trickRoom: fieldState.trickRoom ? undefined : { setOnTurn: currentTurn } };
  }

  const targetSide: BattleSide = effect.kind === 'sideCondition' ? side : (side === 'player' ? 'opponent' : 'player');
  const key = targetSide === 'player' ? 'playerSide' : 'opponentSide';
  const conditions = fieldState[key];

  if (effect.kind === 'sideCondition') {
    return { ...fieldState, [key]: { ...conditions, [effect.key]: currentTurn } };
  }
  if (effect.kind === 'booleanHazard') {
    return { ...fieldState, [key]: { ...conditions, [effect.key]: true } };
  }
  const currentLayers = conditions[effect.key] ?? 0;
  return { ...fieldState, [key]: { ...conditions, [effect.key]: Math.min(STACKABLE_HAZARD_MAX[effect.key], currentLayers + 1) } };
}

export interface UseBattleLogActionsReturn {
  startBattle: (team: Team) => Promise<string | null>;
  toggleBrought: (battle: Battle, pokemonId: string) => Promise<boolean>;
  addOpponentPokemon: (battle: Battle, species: SpeciesRosterEntry) => Promise<boolean>;
  updateOpponentMoveTags: (battle: Battle, opponentId: string, ability?: string, item?: string) => Promise<boolean>;
  setItemConsumed: (battle: Battle, opponentId: string, consumed: boolean) => Promise<boolean>;
  addOpponentMove: (battle: Battle, opponentId: string, move: string) => Promise<boolean>;
  removeOpponentMove: (battle: Battle, opponentId: string, move: string) => Promise<boolean>;
  switchIn: (battle: Battle, side: BattleSide, pokemonId: string, slotIndex?: number) => Promise<boolean>;
  switchOut: (battle: Battle, side: BattleSide, pokemonId: string) => Promise<boolean>;
  swapActive: (battle: Battle, side: BattleSide, outgoingId: string, incomingId: string) => Promise<boolean>;
  setMegaEvolved: (battle: Battle, pokemonId: string, revealedItem?: string) => Promise<boolean>;
  adjustStatStage: (battle: Battle, pokemonId: string, stat: StatKey, delta: number) => Promise<boolean>;
  applyAbilityEffect: (battle: Battle, side: BattleSide, pokemonId: string, ability: string) => Promise<boolean>;
  applyReactiveLowerEffect: (battle: Battle, pokemonId: string, ability: string) => Promise<boolean>;
  setFainted: (battle: Battle, side: BattleSide, pokemonId: string, fainted: boolean) => Promise<boolean>;
  logAction: (battle: Battle, action: Omit<BattleAction, 'id'>) => Promise<boolean>;
  setActionFailed: (battle: Battle, turnNumber: number, actionId: string, failed: boolean) => Promise<boolean>;
  advanceTurn: (battle: Battle) => Promise<boolean>;
  undoLastAction: (battle: Battle) => Promise<boolean>;
  setResult: (battle: Battle, result: Battle['result']) => Promise<boolean>;
  setNotes: (battle: Battle, notes: string) => Promise<boolean>;
  setWeather: (battle: Battle, type: WeatherType | null, wasMegaEvolved?: boolean) => Promise<boolean>;
  setTerrain: (battle: Battle, type: TerrainType | null, wasMegaEvolved?: boolean) => Promise<boolean>;
  setTrickRoom: (battle: Battle, active: boolean) => Promise<boolean>;
  toggleTurnCondition: (battle: Battle, side: BattleSide, key: TurnTrackedCondition) => Promise<boolean>;
  toggleScreenExtended: (battle: Battle, side: BattleSide, key: TurnTrackedCondition) => Promise<boolean>;
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
      playerActiveIds: [null, null],
      playerFaintedIds: [],
      opponentRoster: [],
      opponentActiveIds: [null, null],
      megaEvolvedIds: [],
      statStages: {},
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
    // .map, not .filter - the tuple's slot positions must never shift.
    const playerActiveIds = isBrought ? battle.playerActiveIds.map(id => id === pokemonId ? null : id) : battle.playerActiveIds;
    const playerFaintedIds = isBrought ? battle.playerFaintedIds.filter(id => id !== pokemonId) : battle.playerFaintedIds;
    return updateBattle(battle.id, { broughtIds, playerActiveIds, playerFaintedIds });
  }, [updateBattle]);

  /**
   * The species roster picker (SpeciesRosterEntry) is a bulk name/id/sprite
   * list only - no type data (fetching that for all ~1300 entries up front
   * would be far too heavy). Types are fetched live here instead, a single
   * per-species cost paid once per opponent reveal, so type-effectiveness
   * tags (see config/typeEffectiveness.ts) work for opponent targets too. A
   * fetch failure (offline, unrecognized name) still adds the Pokemon, just
   * without effectiveness tags for it until corrected.
   */
  const addOpponentPokemon = useCallback(async (battle: Battle, species: SpeciesRosterEntry): Promise<boolean> => {
    if (battle.opponentRoster.length >= MAX_OPPONENT_ROSTER_SIZE) return false;
    const types = await fetchPokemonData(species.name).then(d => d.types).catch(() => []);
    const entry = {
      id: crypto.randomUUID(),
      species: species.name,
      pokedexNumber: species.id,
      spriteUrl: species.spriteUrl,
      types,
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

  const setItemConsumed = useCallback(async (battle: Battle, opponentId: string, consumed: boolean): Promise<boolean> => {
    const opponentRoster = battle.opponentRoster.map(o => o.id === opponentId ? { ...o, itemConsumed: consumed } : o);
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

  /**
   * Marked directly from the Battlefield (a Pokemon can only faint while
   * active - it can't take damage off-field). Also clears the mon's active
   * slot to null (same as switchOut), so the now-empty slot is immediately
   * ready for a replacement via the usual picker/drag flow - single
   * updateBattle call. Un-fainting (correcting a misclick) does not
   * restore active state or turn log, just the flag - only the fainted=true
   * direction logs a "Fainted" note (matches match-flow readability, not a
   * misclick correction).
   */
  const setFainted = useCallback(async (
    battle: Battle,
    side: BattleSide,
    pokemonId: string,
    fainted: boolean
  ): Promise<boolean> => {
    // Fainting always leaves the field - stat stages reset, same as any other switch-out.
    const statStages = fainted ? clearStatStages(battle, pokemonId) : battle.statStages;
    const activeIds = side === 'player' ? battle.playerActiveIds : battle.opponentActiveIds;
    const nextActiveIds = fainted && activeIds.includes(pokemonId)
      ? activeIds.map(id => id === pokemonId ? null : id)
      : activeIds;
    const turns = fainted && battle.turns.length > 0
      ? appendAction(battle.turns, { side, pokemonId, note: 'Fainted' })
      : battle.turns;

    if (side === 'player') {
      const playerFaintedIds = fainted
        ? [...new Set([...battle.playerFaintedIds, pokemonId])]
        : battle.playerFaintedIds.filter(id => id !== pokemonId);
      return updateBattle(battle.id, { playerFaintedIds, statStages, playerActiveIds: nextActiveIds, turns });
    }

    const opponentRoster = battle.opponentRoster.map(o => o.id === pokemonId ? { ...o, fainted } : o);
    return updateBattle(battle.id, { opponentRoster, statStages, opponentActiveIds: nextActiveIds, turns });
  }, [updateBattle]);

  /**
   * Appends to the last turn's action list, in the order logged. Logging an
   * opponent's move also reveals it (dedup, same rule as addOpponentMove)
   * in this same updateBattle call - the click-to-log flow never needs a
   * separate reveal step for a freshly-typed opponent move. Logging a move
   * that sets a field effect (weather/terrain/Trick Room/screens/hazards -
   * see config/moveFieldEffects.ts) also updates fieldState in this same
   * call, so the tracker display never needs a separate manual toggle.
   * Same for a move with a deterministic stat-stage side effect (Draco
   * Meteor's self SpA drop, Charm's target Atk drop - see
   * config/moveStatEffects.ts) - unlike a switch-in ability chip, these are
   * as certain as the move's own damage, so no manual confirm is needed.
   * Both are skipped when the action is marked failed.
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

    let turns = appendAction(battle.turns, action);
    let fieldState = battle.fieldState;
    let statStages = battle.statStages;

    if (!action.failed) {
      fieldState = applyMoveFieldEffect(battle.fieldState, action.side, getMoveFieldEffect(trimmedMove), battle.turns.length);

      const statEffect = getMoveStatEffect(trimmedMove);
      if (statEffect) {
        const targetIds = statEffect.appliesTo === 'self' ? [action.pokemonId] : (action.target ?? []).map(t => t.pokemonId);
        for (const id of targetIds) {
          for (const change of statEffect.changes) {
            const current = statStages[id]?.[change.stat] ?? 0;
            const next = clampStage(current + change.stages);
            statStages = { ...statStages, [id]: { ...statStages[id], [change.stat]: next } };
            const note = `${STAT_LABELS[change.stat]} ${next > current ? '+' : ''}${next - current} (${trimmedMove})`;
            turns = appendAction(turns, { side: sideOf(battle, id), pokemonId: id, note });
          }
        }
      }
    }

    return updateBattle(battle.id, { turns, opponentRoster, fieldState, statStages });
  }, [updateBattle]);

  /**
   * Brings a benched Pokemon into an EMPTY active slot - `slotIndex` if
   * given (a specific empty slot was clicked/dropped on), else the first
   * open slot. This is always a "sending in" (start of battle, or filling
   * a just-fainted slot), never a "switching in" - swapActive below is the
   * one that replaces an already-occupied slot. Logs a sendIn-phase
   * action, which is what drives the Battlefield's switched-in arrow but
   * never costs the slot's turn action (see canActThisTurn/
   * canSwitchOutThisTurn) - bundled into the same updateBattle call as the
   * slot assignment so they can't race.
   */
  const switchIn = useCallback(async (battle: Battle, side: BattleSide, pokemonId: string, slotIndex?: number): Promise<boolean> => {
    const activeIds = side === 'player' ? battle.playerActiveIds : battle.opponentActiveIds;
    if (activeIds.includes(pokemonId)) return false;
    if (side === 'player' && !battle.broughtIds.includes(pokemonId)) return false;
    const targetIndex = slotIndex ?? activeIds.indexOf(null);
    if (targetIndex === -1 || activeIds[targetIndex] != null) return false;

    const nextActiveIds = [...activeIds];
    nextActiveIds[targetIndex] = pokemonId;
    const turns = appendAction(battle.turns, { side, pokemonId, phase: 'sendIn', note: 'Sent in' });
    return updateBattle(battle.id, {
      ...(side === 'player' ? { playerActiveIds: nextActiveIds } : { opponentActiveIds: nextActiveIds }),
      turns,
    });
  }, [updateBattle]);

  /**
   * Pure switch-out to an empty slot (no replacement) - only valid when
   * this wouldn't drop the side below its required active count (see
   * requiredActiveCount); otherwise a replacement must come in at the
   * same time via swapActive. Also gated by canSwitchOutThisTurn - can't
   * switch out a Pokemon that already switched in/Mega'd/used a non-
   * switch-out move this turn.
   */
  const switchOut = useCallback(async (battle: Battle, side: BattleSide, pokemonId: string): Promise<boolean> => {
    if (!canSwitchOutThisTurn(battle, pokemonId)) return false;
    const activeIds = side === 'player' ? battle.playerActiveIds : battle.opponentActiveIds;
    const idx = activeIds.indexOf(pokemonId);
    if (idx === -1) return false;

    const nextActiveIds = activeIds.map((id, i) => i === idx ? null : id);
    if (nextActiveIds.filter(Boolean).length < requiredActiveCount(battle, side)) return false;

    const statStages = clearStatStages(battle, pokemonId);
    return updateBattle(battle.id, {
      ...(side === 'player' ? { playerActiveIds: nextActiveIds } : { opponentActiveIds: nextActiveIds }),
      statStages,
    });
  }, [updateBattle]);

  /**
   * Replaces one active (already-occupied) Pokemon with a benched one in
   * the SAME slot index - the real "switching in" (manual Switch button,
   * or the follow-up to a switch-out move like U-turn/Parting Shot),
   * unlike switchIn above which only ever fills an empty slot. Also what
   * keeps left/right field position stable through a switch (see
   * types/pokemon.ts's playerActiveIds/opponentActiveIds doc). Single
   * updateBattle call: slot reassignment, the incoming switch-phase log
   * entry, and clearing the outgoing Pokemon's stat stages.
   */
  const swapActive = useCallback(async (battle: Battle, side: BattleSide, outgoingId: string, incomingId: string): Promise<boolean> => {
    if (!canSwitchOutThisTurn(battle, outgoingId)) return false;
    const activeIds = side === 'player' ? battle.playerActiveIds : battle.opponentActiveIds;
    const idx = activeIds.indexOf(outgoingId);
    if (idx === -1 || activeIds.includes(incomingId)) return false;
    if (side === 'player' && !battle.broughtIds.includes(incomingId)) return false;

    const nextActiveIds = activeIds.map((id, i) => i === idx ? incomingId : id);
    const statStages = clearStatStages(battle, outgoingId);
    const turns = appendAction(battle.turns, { side, pokemonId: incomingId, phase: 'switch', note: 'Switched in' });
    return updateBattle(battle.id, {
      ...(side === 'player' ? { playerActiveIds: nextActiveIds } : { opponentActiveIds: nextActiveIds }),
      turns,
      statStages,
    });
  }, [updateBattle]);

  /**
   * Marks a Pokemon as having Mega Evolved this battle and logs a
   * mega-phase action. Only one Mega per side per battle (real game rule -
   * checked side-wide, not just against this specific pokemonId, so a
   * second mega-capable Pokemon on the same side can't also Mega after the
   * first). Also requires the mon hasn't already acted this turn (a move
   * or switch already used up the slot's action - Mega must precede the
   * move it accompanies). `revealedItem` (opponent side only) sets their
   * held-item field to the resolved Mega Stone in the same call -
   * declaring Mega IS revealing that item, and bundling it here avoids
   * the two-sequential-updateBattle race the app already hit once before
   * (see switchIn/logAction) - calling setMegaEvolved then a separate
   * updateOpponentMoveTags off the same stale `battle` reference silently
   * lost whichever field wasn't in the second call's update, depending on
   * IPC round-trip timing.
   *
   * Also updates the mon's known ability to its guaranteed Mega ability
   * (see config/megaAbilities.ts - only covers real mainline Megas, a
   * no-op for Champions-invented ones) and, if that ability sets weather/
   * terrain (Drought, Drizzle, etc. - reuses config/onSwitchInAbilities.ts),
   * auto-applies it to fieldState right here too - no separate confirm
   * chip needed since a Mega's ability is deterministic the instant it's
   * declared, unlike an observed switch-in trigger.
   */
  const setMegaEvolved = useCallback(async (battle: Battle, pokemonId: string, revealedItem?: string): Promise<boolean> => {
    if (battle.megaEvolvedIds.includes(pokemonId)) return false;
    const side: BattleSide = battle.playerRoster.some(p => p.id === pokemonId) ? 'player' : 'opponent';
    const mon = findBattlePokemon(battle, side, pokemonId);
    if (!mon) return false;
    if (!canActThisTurn(battle, pokemonId)) return false;

    const sideRosterIds = new Set((side === 'player' ? battle.playerRoster : battle.opponentRoster).map(p => p.id));
    if (battle.megaEvolvedIds.some(id => sideRosterIds.has(id))) return false;

    const effectiveItem = revealedItem ?? mon.item;
    const megaSlug = getMegaApiSlug(effectiveItem, mon.species);
    const megaAbility = getMegaAbility(megaSlug);

    const playerRoster = side === 'player' && megaAbility
      ? battle.playerRoster.map(p => p.id === pokemonId ? { ...p, ability: megaAbility } : p)
      : battle.playerRoster;
    const opponentRoster = side === 'opponent'
      ? battle.opponentRoster.map(o => o.id === pokemonId
          ? { ...o, ...(revealedItem ? { item: revealedItem } : {}), ...(megaAbility ? { ability: megaAbility } : {}) }
          : o)
      : battle.opponentRoster;

    const currentTurn = battle.turns.length;
    const megaEffect = getSwitchInEffect(megaAbility);
    const fieldState = megaEffect?.kind === 'weather'
      ? { ...battle.fieldState, weather: { type: megaEffect.weather, setOnTurn: currentTurn, wasMegaEvolved: true } }
      : megaEffect?.kind === 'terrain'
        ? { ...battle.fieldState, terrain: { type: megaEffect.terrain, setOnTurn: currentTurn, wasMegaEvolved: true } }
        : battle.fieldState;

    // Mentioning the ability in the note (when its effect was auto-applied
    // above) matters, not just flavor - hasAppliedAbilityEffectSinceSwitchIn
    // scans notes for the ability's name, and without it here the Battlefield/
    // OpponentExtras switch-in chip would think the effect still needs a
    // manual confirm and show a redundant "Drought!"-style chip for an
    // effect that's already been applied.
    const note = megaEffect ? `Mega Evolved (${megaAbility})` : 'Mega Evolved';

    return updateBattle(battle.id, {
      megaEvolvedIds: [...battle.megaEvolvedIds, pokemonId],
      playerRoster,
      opponentRoster,
      fieldState,
      turns: appendAction(battle.turns, { side, pokemonId, phase: 'mega', note }),
    });
  }, [updateBattle]);

  /** One +/-1 (or any delta) tap from the Stats popover - clamps to -6..6 and logs a note, e.g. "Atk -1". */
  const adjustStatStage = useCallback(async (
    battle: Battle,
    pokemonId: string,
    stat: StatKey,
    delta: number
  ): Promise<boolean> => {
    const side = sideOf(battle, pokemonId);
    const current = battle.statStages[pokemonId]?.[stat] ?? 0;
    const next = clampStage(current + delta);
    if (next === current) return false;

    const statStages = { ...battle.statStages, [pokemonId]: { ...battle.statStages[pokemonId], [stat]: next } };
    const note = `${STAT_LABELS[stat]} ${next > current ? '+' : ''}${next - current}`;
    return updateBattle(battle.id, { statStages, turns: appendAction(battle.turns, { side, pokemonId, note }) });
  }, [updateBattle]);

  /**
   * One-tap "apply" for a curated list of switch-in abilities (see
   * config/onSwitchInAbilities.ts) - stat, weather, or terrain effects -
   * never automatic, the user confirms it actually happened. No-ops
   * (false) if the ability isn't in the table.
   */
  const applyAbilityEffect = useCallback(async (
    battle: Battle,
    side: BattleSide,
    pokemonId: string,
    ability: string
  ): Promise<boolean> => {
    const effect = getSwitchInEffect(ability);
    if (!effect) return false;
    const currentTurn = battle.turns.length;

    if (effect.kind === 'weather' || effect.kind === 'terrain') {
      // A weather/terrain ability's duration confidence depends on whether
      // its holder is currently Mega Evolved (fixed 5 turns, no held rock
      // possible) - see FieldWeatherBar.tsx.
      const wasMegaEvolved = battle.megaEvolvedIds.includes(pokemonId);
      const label = effect.kind === 'weather' ? WEATHER_LABELS[effect.weather] : TERRAIN_LABELS[effect.terrain];
      const fieldState = effect.kind === 'weather'
        ? { ...battle.fieldState, weather: { type: effect.weather, setOnTurn: currentTurn, wasMegaEvolved } }
        : { ...battle.fieldState, terrain: { type: effect.terrain, setOnTurn: currentTurn, wasMegaEvolved } };
      const turns = appendAction(battle.turns, { side, pokemonId, note: `${label} set (${ability})` });
      return updateBattle(battle.id, { fieldState, turns });
    }

    const targetIds = effect.target === 'self'
      ? [pokemonId]
      : compactActiveIds(side === 'player' ? battle.opponentActiveIds : battle.playerActiveIds);
    if (targetIds.length === 0) return false;
    const targetSide: BattleSide = effect.target === 'self' ? side : (side === 'player' ? 'opponent' : 'player');

    let statStages = battle.statStages;
    let turns = battle.turns;
    for (const id of targetIds) {
      const current = statStages[id]?.[effect.stat] ?? 0;
      const next = clampStage(current + effect.stages);
      statStages = { ...statStages, [id]: { ...statStages[id], [effect.stat]: next } };
      const note = `${STAT_LABELS[effect.stat]} ${next > current ? '+' : ''}${next - current} (${ability})`;
      turns = appendAction(turns, { side: targetSide, pokemonId: id, note });
    }
    // For an opposing-active effect the source isn't among the targets, so
    // it gets no note of its own above - add one so the Battlefield's
    // "already applied this switch-in" chip check has something to find
    // against the source's own pokemonId either way.
    if (effect.target !== 'self') {
      turns = appendAction(turns, { side, pokemonId, note: `${ability} triggered` });
    }
    return updateBattle(battle.id, { statStages, turns });
  }, [updateBattle]);

  /**
   * One-tap "apply" for a reactive stat-raise ability (Defiant/Competitive
   * - see config/reactiveAbilities.ts), always self-target. No-ops (false)
   * if the ability isn't in the table.
   */
  const applyReactiveLowerEffect = useCallback(async (
    battle: Battle,
    pokemonId: string,
    ability: string
  ): Promise<boolean> => {
    const effect = getReactiveLowerEffect(ability);
    if (!effect) return false;
    const side = sideOf(battle, pokemonId);

    const current = battle.statStages[pokemonId]?.[effect.stat] ?? 0;
    const next = clampStage(current + effect.stages);
    const statStages = { ...battle.statStages, [pokemonId]: { ...battle.statStages[pokemonId], [effect.stat]: next } };
    const note = `${STAT_LABELS[effect.stat]} ${next > current ? '+' : ''}${next - current} (${ability})`;
    return updateBattle(battle.id, { statStages, turns: appendAction(battle.turns, { side, pokemonId, note }) });
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

  /** Trick Room is always move-set (never ability-triggered) - fixed 5-turn duration, no mega confidence needed. */
  const setTrickRoom = useCallback(async (battle: Battle, active: boolean): Promise<boolean> => {
    const currentTurn = battle.turns.length;
    return updateBattle(battle.id, {
      fieldState: { ...battle.fieldState, trickRoom: active ? { setOnTurn: currentTurn } : undefined },
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

  /** Toggles whether an active Reflect/Light Screen/Aurora Veil was set by a Pokemon holding Light Clay (8-turn duration instead of 5) - see config/fieldConditions.ts. No-op for conditions with no extending item. */
  const toggleScreenExtended = useCallback(async (
    battle: Battle,
    side: BattleSide,
    key: TurnTrackedCondition
  ): Promise<boolean> => {
    const extendedField = SIDE_CONDITION_EXTENDED_FIELD[key];
    if (!extendedField) return false;
    const conditions = sideConditionsFor(battle, side);
    const next: SideConditions = { ...conditions, [extendedField]: !conditions[extendedField] };
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
    setItemConsumed,
    addOpponentMove,
    removeOpponentMove,
    switchIn,
    switchOut,
    swapActive,
    setMegaEvolved,
    adjustStatStage,
    applyAbilityEffect,
    applyReactiveLowerEffect,
    setFainted,
    logAction,
    setActionFailed,
    advanceTurn,
    undoLastAction,
    setResult,
    setNotes,
    setWeather,
    setTerrain,
    setTrickRoom,
    toggleTurnCondition,
    toggleScreenExtended,
    toggleBooleanHazard,
    setStackableHazard,
  };
}
