/**
 * Damage Calc Pure Engine - the Champions Damage Calculator's state
 * factories, boost/stat-multiplier math, and the actual @smogon/calc
 * invocation (buildPokemon/computeSideResults). Extracted out of
 * useDamageCalc.ts (same pure-logic-out-of-hooks pattern services/parser.ts
 * already established) so this half is independently unit-testable and
 * doesn't count against the hook file's line cap. No React here -
 * useDamageCalc.ts owns all state and re-exports the types/constants below
 * so existing consumer imports from the hook keep working unchanged; this
 * file only computes from state it's handed.
 *
 * Species/move/item/ability names are sourced from @smogon/calc's own
 * bundled Gen 9 data (not PokeAPI/useSpeciesRoster/useGameData) because
 * calculate() matches these strings against its own internal data layer -
 * see useDamageCalc.ts's header for the full rationale.
 */

import { calculate, Pokemon, Move, Field, toID } from '@smogon/calc';
import type {
  StatsTable,
  GameType,
  Weather,
  Terrain,
  NatureName,
  GenderName,
  StatusName,
  Generation,
  StatID,
} from '@smogon/calc/dist/data/interface';
import { getChampionsCalcMoveOverride } from '../config/championsMoveOverrides';
import { MAX_IVS, spsToEvs, resolveCalcSpecies } from './championsStats';

const MOVE_SLOT_COUNT = 4;

const ZERO_STATS: StatsTable = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

// 'Hail' omitted - Gen 9 replaced it game-wide with 'Snow' (Ice Body/Snow
// Warning etc. key off Snow, not Hail), so it's never a real Gen 9 state.
export const WEATHER_OPTIONS: Weather[] = ['Sun', 'Rain', 'Sand', 'Snow', 'Harsh Sunshine', 'Heavy Rain', 'Strong Winds'];
export const TERRAIN_OPTIONS: Terrain[] = ['Electric', 'Grassy', 'Psychic', 'Misty'];
export const STATUS_OPTIONS: StatusName[] = ['slp', 'psn', 'brn', 'frz', 'par', 'tox'];
export const GENDER_OPTIONS: GenderName[] = ['M', 'F', 'N'];

/** Comparable form for matching PokeAPI's lowercase-hyphenated move slugs
 * (e.g. "flare-blitz") against @smogon/calc's Title Case names ("Flare Blitz"). */
export function normalizeMoveSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Which stat a nature boosts/lowers (both undefined for a genuinely neutral
 * nature - Hardy/Docile/Serious/Bashful/Quirky). @smogon/calc's own Nature
 * data always sets both `plus`/`minus` to a StatID even for these, using the
 * SAME stat for both as its way of encoding "no effect" - a plus===minus
 * match is filtered out here rather than shown as simultaneously boosted
 * and lowered. Powers the nature color-coding on CalcStatRows.tsx.
 */
export interface NatureStatEffect {
  plus?: StatID;
  minus?: StatID;
}
export function getNatureStatEffect(gen: Generation, natureName: NatureName): NatureStatEffect {
  const nature = gen.natures.get(toID(natureName));
  if (!nature || nature.plus === nature.minus) return {};
  return { plus: nature.plus, minus: nature.minus };
}

export interface CalcMoveSlot {
  name: string;
  isCrit: boolean;
  /** Explicit hit count for multi-hit moves - undefined lets the engine use its own default (see getMultihitRange) */
  hits?: number;
}

function defaultMoves(): CalcMoveSlot[] {
  return Array.from({ length: MOVE_SLOT_COUNT }, () => ({ name: '', isCrit: false }));
}

export interface CalcPokemonState {
  species: string;
  gender: GenderName | '';
  level: number;
  item: string;
  ability: string;
  nature: NatureName;
  status: StatusName | '';
  sps: StatsTable;
  boosts: StatsTable;
  moves: CalcMoveSlot[];
}

export function defaultPokemonState(): CalcPokemonState {
  return {
    species: '',
    gender: '',
    level: 50,
    item: '',
    ability: '',
    nature: 'Hardy',
    status: '',
    sps: { ...ZERO_STATS },
    boosts: { ...ZERO_STATS },
    moves: defaultMoves(),
  };
}

export interface CalcSideConditions {
  spikes: number;
  isReflect: boolean;
  isLightScreen: boolean;
  isAuroraVeil: boolean;
  isFriendGuard: boolean;
  isHelpingHand: boolean;
  isSR: boolean;
  isTailwind: boolean;
  isProtected: boolean;
  isSeeded: boolean;
  isSaltCured: boolean;
  isFlowerGift: boolean;
  isBattery: boolean;
  isPowerSpot: boolean;
  isSteelySpirit: boolean;
}

