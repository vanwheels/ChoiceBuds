/**
 * Speed Tiers Data Layer (Speed Calc-like Feature - see TODO.md /
 * docs/investigations/speed-calc-scope.md). Pure functions turning a roster
 * Pokemon or a regulation-legal species (see docs/investigations/
 * speed-tiers-full-roster-pivot.md - no longer limited to Team Gap
 * Analysis's usage-threat list) into real, field-modified effective Speed
 * numbers. No React, no UI - consumed by the view shell (utils/
 * speedTierList.ts + components/speedtiers/*).
 *
 * `@smogon/calc`'s own `Pokemon.rawStats` (what championsStats.ts/
 * damageCalcEngine.ts::computeBoostedStats reads) is base+nature+SP+IV only
 * - no item or Tailwind. The real speed-modifier chain (weather-boosting
 * abilities, Choice Scarf/Iron Ball, Tailwind, paralysis, gen-dependent
 * rounding) lives in `getFinalSpeed()` (dist/mechanics/util.js, typed in
 * util.d.ts), which `calculate()` uses internally but which the public
 * index.d.ts doesn't re-export. Reusing it here (rather than hand-rolling a
 * second, subtly-different multiplier chain) is the only way to get real
 * cartridge-accurate speed ties, which matter a lot for a speed-tier tool.
 * Everything fed into it is built through already-public @smogon/calc
 * classes (buildPokemon(), `new Field({...})`, whose constructor already
 * wraps attackerSide/defenderSide into real Side instances) - this file's
 * only reach past the public API surface is the getFinalSpeed import itself.
 *
 * Trick Room has no representation in @smogon/calc - it never changes a raw
 * speed number, it only flips which end of a sorted list acts first. That's
 * a sort-direction concern for whatever consumes this file's output, not
 * something these functions take a flag for.
 *
 * Paralysis is a per-Pokemon `status`, not a field toggle - it already flows
 * through CalcPokemonState.status -> buildPokemon() -> getFinalSpeed() for
 * free whenever a caller sets one (e.g. a future Live Calc-inferred status).
 *
 * Modeling note: ChampionsUsageStatSpreadEntry.points is a genuine joint
 * 6-stat build (ranked by real usage %), safe to treat as its own honest
 * distribution - each spread the caller keeps becomes its own row (which
 * ones to keep, e.g. a usage-percentage floor, is a view-layer policy call -
 * see utils/speedTierList.ts's SPREAD_USAGE_CUTOFF_PERCENT). Nature and item
 * are deliberately NOT crossed with a spread's own points: the API never
 * says which spread paired with which nature or item in any real battle, so
 * combining them would fabricate joint percentages that don't exist in the
 * data (same reasoning speedTierList.ts's header gives for not combining
 * spreads with each other). Instead:
 * - Item is a global, page-level field toggle (SpeedFieldContext.threatItem)
 *   rather than per-species usage data - only Choice Scarf and Iron Ball
 *   have a fixed, universal speed multiplier, so there's nothing
 *   species-specific to look up (see docs/investigations/
 *   speed-tiers-layout-rework.md).
 * - Nature isn't binary, so rather than annotating one spread with a
 *   top-ranked-nature delta, computeThreatSpeedProfile also returns 3 fixed
 *   reference bounds per threat (min/neutral/max), independent of any
 *   spread's own points - see computeThreatSpeedBounds below.
 * Ability stays baked into every spread and bound (the closest thing to a
 * fixed species trait for a real threat, e.g. Chlorophyll Venusaur), and its
 * speed effect is already correctly gated by the caller's own field context.
 */
import { Field } from '@smogon/calc';
import type { Generation, NatureName, StatsTable, Terrain, Weather } from '@smogon/calc/dist/data/interface';
import { getFinalSpeed } from '@smogon/calc/dist/mechanics/util';
import type { ChampionsUsageEntry, ImportedPokemonInfo } from '../types/pokemon';
import { teamPokemonToCalcUpdates } from './calcTeamImport';
import { buildPokemon, defaultPokemonState, type CalcPokemonState } from './damageCalcEngine';

/** The only two items with a fixed, universal Speed multiplier - see this file's header. */
export type ThreatSpeedItem = '' | 'Choice Scarf' | 'Iron Ball';

/** Nature names used for the min/neutral/max bounds below - see computeThreatSpeedBounds. */
const MIN_SPEED_NATURE: NatureName = 'Brave'; // lowers Speed
const NEUTRAL_SPEED_NATURE: NatureName = 'Hardy'; // no Speed effect
const MAX_SPEED_NATURE: NatureName = 'Timid'; // raises Speed

export interface SpeedFieldContext {
  weather: Weather | '';
  terrain: Terrain | '';
  teamHasTailwind: boolean;
  threatHasTailwind: boolean;
  /** Global, page-level toggle applied to every threat entry - see this file's header. Threats only, matching how the old per-species item scan was already threat-only; a team-side equivalent would be hypothetical speed adjustment for your own team, which is out of scope (see docs/investigations/speed-tiers-layout-rework.md). */
  threatItem: ThreatSpeedItem;
}

