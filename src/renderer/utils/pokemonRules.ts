/**
 * Dynamic ruleset/regulation validation for the Pokémon Champions legality
 * engine. This is a SCAFFOLD: the allowedSpecies/allowedMoves/allowedItems
 * data in CHAMPIONS_RULESETS below is placeholder/mock data only - a small
 * illustrative sample, not an authoritative Reg M-A/M-B legality list. Swap
 * in real regulation data before relying on this for actual tournament
 * legality enforcement.
 *
 * Distinct from config/pokemonRules.ts, which is the existing static
 * gender-rule table used by the Showdown parser - unrelated concern, kept
 * separate rather than overloaded into the same file.
 */

export type RegulationId = 'REG-MA' | 'REG-MB';

export interface ChampionsRuleset {
  id: RegulationId;
  allowedSpecies: string[]; // lowercase-hyphenated species slugs
  allowedMoves: string[]; // lowercase-hyphenated move slugs
  allowedItems: string[]; // lowercase-hyphenated item slugs
}

/**
 * PLACEHOLDER data - illustrative sample sets only. Real regulation legality
 * (Restricted Legendaries, per-regulation item/move bans) needs to be sourced
 * from an authoritative ruleset feed and substituted here.
 */
export const CHAMPIONS_RULESETS: Record<RegulationId, ChampionsRuleset> = {
  'REG-MA': {
    id: 'REG-MA',
    allowedSpecies: ['bulbasaur', 'ivysaur', 'venusaur', 'charmander', 'squirtle', 'pikachu', 'gholdengo'],
    allowedMoves: ['protect', 'rock-slide', 'tackle', 'thunderbolt', 'fake-out', 'helping-hand'],
    allowedItems: ['leftovers', 'choice-scarf', 'sitrus-berry', 'focus-sash'],
  },
  'REG-MB': {
    id: 'REG-MB',
    allowedSpecies: ['bulbasaur', 'ivysaur', 'venusaur', 'charmander', 'squirtle', 'pikachu', 'gholdengo', 'mewtwo'],
    allowedMoves: ['protect', 'rock-slide', 'tackle', 'thunderbolt', 'fake-out', 'helping-hand', 'draco-meteor'],
    allowedItems: ['leftovers', 'choice-scarf', 'sitrus-berry', 'focus-sash', 'life-orb'],
  },
};

/** Human-readable label matching the app's existing `Team.format` convention */
const REGULATION_LABEL: Record<RegulationId, string> = {
  'REG-MA': 'Reg M-A',
  'REG-MB': 'Reg M-B',
};

export function getRegulationLabel(rulesetId: RegulationId): string {
  return REGULATION_LABEL[rulesetId];
}

/** Bridges the app's existing `Team.format` field to a RegulationId */
export function toRegulationId(format: 'Reg M-A' | 'Reg M-B'): RegulationId {
  return format === 'Reg M-A' ? 'REG-MA' : 'REG-MB';
}

function normalizeSlug(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, '-');
}

export function getRuleset(rulesetId: RegulationId): ChampionsRuleset {
  return CHAMPIONS_RULESETS[rulesetId];
}

export function validateSpeciesLegality(speciesId: string, rulesetId: RegulationId): boolean {
  return CHAMPIONS_RULESETS[rulesetId].allowedSpecies.includes(normalizeSlug(speciesId));
}

export function validateMoveLegality(moveName: string, rulesetId: RegulationId): boolean {
  return CHAMPIONS_RULESETS[rulesetId].allowedMoves.includes(normalizeSlug(moveName));
}

export function validateItemLegality(itemName: string, rulesetId: RegulationId): boolean {
  return CHAMPIONS_RULESETS[rulesetId].allowedItems.includes(normalizeSlug(itemName));
}
