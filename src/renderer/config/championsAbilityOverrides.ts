/**
 * Champions Ability Balance Overrides
 * Same rationale as championsMoveOverrides.ts - PokeAPI models mainline
 * Scarlet/Violet only. Verified against Bulbapedia's Champions article
 * ("Changes from Scarlet and Violet and Generation VIII"):
 *   https://bulbapedia.bulbagarden.net/wiki/Pokémon_Champions
 *
 * Known limitation: these only correct the description text shown in our
 * own tooltips. If @smogon/calc has its own internal Unseen Fist-vs-Protect
 * damage logic, that deep interaction may still assume the old 100% value -
 * not chased further here, see TODO.md.
 */

import type { AbilityData } from '../types/pokemon';
import { normalizeNameForAPI } from '../services/pokeapiService';

const CHAMPIONS_ABILITY_OVERRIDES: Record<string, Partial<AbilityData>> = {
  'healer': { description: 'Has a 50% chance to heal an adjacent ally of its status condition each turn.' },
  'unseen-fist': { description: "Contact moves can hit through Protect and similar moves, but deal only 25% damage when they do." },
};

export function applyChampionsAbilityOverride(ability: AbilityData): AbilityData {
  const slug = normalizeNameForAPI(ability.name);
  const override = CHAMPIONS_ABILITY_OVERRIDES[slug];
  return override ? { ...ability, ...override } : ability;
}
