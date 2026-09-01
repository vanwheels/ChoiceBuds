/**
 * battleCalcReview.ts - Reconstruct Historical State for a Logged Turn
 * Powers TurnLog.tsx's "Show Calc" button: given a saved Battle and a
 * specific damaging action, rebuilds the attacker/defender/field state as
 * it was at that turn (not the battle's current end-state) into a Calc-page
 * payload. HP is never tracked anywhere in the Battle Logger, so every
 * result is inherently "X-Y% of max HP", never "would this have KO'd them"
 * - a hard ceiling, not a bug.
 *
 * Stat stages/status have no per-turn snapshot in Battle - only a "current
 * value" overwritten on every change. Reconstructing them here relies on
 * every mutator (useBattleLogActions.ts's adjustStatStage/applyAbilityEffect/
 * applyReactiveLowerEffect/applyHitReactiveEffect/logAction's auto stat-
 * effects, and setStatusCondition) appending a discrete, consistently-
 * formatted note action to the turn log at the same time it changes state -
 * this replays those notes rather than guessing. If a note's format ever
 * changes at any of those call sites, the parsing below must be updated to
 * match, or historical reconstruction will silently go blank for that action
 * (parseStatNote/status matching just won't match and produce no stage).
 *
 * Field conditions (weather/terrain/screens) are reconstructed against
 * whatever the CURRENT (end-of-battle) value is, checked against its own
 * duration/expiry so a review of an early turn correctly shows "not set
 * yet" - but if the same condition was set, cleared, and set AGAIN
 * differently later in the same battle, only the current (final) value's
 * timing is considered, not full history. Real VGC battles rarely change
 * the same weather/screen more than once, so this is an accepted narrow gap
 * rather than a full replay engine for field state too. Hazards with no
 * duration concept at all (Stealth Rock, Spikes/Toxic Spikes layers) have no
 * per-turn history whatsoever - the current end-of-battle value is used
 * unconditionally regardless of which turn is being reviewed.
 */

import type {
  Battle, BattleAction, BattleSide, StatKey, StatusCondition,
} from '../types/pokemon';
import type { StatsTable, StatusName, Weather, Terrain } from '@smogon/calc/dist/data/interface';
import type { CalcPokemonState, CalcFieldState, CalcSideConditions, CalcMoveSlot } from '../hooks/useDamageCalc';
import { STAT_LABELS } from '../config/statStages';
import { STATUS_LABELS } from '../config/statusConditions';
import { SIDE_CONDITION_DURATIONS, SIDE_CONDITION_EXTENDED_DURATIONS, SIDE_CONDITION_EXTENDED_FIELD, getRemainingTurns } from '../config/fieldConditions';
import { findBattlePokemon } from './battleLookup';

// A plain data literal, deliberately NOT imported from useDamageCalc.ts (its
// own defaultSideConditions()) - that module's top-level @smogon/calc import
// is the heaviest dependency in the app, kept behind CalcPage.tsx's own
// React.lazy() boundary specifically so a Battle-Log-only session never
// loads it. Importing a real (non-type) binding from useDamageCalc.ts here
// would drag that whole chunk into TurnLog.tsx's bundle too - confirmed via
// a build size check (useDamageCalc split into its own 486kB chunk shared
// with BattleLogPage) before this was caught and reverted to this literal.
const DEFAULT_SIDE_CONDITIONS: CalcSideConditions = {
  spikes: 0,
  isReflect: false,
  isLightScreen: false,
  isAuroraVeil: false,
  isFriendGuard: false,
  isHelpingHand: false,
  isSR: false,
  isTailwind: false,
  isProtected: false,
  isSeeded: false,
  isSaltCured: false,
  isFlowerGift: false,
  isBattery: false,
  isPowerSpot: false,
  isSteelySpirit: false,
};

const ZERO_STATS: StatsTable = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const MOVE_SLOT_COUNT = 4;

