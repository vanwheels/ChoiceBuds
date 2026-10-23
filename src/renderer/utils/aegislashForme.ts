/**
 * Aegislash Blade/Shield Forme - Stat Swap
 *
 * Blade Forme's base stats are Shield Forme's with Attack<->Defense and
 * Sp. Atk<->Sp. Def swapped - HP/Speed unchanged. This is the real in-game
 * forme-change rule, not an approximation - confirmed against @smogon/calc's
 * own bundled Gen 9 dex (see utils/championsStats.ts's resolveCalcSpecies
 * doc comment: Blade is 140/50 Atk-Def/SpA-SpD vs. Shield's 50/140, same
 * swap this file applies).
 *
 * Pokemon storage keeps a single species ("Aegislash") whose own baseStats
 * are always Shield's - its default/roster forme, see services/pokeapi.ts's
 * normalizeSpeciesForAPI - so Blade's stats are derived from that stored
 * value on demand (Aegislash Form Toggle in Team Builder, see TODO.md)
 * rather than duplicated as a second literal table that could drift from it.
 */

import type { PokemonStats } from '../types/pokemon';

export const AEGISLASH_BLADE_FORM = 'aegislash-blade';

/** True for "Aegislash" and any already-formed "Aegislash-Blade"/"-Shield" spelling. */
export function isAegislash(species: string): boolean {
  return species.split('-')[0].toLowerCase() === 'aegislash';
}

export function getAegislashBladeStats(shieldStats: PokemonStats): PokemonStats {
  return {
    hp: shieldStats.hp,
    attack: shieldStats.defense,
    defense: shieldStats.attack,
    specialAttack: shieldStats.specialDefense,
    specialDefense: shieldStats.specialAttack,
    speed: shieldStats.speed,
  };
}