export function defaultSpeedFieldContext(): SpeedFieldContext {
  return { weather: '', terrain: '', teamHasTailwind: false, threatHasTailwind: false, threatItem: '' };
}

export interface TeamSpeedEntry {
  pokemonId: string;
  species: string;
  spriteUrl: string;
  speed: number;
}

export interface ThreatSpeedSpreadEntry {
  speed: number;
  percentage: number;
}

/** 3 fixed reference Speed values per threat, independent of any ranked spread's own points - see this file's header. */
export interface ThreatSpeedBounds {
  /** 0 SP + a Speed-lowering nature. */
  min: number;
  /** 0 SP + a nature with no Speed effect. */
  neutral: number;
  /** 32 SP (Champions' own 0-32 Stat Point scale - see utils/championsStats.ts) + a Speed-raising nature. */
  max: number;
}

export interface ThreatSpeedProfile {
  species: string;
  /** One per ChampionsUsageEntry.statSpreads entry, sorted by percentage descending. Empty when the species has no usage data - see ThreatSpeedInput.usage. */
  spreads: ThreatSpeedSpreadEntry[];
  bounds: ThreatSpeedBounds;
}

/**
 * Input for computeThreatSpeedProfile, decoupled from requiring a real
 * ChampionsUsageEntry - the Speed Tiers view plots every regulation-legal
 * species (see docs/investigations/speed-tiers-full-roster-pivot.md), most
 * of which have no ranked usage data at all. `usage` stays optional (spreads
 * only); `ability` is resolved by the caller - the usage entry's own
 * top-ranked ability when one exists, otherwise the species' default ability
 * from the roster cache (see SpeedTiersPage.tsx).
 */
export interface ThreatSpeedInput {
  species: string;
  ability: string;
  usage: ChampionsUsageEntry | null;
}

function buildField(field: SpeedFieldContext): InstanceType<typeof Field> {
  return new Field({
    weather: field.weather || undefined,
    terrain: field.terrain || undefined,
    attackerSide: { isTailwind: field.teamHasTailwind },
    defenderSide: { isTailwind: field.threatHasTailwind },
  });
}

function finalSpeed(gen: Generation, state: CalcPokemonState, calcField: InstanceType<typeof Field>, side: InstanceType<typeof Field>['attackerSide']): number {
  const pokemon = buildPokemon(gen, state);
  return getFinalSpeed(gen, pokemon, calcField, side);
}

/**
 * A roster Pokemon's real, field-modified effective Speed - its own SPs/
 * nature/item/ability plus the given field context. Null on an
 * unresolvable species/nature/item, same graceful-failure shape as
 * damageCalcEngine.ts::computeBoostedStats.
 */
export function computeTeamSpeed(gen: Generation, pokemon: ImportedPokemonInfo, field: SpeedFieldContext): TeamSpeedEntry | null {
  try {
    const state: CalcPokemonState = { ...defaultPokemonState(), ...teamPokemonToCalcUpdates(pokemon) };
    const calcField = buildField(field);
    return {
      pokemonId: pokemon.id,
      species: pokemon.showdownData.species,
      spriteUrl: pokemon.spriteUrl,
      speed: finalSpeed(gen, state, calcField, calcField.attackerSide),
    };
  } catch {
    return null;
  }
}

/**
 * A regulation-legal species' speed profile under the given field context -
 * see this file's header for the spread-vs-bounds split, and
 * ThreatSpeedInput's doc comment for why usage is optional. Null on an
 * unresolvable species.
 */
export function computeThreatSpeedProfile(gen: Generation, input: ThreatSpeedInput, field: SpeedFieldContext): ThreatSpeedProfile | null {
  try {
    const calcField = buildField(field);
    const { species, ability, usage } = input;

    const baseState = (): CalcPokemonState => ({
      ...defaultPokemonState(),
      species,
      ability,
      item: field.threatItem,
    });

    const spreads: ThreatSpeedSpreadEntry[] = (usage?.statSpreads ?? [])
      .map(spread => ({
        speed: finalSpeed(gen, { ...baseState(), sps: spread.points }, calcField, calcField.defenderSide),
        percentage: spread.percentage,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    const maxSps: StatsTable = { ...baseState().sps, spe: 32 };
    const bounds: ThreatSpeedBounds = {
      min: finalSpeed(gen, { ...baseState(), nature: MIN_SPEED_NATURE }, calcField, calcField.defenderSide),
      neutral: finalSpeed(gen, { ...baseState(), nature: NEUTRAL_SPEED_NATURE }, calcField, calcField.defenderSide),
      max: finalSpeed(gen, { ...baseState(), nature: MAX_SPEED_NATURE, sps: maxSps }, calcField, calcField.defenderSide),
    };

    return { species, spreads, bounds };
  } catch {
    return null;
  }
}