// Mirrors FieldWeatherBar.tsx's own local constants - weather/terrain have no
// held-item-extension confirmation flag beyond "was it Mega-triggered"
// (guaranteed fixed duration) vs. not (ambiguous 5-8 turn range, same
// uncertainty the live UI already shows as "5-8?"). Reconstruction here uses
// the permissive upper bound when unconfirmed, since that's the more useful
// default for "was this still up" than assuming the shortest possible life.
const WEATHER_TERRAIN_FIXED_DURATION = 5;
const WEATHER_TERRAIN_EXTENDED_DURATION = 8;

export interface CalcReviewPayload {
  pokemon1: Partial<CalcPokemonState>;
  pokemon2: Partial<CalcPokemonState>;
  field: Partial<CalcFieldState>;
}

// --- Stat stage / status note parsing ---

const STAT_LABEL_TO_KEY = Object.fromEntries(
  (Object.entries(STAT_LABELS) as [StatKey, string][]).map(([key, label]) => [label, key])
) as Record<string, StatKey>;
const STAT_NOTE_RE = new RegExp(`^(${Object.values(STAT_LABELS).join('|')}) ([+-]\\d+)`);
const STATUS_LABEL_TO_KEY = Object.fromEntries(
  (Object.entries(STATUS_LABELS) as [StatusCondition, string][]).map(([key, label]) => [label, key])
) as Record<string, StatusCondition>;

function parseStatNote(note: string): { stat: StatKey; delta: number } | null {
  const match = STAT_NOTE_RE.exec(note);
  if (!match) return null;
  return { stat: STAT_LABEL_TO_KEY[match[1]], delta: parseInt(match[2], 10) };
}

/** Synthetic stat/status notes only ever carry side+pokemonId+note - a real move-log action always has `move`/`phase`/`target` too, so this can't collide with "Sent in"/"Flinched"/etc. */
function isNoteOnlyAction(action: BattleAction): boolean {
  return !!action.note && !action.move && !action.phase && (!action.target || action.target.length === 0);
}

function clampStage(n: number): number {
  return Math.max(-6, Math.min(6, n));
}

/**
 * Stages reset to 0 whenever a Pokemon leaves the field - every field-entry
 * (initial send-in or a later switch-in) is uniformly logged as a
 * phase:'sendIn'|'switch' action for that exact id, so that's the replay
 * window's start rather than turn 1.
 */
function reconstructStageAtTurn(battle: Battle, pokemonId: string, turnN: number): Partial<Record<StatKey, number>> {
  let windowStart = 1;
  for (const turn of battle.turns) {
    if (turn.number > turnN) break;
    for (const action of turn.actions) {
      if (action.pokemonId === pokemonId && (action.phase === 'sendIn' || action.phase === 'switch')) {
        windowStart = turn.number;
      }
    }
  }

  const stages: Partial<Record<StatKey, number>> = {};
  for (const turn of battle.turns) {
    if (turn.number < windowStart || turn.number > turnN) continue;
    for (const action of turn.actions) {
      if (action.pokemonId !== pokemonId || !isNoteOnlyAction(action)) continue;
      const parsed = parseStatNote(action.note!);
      if (!parsed) continue;
      stages[parsed.stat] = clampStage((stages[parsed.stat] ?? 0) + parsed.delta);
    }
  }
  return stages;
}

/** Status persists through switches/faints (real game rule, matches statusConditions' own doc comment) - no reset window, just the most recent matching note up to turnN. */
function reconstructStatusAtTurn(battle: Battle, pokemonId: string, turnN: number): StatusCondition | null {
  let status: StatusCondition | null = null;
  for (const turn of battle.turns) {
    if (turn.number > turnN) break;
    for (const action of turn.actions) {
      if (action.pokemonId !== pokemonId || !isNoteOnlyAction(action)) continue;
      const note = action.note!;
      if (note.startsWith('Cured of ')) { status = null; continue; }
      if (STATUS_LABEL_TO_KEY[note]) status = STATUS_LABEL_TO_KEY[note];
    }
  }
  return status;
}

// --- Vocabulary mapping (Battle's lowercase enums -> @smogon/calc's Showdown-style names) ---

