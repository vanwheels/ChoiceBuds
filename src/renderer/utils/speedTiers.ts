/**
 * Speed Tiers Data Layer (Speed Calc-like Feature, Leg 2 - see TODO.md /
 * docs/investigations/speed-calc-scope.md). Pure functions turning a roster
 * Pokemon and a Team Gap Analysis usage threat (utils/usageThreats.ts) into
 * real, field-modified effective Speed numbers. No React, no UI - consumed
 * by the view shell (Leg 3) and the Live Calc tie-in (Leg 4).
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
 * distribution. Nature/item/ability are separate, independently-ranked
 * marginal lists - the API never says which spread paired with which nature
 * or item in any real battle, so crossing them combinatorially would
 * fabricate joint percentages that don't exist in the data. Ability is
 * still baked into every spread's build (the closest thing to a fixed
 * species trait for a real threat, e.g. Chlorophyll Venusaur - and its
 * speed effect is already correctly gated by the caller's own field
 * context, so it can't silently inflate a number the caller didn't ask
 * for). Nature and item stay out of the base spread number and are instead
 * surfaced as diff-based "modifier notes" anchored to the single top-ranked
 * spread: build once with no item, again with the top-ranked nature (if
 * Speed-relevant) or a top-3-ranked item, and only keep the ones that
 * actually change the resulting number. This needs no hardcoded "which
 * items/abilities affect speed" table and stays correct automatically.
 */
import { Field } from '@smogon/calc';
import type { Generation, NatureName, Terrain, Weather } from '@smogon/calc/dist/data/interface';
import { getFinalSpeed } from '@smogon/calc/dist/mechanics/util';
import type { ChampionsUsageEntry, ImportedPokemonInfo } from '../types/pokemon';
import { teamPokemonToCalcUpdates } from './calcTeamImport';
import { buildPokemon, defaultPokemonState, type CalcPokemonState } from './damageCalcEngine';

/** How many top-ranked items to scan for a speed-changing modifier note - see this file's header. */
const ITEM_NOTE_SCAN_COUNT = 3;

export interface SpeedFieldContext {
  weather: Weather | '';
  terrain: Terrain | '';
  teamHasTailwind: boolean;
  threatHasTailwind: boolean;
}

export function defaultSpeedFieldContext(): SpeedFieldContext {
  return { weather: '', terrain: '', teamHasTailwind: false, threatHasTailwind: false };
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

export interface ThreatSpeedModifierNote {
  kind: 'item' | 'nature';
  label: string;
  percentage: number;
  speed: number;
}

export interface ThreatSpeedProfile {
  species: string;
  /** One per ChampionsUsageEntry.statSpreads entry, sorted by percentage descending. */
  spreads: ThreatSpeedSpreadEntry[];
  /** Only notes where the modifier actually changed the resulting speed - see this file's header. */
  modifierNotes: ThreatSpeedModifierNote[];
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

/** Whether a ChampionsUsageNatureEntry's statUp/statDown names Speed - see this file's header on why this is a runtime diff rather than a hardcoded nature table. */
function isSpeedNature(statUp: string | undefined, statDown: string | undefined): boolean {
  return !!(statUp?.toLowerCase().includes('speed') || statDown?.toLowerCase().includes('speed'));
}

/**
 * A Team Gap Analysis usage threat's speed profile under the given field
 * context - see this file's header for the spread-vs-modifier-note split.
 * Null on an unresolvable species.
 */
export function computeThreatSpeedProfile(gen: Generation, usage: ChampionsUsageEntry, field: SpeedFieldContext): ThreatSpeedProfile | null {
  try {
    const calcField = buildField(field);
    const topAbility = usage.abilities[0]?.name ?? '';

    const baseState = (): CalcPokemonState => ({
      ...defaultPokemonState(),
      species: usage.species,
      ability: topAbility,
    });

    const spreads: ThreatSpeedSpreadEntry[] = usage.statSpreads
      .map(spread => ({
        speed: finalSpeed(gen, { ...baseState(), sps: spread.points }, calcField, calcField.defenderSide),
        percentage: spread.percentage,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    const topSpread = usage.statSpreads[0];
    if (!topSpread) return { species: usage.species, spreads, modifierNotes: [] };

    const baselineSpeed = finalSpeed(gen, { ...baseState(), sps: topSpread.points }, calcField, calcField.defenderSide);
    const modifierNotes: ThreatSpeedModifierNote[] = [];

    const topNature = usage.natures[0];
    if (topNature && isSpeedNature(topNature.statUp, topNature.statDown)) {
      const speed = finalSpeed(gen, { ...baseState(), sps: topSpread.points, nature: topNature.name as NatureName }, calcField, calcField.defenderSide);
      if (speed !== baselineSpeed) {
        modifierNotes.push({ kind: 'nature', label: topNature.name, percentage: topNature.percentage, speed });
      }
    }

    for (const item of usage.items.slice(0, ITEM_NOTE_SCAN_COUNT)) {
      const speed = finalSpeed(gen, { ...baseState(), sps: topSpread.points, item: item.name }, calcField, calcField.defenderSide);
      if (speed !== baselineSpeed) {
        modifierNotes.push({ kind: 'item', label: item.name, percentage: item.percentage, speed });
      }
    }

    return { species: usage.species, spreads, modifierNotes };
  } catch {
    return null;
  }
}