function defaultSideConditions(): CalcSideConditions {
  return {
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
}

export interface CalcFieldState {
  gameType: GameType;
  weather: Weather | '';
  terrain: Terrain | '';
  pokemon1Side: CalcSideConditions;
  pokemon2Side: CalcSideConditions;
}

export function defaultFieldState(): CalcFieldState {
  return {
    gameType: 'Doubles',
    weather: '',
    terrain: '',
    pokemon1Side: defaultSideConditions(),
    pokemon2Side: defaultSideConditions(),
  };
}

export interface CalcMoveResultEntry {
  moveName: string;
  percent: string | null;
  desc: string | null;
  range: [number, number] | null;
  kochanceText: string | null;
  possibleDamages: number[];
  errorMessage: string | null;
  /** [min, max] selectable hit count if this move hits multiple times, else null */
  multihitRange: [number, number] | null;
  /** The hit count actually used for this result (engine default if the slot didn't set one) */
  effectiveHits: number | null;
}

function emptyEntry(moveName: string): CalcMoveResultEntry {
  return {
    moveName, percent: null, desc: null, range: null, kochanceText: null, possibleDamages: [],
    errorMessage: null, multihitRange: null, effectiveHits: null,
  };
}

function errorEntry(moveName: string, err: unknown): CalcMoveResultEntry {
  return {
    moveName, percent: null, desc: null, range: null, kochanceText: null, possibleDamages: [],
    errorMessage: err instanceof Error ? err.message : 'Unable to calculate damage for this matchup',
    multihitRange: null, effectiveHits: null,
  };
}

/**
 * `@smogon/calc`'s own `result.desc()`/`result.kochance()` throw
 * ("damage[damage.length - 1] === 0.") whenever a damage-category move's
 * range comes back fully [0, 0] - true for every ability-block case its
 * bundled Gen 9 mechanics already zero out (Levitate, Wonder Guard, Flash
 * Fire, etc. - see gen789.js) and also plain type immunity with no ability
 * involved. Status moves never hit this (desc.js short-circuits on
 * move.category === 'Status' before the throwing path), so this only needs
 * to guard damage-category moves. Building the message from `rawDesc`
 * (populated even when `desc()` itself would throw) avoids a second config
 * table - `defenderAbility` is only set when an ability caused the block, so
 * a plain type immunity falls back to a type-immunity phrasing instead.
 */
function isFullyBlocked(range: [number, number], category: string): boolean {
  return category !== 'Status' && range[0] === 0 && range[1] === 0;
}

function blockedEntry(
  moveName: string,
  range: [number, number],
  attackerName: string,
  defenderName: string,
  defenderAbility: string | undefined,
): CalcMoveResultEntry {
  const desc = defenderAbility
    ? `${attackerName}'s ${moveName} is blocked by ${defenderName}'s ${defenderAbility}`
    : `${attackerName}'s ${moveName} does not affect ${defenderName}`;
  return {
    moveName, percent: '0.0 - 0.0%', desc, range, kochanceText: null, possibleDamages: [0],
    errorMessage: null, multihitRange: null, effectiveHits: null,
  };
}

function flattenDamage(damage: number | number[] | number[][]): number[] {
  if (typeof damage === 'number') return [damage];
  if (damage.length > 0 && Array.isArray(damage[0])) return (damage as number[][]).flat();
  return damage as number[];
}

/**
 * A move's own base data (not the constructed Move instance, which always
 * resolves to a single concrete .hits) exposes "multihit" as: undefined (not
 * multi-hit), a plain number (a fixed hit count, e.g. Triple Axel/Population
 * Bomb - treated as a 1..N pick range so a partial connect can be modeled),
 * or a [min, max] tuple (e.g. Bullet Seed 2-5).
 */
function getMultihitRange(gen: Generation, moveName: string): [number, number] | null {
  const moveData = gen.moves.get(toID(moveName));
  const multihit = moveData?.multihit;
  if (multihit === undefined) return null;
  if (typeof multihit === 'number') return [1, multihit];
  return [multihit[0], multihit[1]];
}

/** Standard stage-boost multiplier (-6..+6): >=0 stages are (2+n)/2, negative are 2/(2-n). */
function boostMultiplier(stage: number): number {
  const clamped = Math.max(-6, Math.min(6, stage));
  return clamped >= 0 ? (2 + clamped) / 2 : 2 / (2 - clamped);
}

/**
 * Speed-doubling abilities that key off the active field weather - the
 * permanent-weather abilities (Desolate Land/Primordial Sea) count as their
 * base weather too, since Chlorophyll/Swift Swim key off "is it sunny/
 * rainy", not the specific ability that caused it. Doesn't cover Tailwind
 * (a side condition, not a per-Pokemon ability, and not yet tracked as calc
 * state) or Sand Force/Ice Body-style non-Speed weather abilities.
 */
const WEATHER_SPEED_ABILITIES: Record<string, Weather[]> = {
  'swift swim': ['Rain', 'Heavy Rain'],
  'chlorophyll': ['Sun', 'Harsh Sunshine'],
  'sand rush': ['Sand'],
  'slush rush': ['Snow', 'Hail'],
};

function weatherSpeedMultiplier(ability: string, weather: Weather | ''): number {
  if (!weather) return 1;
  const boostedIn = WEATHER_SPEED_ABILITIES[ability.toLowerCase()];
  return boostedIn?.includes(weather) ? 2 : 1;
}

/**
 * Base+SPs+nature+stage boost for all 6 stats - what the Calc's stat table
 * shows as a single computed "Total" per row (see CalcStatRows.tsx),
 * matching what the real games display as a Pokemon's current stat (unlike
 * @smogon/calc's own `rawStats`, which is base+nature+SPs only, no boost).
 * Speed additionally applies weather-boosting abilities (Swift Swim etc.,
 * keyed off the field's active weather) and then paralysis-halving, in that
 * order, matching the real games' modifier ordering - both are already
 * explicit, unambiguous inputs on this panel (state.ability, field.weather).
 * Doesn't model Tailwind, since that's a side condition not yet tracked as
 * calc state. Floored per-stat (not just at the end) since that's how the
 * real stat formula rounds a fractional boost multiplier.
 */
export function computeBoostedStats(gen: Generation, state: CalcPokemonState, weather: Weather | ''): StatsTable | null {
  if (!state.species) return null;
  try {
    const pokemon = buildPokemon(gen, state);
    const keys = Object.keys(pokemon.rawStats) as (keyof StatsTable)[];
    const entries = keys.map(key => {
      const boosted = Math.floor(pokemon.rawStats[key] * boostMultiplier(state.boosts[key]));
      const weatherBoosted = key === 'spe'
        ? Math.floor(boosted * weatherSpeedMultiplier(state.ability, weather))
        : boosted;
      const final = key === 'spe' && state.status === 'par' ? Math.floor(weatherBoosted / 2) : weatherBoosted;
      return [key, final] as const;
    });
    return Object.fromEntries(entries) as StatsTable;
  } catch {
    return null;
  }
}

export function computeEffectiveSpeed(gen: Generation, state: CalcPokemonState, weather: Weather | ''): number | null {
  return computeBoostedStats(gen, state, weather)?.spe ?? null;
}

function buildPokemon(gen: Generation, state: CalcPokemonState): InstanceType<typeof Pokemon> {
  return new Pokemon(gen, resolveCalcSpecies(state.species), {
    level: state.level,
    gender: state.gender || undefined,
    item: state.item || undefined,
    ability: state.ability || undefined,
    nature: state.nature,
    status: state.status || undefined,
    evs: spsToEvs(state.sps),
    ivs: MAX_IVS,
    boosts: state.boosts,
  });
}

export function computeSideResults(
  gen: Generation,
  attacker: CalcPokemonState,
  defender: CalcPokemonState,
  attackerSide: CalcSideConditions,
  defenderSide: CalcSideConditions,
  gameType: GameType,
  weather: Weather | '',
  terrain: Terrain | '',
): CalcMoveResultEntry[] {
  if (!attacker.species || !defender.species) {
    return attacker.moves.map(m => emptyEntry(m.name));
  }

  let atkPokemon: InstanceType<typeof Pokemon>;
  let defPokemon: InstanceType<typeof Pokemon>;
  try {
    atkPokemon = buildPokemon(gen, attacker);
    defPokemon = buildPokemon(gen, defender);
  } catch (err) {
    return attacker.moves.map(m => errorEntry(m.name, err));
  }

  const field = new Field({
    gameType,
    weather: weather || undefined,
    terrain: terrain || undefined,
    attackerSide,
    defenderSide,
  });

  return attacker.moves.map(slot => {
    if (!slot.name) return emptyEntry('');
    const multihitRange = getMultihitRange(gen, slot.name);
    try {
      const move = new Move(gen, slot.name, {
        ability: attacker.ability || undefined,
        item: attacker.item || undefined,
        species: attacker.species,
        isCrit: slot.isCrit,
        hits: slot.hits,
        overrides: getChampionsCalcMoveOverride(slot.name),
      });
      const result = calculate(gen, atkPokemon, defPokemon, move, field);
      const range = result.range();
      if (isFullyBlocked(range, move.category)) {
        return blockedEntry(slot.name, range, attacker.species, defender.species, result.rawDesc.defenderAbility);
      }
      const maxHP = defPokemon.maxHP();
      const percent = `${((range[0] / maxHP) * 100).toFixed(1)} - ${((range[1] / maxHP) * 100).toFixed(1)}%`;
      return {
        moveName: slot.name,
        percent,
        desc: result.desc(),
        range,
        kochanceText: result.kochance().text,
        possibleDamages: [...new Set(flattenDamage(result.damage))].sort((a, b) => a - b),
        errorMessage: null,
        multihitRange,
        effectiveHits: multihitRange ? move.hits : null,
      };
    } catch (err) {
      return errorEntry(slot.name, err);
    }
  });
}