const WEATHER_MAP: Record<string, Weather> = { rain: 'Rain', sun: 'Sun', sand: 'Sand', snow: 'Snow' };
const TERRAIN_MAP: Record<string, Terrain> = { electric: 'Electric', grassy: 'Grassy', misty: 'Misty', psychic: 'Psychic' };
const STATUS_MAP: Record<StatusCondition, StatusName> = {
  burn: 'brn', freeze: 'frz', paralysis: 'par', poison: 'psn', 'badly-poisoned': 'tox', sleep: 'slp',
};

function statsFromStages(stages: Partial<Record<StatKey, number>>): StatsTable {
  return {
    hp: 0, // HP has no stage in this game - never boostable/lowerable
    atk: stages.atk ?? 0, def: stages.def ?? 0, spa: stages.spa ?? 0, spd: stages.spd ?? 0, spe: stages.spe ?? 0,
  };
}

function weatherAtTurn(battle: Battle, turnN: number): Weather | '' {
  const w = battle.fieldState.weather;
  if (!w || w.setOnTurn > turnN) return '';
  const duration = w.wasMegaEvolved ? WEATHER_TERRAIN_FIXED_DURATION : WEATHER_TERRAIN_EXTENDED_DURATION;
  return getRemainingTurns(w.setOnTurn, duration, turnN) > 0 ? WEATHER_MAP[w.type] : '';
}

function terrainAtTurn(battle: Battle, turnN: number): Terrain | '' {
  const t = battle.fieldState.terrain;
  if (!t || t.setOnTurn > turnN) return '';
  const duration = t.wasMegaEvolved ? WEATHER_TERRAIN_FIXED_DURATION : WEATHER_TERRAIN_EXTENDED_DURATION;
  return getRemainingTurns(t.setOnTurn, duration, turnN) > 0 ? TERRAIN_MAP[t.type] : '';
}

/**
 * Only the fields both models track map: spikes, reflect/lightScreen/
 * auroraVeil/tailwind, stealthRock. Everything else Calc tracks (Helping
 * Hand, Protect, Leech Seed, Salt Cure, aura abilities) and everything else
 * Battle tracks but Calc doesn't (Safeguard, Mist, Sticky Web, Toxic
 * Spikes) has no counterpart and is left at its default.
 */
function sideConditionsAtTurn(side: Battle['fieldState']['playerSide'], turnN: number): CalcSideConditions {
  const isSet = (turnTracked: number | undefined, key: 'reflect' | 'lightScreen' | 'auroraVeil' | 'tailwind'): boolean => {
    if (turnTracked === undefined || turnTracked > turnN) return false;
    const extendedField = SIDE_CONDITION_EXTENDED_FIELD[key];
    const duration = extendedField && side[extendedField] ? SIDE_CONDITION_EXTENDED_DURATIONS[key]! : SIDE_CONDITION_DURATIONS[key];
    return getRemainingTurns(turnTracked, duration, turnN) > 0;
  };

  return {
    ...DEFAULT_SIDE_CONDITIONS,
    spikes: side.spikes ?? 0, // no per-turn timestamp at all - current end-of-battle count used regardless of turnN
    isReflect: isSet(side.reflect, 'reflect'),
    isLightScreen: isSet(side.lightScreen, 'lightScreen'),
    isAuroraVeil: isSet(side.auroraVeil, 'auroraVeil'),
    isTailwind: isSet(side.tailwind, 'tailwind'),
    isSR: !!side.stealthRock, // no per-turn timestamp at all - current end-of-battle value used regardless of turnN
  };
}

// --- Pokemon state reconstruction ---

function movesAtTurn(loggedMove: string | undefined, knownMoves: string[]): CalcMoveSlot[] {
  const ordered = [loggedMove, ...knownMoves.filter(m => m !== loggedMove)].filter((m): m is string => !!m);
  return Array.from({ length: MOVE_SLOT_COUNT }, (_, i) => ({ name: ordered[i] || '', isCrit: false }));
}

function pokemonStateAtTurn(
  battle: Battle, side: BattleSide, pokemonId: string, turnN: number, loggedMove: string | undefined
): Partial<CalcPokemonState> {
  const mon = findBattlePokemon(battle, side, pokemonId);
  if (!mon) return {};

  let ability: string | undefined;
  let item: string | undefined;
  let level: number | undefined;
  let nature: string | undefined;
  let gender: 'M' | 'F' | 'N' | '' = '';
  let sps: StatsTable = { ...ZERO_STATS };

  // `nickname` is optional on BroughtPokemonSnapshot, so its absence doesn't
  // prove `mon` isn't one - `fainted` is the sound discriminant here (always
  // required on OpponentPokemonEntry, never present at all on
  // BroughtPokemonSnapshot).
  if ('fainted' in mon) {
    // Opponent - ability/item only count as known if revealed at or before
    // turnN, otherwise this review must show blank, same as the live battle
    // would have at that point, rather than leaking a later reveal backwards.
    // Gender/nature/EVs/level are never tracked for an opponent at all.
    ability = mon.abilityRevealedOnTurn !== undefined && mon.abilityRevealedOnTurn <= turnN ? mon.ability : undefined;
    item = mon.itemRevealedOnTurn !== undefined && mon.itemRevealedOnTurn <= turnN ? mon.item : undefined;
  } else {
    // Player's own Pokemon - fully known from turn 1, no reveal-timing concern.
    ability = mon.ability;
    item = mon.item;
    level = mon.level;
    nature = mon.nature;
    gender = mon.gender === 'M' || mon.gender === 'F' || mon.gender === 'N' ? mon.gender : '';
    if (mon.evs) {
      sps = { hp: mon.evs.hp, atk: mon.evs.attack, def: mon.evs.defense, spa: mon.evs.specialAttack, spd: mon.evs.specialDefense, spe: mon.evs.speed };
    }
  }

  const status = reconstructStatusAtTurn(battle, pokemonId, turnN);
  const stages = reconstructStageAtTurn(battle, pokemonId, turnN);

  return {
    species: mon.species,
    gender,
    level: level || 50, // opponent level is never tracked - VGC's own level-50 convention
    item: item || '',
    ability: ability || '',
    nature: (nature || 'Hardy') as CalcPokemonState['nature'],
    status: status ? STATUS_MAP[status] : '',
    sps,
    boosts: statsFromStages(stages),
    moves: movesAtTurn(loggedMove, mon.moves),
  };
}

/**
 * Builds a Calc-page payload for one logged damaging action, as of the turn
 * it happened - attacker becomes pokemon1, the chosen defender becomes
 * pokemon2. For a spread move with multiple targets, the caller picks which
 * target to build against (defaulting to the first is a reasonable choice -
 * the user lands in a fully editable Calc page afterward and can swap
 * panel 2's species by hand for the other target if they want it instead).
 */
export function buildCalcReviewPayload(battle: Battle, turnNumber: number, action: BattleAction, defenderPokemonId: string): CalcReviewPayload {
  const defenderSide: BattleSide = action.target?.find(t => t.pokemonId === defenderPokemonId)?.side
    ?? (action.side === 'player' ? 'opponent' : 'player');

  const pokemon1 = pokemonStateAtTurn(battle, action.side, action.pokemonId, turnNumber, action.move);
  const pokemon2 = pokemonStateAtTurn(battle, defenderSide, defenderPokemonId, turnNumber, undefined);

  const attackerSideConditions = sideConditionsAtTurn(action.side === 'player' ? battle.fieldState.playerSide : battle.fieldState.opponentSide, turnNumber);
  const defenderSideConditions = sideConditionsAtTurn(defenderSide === 'player' ? battle.fieldState.playerSide : battle.fieldState.opponentSide, turnNumber);

  const field: Partial<CalcFieldState> = {
    gameType: 'Doubles', // Battle Logger models VGC doubles only
    weather: weatherAtTurn(battle, turnNumber),
    terrain: terrainAtTurn(battle, turnNumber),
    pokemon1Side: attackerSideConditions,
    pokemon2Side: defenderSideConditions,
  };

  return { pokemon1, pokemon2, field };
}
