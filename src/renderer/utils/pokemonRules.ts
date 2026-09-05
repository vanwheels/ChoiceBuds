/**
 * Dynamic ruleset/regulation validation for the Pokémon Champions legality
 * engine.
 *
 * DATA SOURCE: Pokémon Champions launched in 2026 (after this assistant's
 * knowledge cutoff), so this data was pulled live from Serebii's official
 * regulation pages rather than guessed:
 *   https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml
 *   https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-b.shtml
 * Both pages define legality as a positive "Newly Useable Pokémon" allowlist
 * (not a banlist over the full dex) - REG_MA_SPECIES below is that full M-A
 * table; REG_MB_ADDED_SPECIES is the 22 species M-B adds on top of it. Every
 * species absent from both tables (all Legendaries/Mythicals, plus ordinary
 * species not yet unlocked, e.g. Salamence pre-Reg M-C) is simply not on the
 * list - there is no separate ban mechanism to maintain.
 *
 * REG_MC_ADDED_SPECIES has no equivalent official-source page yet - Reg M-C
 * was announced ahead of its 2026-09-08 6pm PST release, hand-curated from
 * confirmed reveals as of 2026-09-05 (see TODO.md's Regulation M-C Prep
 * entry) rather than Serebii's own regulation page, which doesn't exist yet.
 * Re-verify REG_MC_ADDED_SPECIES against Serebii's regulationm-c.shtml once
 * it's up and replace this note with a real citation, same as M-A/M-B above.
 *
 * Mega Evolution forms are excluded entirely (not just deduplicated) - Mega
 * access is meant to be item-driven (holding the matching Mega Stone on the
 * base species), not a separate roster pick; useSpeciesRoster filters Mega
 * varieties out of the picker for the same reason. Regional forms confirmed
 * as distinct rows in Serebii's table (verified via a follow-up fetch asking
 * specifically which duplicate-named entries were separate forms) are listed
 * as their own slugs below: Alolan Raichu/Ninetales, Hisuian Arcanine/
 * Typhlosion/Samurott/Zoroark/Goodra/Avalugg/Decidueye, Galarian Slowbro/
 * Slowking/Stunfisk, and the 3 Paldean Tauros breeds.
 *
 * Both regulation pages explicitly list no banned/restricted items or moves -
 * legality in this format is species-based only, which is why
 * validateMoveLegality/validateItemLegality below are pass-throughs.
 *
 * Distinct from config/pokemonRules.ts, which is the existing static
 * gender-rule table used by the Showdown parser - unrelated concern, kept
 * separate rather than overloaded into the same file.
 */

import type { RegulationLabel } from '../types/pokemon';

export type RegulationId = 'REG-MA' | 'REG-MB' | 'REG-MC';

/** Every regulation the app knows about, in display order - drives the regulation-picker dropdown */
export const ALL_REGULATION_IDS: RegulationId[] = ['REG-MA', 'REG-MB', 'REG-MC'];

/**
 * The most recently added regulation - the roster useInitialSync.ts/
 * useUsageSync.ts bulk-sync against, since both want "everything currently
 * legal," not one specific regulation. Derived from ALL_REGULATION_IDS
 * (rather than a second hardcoded literal) so there's exactly one place to
 * touch when the next regulation ships.
 */
export const LATEST_REGULATION_ID: RegulationId = ALL_REGULATION_IDS[ALL_REGULATION_IDS.length - 1];

export interface ChampionsRuleset {
  id: RegulationId;
  allowedSpecies: string[]; // lowercase-hyphenated base species slugs
  allowedMoves: string[]; // unused by validateMoveLegality - see file header
  allowedItems: string[]; // unused by validateItemLegality - see file header
}

/**
 * Regulation M-A "Newly Useable Pokémon" as listed on Serebii, including the
 * verified regional-form slugs called out in the file header above.
 */
const REG_MA_SPECIES: string[] = [
  'venusaur', 'charizard', 'blastoise', 'beedrill', 'pidgeot', 'arbok', 'pikachu', 'raichu', 'raichu-alola',
  'clefable', 'ninetales', 'ninetales-alola', 'arcanine', 'arcanine-hisui', 'alakazam', 'machamp',
  'victreebel', 'slowbro', 'slowbro-galar', 'gengar', 'kangaskhan', 'starmie', 'pinsir',
  'tauros', 'tauros-paldea-combat-breed', 'tauros-paldea-blaze-breed', 'tauros-paldea-aqua-breed',
  // @smogon/calc's own species data spells these without "-breed" - both spellings kept
  // since Showdown-text parsing (Teams tab) may still produce the "-breed" form.
  'tauros-paldea-combat', 'tauros-paldea-blaze', 'tauros-paldea-aqua',
  'gyarados', 'ditto', 'vaporeon', 'jolteon', 'flareon', 'aerodactyl', 'snorlax', 'dragonite',
  'meganium', 'typhlosion', 'typhlosion-hisui', 'feraligatr', 'ariados', 'ampharos', 'azumarill',
  'politoed', 'espeon', 'umbreon', 'slowking', 'slowking-galar', 'forretress', 'steelix', 'scizor',
  'heracross', 'skarmory', 'houndoom', 'tyranitar', 'pelipper', 'gardevoir', 'sableye', 'aggron',
  'medicham', 'manectric', 'sharpedo', 'camerupt', 'torkoal', 'altaria', 'milotic', 'castform',
  'banette', 'chimecho', 'absol', 'glalie', 'torterra', 'infernape', 'empoleon', 'luxray', 'roserade',
  'rampardos', 'bastiodon', 'lopunny', 'spiritomb', 'garchomp', 'lucario', 'hippowdon', 'toxicroak',
  'abomasnow', 'weavile', 'rhyperior', 'leafeon', 'glaceon', 'gliscor', 'mamoswine', 'gallade',
  'froslass', 'rotom', 'rotom-heat', 'rotom-wash', 'rotom-frost', 'rotom-fan', 'rotom-mow',
  'serperior', 'emboar', 'samurott', 'samurott-hisui', 'watchog', 'liepard',
  'simisage', 'simisear', 'simipour', 'excadrill', 'audino', 'conkeldurr', 'whimsicott', 'krookodile',
  'cofagrigus', 'garbodor', 'zoroark', 'zoroark-hisui', 'reuniclus', 'vanilluxe', 'emolga', 'chandelure',
  'beartic', 'stunfisk', 'stunfisk-galar', 'golurk', 'hydreigon', 'volcarona', 'chesnaught', 'delphox',
  // Champions' real legal Floette is the Eternal Flower form, not the ordinary
  // color-variant form - confirmed via Showdown's champions mod, see Leg 5/6
  // of docs/investigations/champions-showdown-mod-audit.md.
  'greninja', 'diggersby', 'talonflame', 'vivillon', 'floette-eternal', 'florges', 'pangoro', 'furfrou',
  'meowstic-male', 'meowstic-female', 'aegislash', 'aromatisse', 'slurpuff', 'clawitzer', 'heliolisk', 'tyrantrum', 'aurorus',
  // @smogon/calc has no bare "Aegislash" entry - only its Blade/Shield stat-formes
  'aegislash-blade', 'aegislash-shield',
  'sylveon', 'hawlucha', 'dedenne', 'goodra', 'goodra-hisui', 'klefki', 'trevenant', 'gourgeist',
  'avalugg', 'avalugg-hisui', 'noivern', 'decidueye', 'decidueye-hisui', 'incineroar', 'primarina',
  'toucannon', 'crabominable', 'lycanroc', 'toxapex', 'mudsdale', 'araquanid', 'salazzle', 'tsareena',
  'oranguru', 'passimian', 'mimikyu', 'drampa', 'kommo-o', 'corviknight', 'flapple', 'appletun',
  'sandaconda', 'polteageist', 'hatterene', 'mr-rime', 'runerigus', 'alcremie', 'morpeko', 'dragapult',
  'wyrdeer', 'kleavor', 'basculegion-male', 'basculegion-female', 'sneasler', 'meowscarada', 'skeledirge', 'quaquaval', 'maushold',
  'garganacl', 'armarouge', 'ceruledge', 'bellibolt', 'scovillain', 'espathra', 'tinkaton',
  // PokeAPI has no bare "palafin" pokemon resource - only its palafin-zero/palafin-hero
  // varieties (Zero is the team-building form; Hero is a battle-only transformation,
  // deliberately excluded here the same way Mega forms are excluded from the roster).
  'palafin-zero',
  'orthworm', 'glimmora', 'farigiraf', 'kingambit', 'sinistcha', 'archaludon', 'hydrapple',
];

/** The 22 species Regulation M-B adds on top of everything in REG_MA_SPECIES */
const REG_MB_ADDED_SPECIES: string[] = [
  'vileplume', 'qwilfish', 'sceptile', 'blaziken', 'swampert', 'mawile', 'metagross', 'staraptor',
  'musharna', 'scolipede', 'scrafty', 'eelektross', 'pyroar', 'malamar', 'barbaracle', 'dragalge',
  'grimmsnarl', 'falinks', 'overqwil', 'houndstone', 'annihilape', 'gholdengo',
];

/**
 * The species Regulation M-C adds on top of everything in REG_MB_ADDED_SPECIES,
 * confirmed ahead of release (see file header). Absol/Garchomp/Lucario's new
 * "Mega Z" formes are NOT a roster addition here, same convention as every
 * other Mega form - all three base species are already legal via
 * REG_MA_SPECIES, and the Mega Z form itself is item-driven (holding the
 * matching "-ite Z" stone), not a separate pick. See config/megaEvolution.ts/
 * config/megaAbilities.ts for that half of Reg M-C's additions.
 */
const REG_MC_ADDED_SPECIES: string[] = ['rillaboom', 'baxcalibur', 'salamence', 'golisopod'];

export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[.]/g, '')
    .replace(/\s+/g, '-');
}

/**
 * Meowstic/Basculegion are modeled as PokeAPI-style "-male"/"-female" slugs
 * in REG_MA_SPECIES (matching the species roster's naming), but Showdown
 * import text and manual entry use "-F"/"-M"/bare-name conventions instead
 * (see config/pokemonRules.ts's GENDERED_FORM_VARIANTS). Canonicalize both
 * spellings to the same slug before checking legality.
 */
const GENDER_DIVERGENT_BASE_SPECIES = ['basculegion', 'meowstic'];

function canonicalizeGenderDivergentSlug(slug: string): string {
  for (const base of GENDER_DIVERGENT_BASE_SPECIES) {
    if (slug === base || slug === `${base}-m`) return `${base}-male`;
    if (slug === `${base}-f`) return `${base}-female`;
  }
  return slug;
}

const REG_MA_SPECIES_SET = new Set(REG_MA_SPECIES.map(normalizeSlug));
const REG_MB_SPECIES_SET = new Set([...REG_MA_SPECIES, ...REG_MB_ADDED_SPECIES].map(normalizeSlug));
const REG_MC_SPECIES_SET = new Set([...REG_MA_SPECIES, ...REG_MB_ADDED_SPECIES, ...REG_MC_ADDED_SPECIES].map(normalizeSlug));

export const CHAMPIONS_RULESETS: Record<RegulationId, ChampionsRuleset> = {
  'REG-MA': {
    id: 'REG-MA',
    allowedSpecies: [...REG_MA_SPECIES_SET],
    allowedMoves: [],
    allowedItems: [],
  },
  'REG-MB': {
    id: 'REG-MB',
    allowedSpecies: [...REG_MB_SPECIES_SET],
    allowedMoves: [],
    allowedItems: [],
  },
  'REG-MC': {
    id: 'REG-MC',
    allowedSpecies: [...REG_MC_SPECIES_SET],
    allowedMoves: [],
    allowedItems: [],
  },
};

/** Human-readable label matching the app's existing `Team.format` convention */
const REGULATION_LABEL: Record<RegulationId, RegulationLabel> = {
  'REG-MA': 'Reg M-A',
  'REG-MB': 'Reg M-B',
  'REG-MC': 'Reg M-C',
};

export function getRegulationLabel(rulesetId: RegulationId): RegulationLabel {
  return REGULATION_LABEL[rulesetId];
}

const LABEL_TO_REGULATION_ID: Record<RegulationLabel, RegulationId> = {
  'Reg M-A': 'REG-MA',
  'Reg M-B': 'REG-MB',
  'Reg M-C': 'REG-MC',
};

/** Bridges the app's existing `Team.format` field to a RegulationId */
export function toRegulationId(format: RegulationLabel): RegulationId {
  return LABEL_TO_REGULATION_ID[format];
}

export function getRuleset(rulesetId: RegulationId): ChampionsRuleset {
  return CHAMPIONS_RULESETS[rulesetId];
}

const SPECIES_SET_BY_REGULATION: Record<RegulationId, Set<string>> = {
  'REG-MA': REG_MA_SPECIES_SET,
  'REG-MB': REG_MB_SPECIES_SET,
  'REG-MC': REG_MC_SPECIES_SET,
};

/**
 * Real species-legality check against the sourced "Newly Useable Pokémon"
 * allowlist for the given regulation (each later regulation is a superset of
 * the previous one - REG-MB adds to REG-MA, REG-MC adds to REG-MB).
 */
export function validateSpeciesLegality(speciesId: string, rulesetId: RegulationId): boolean {
  const normalized = canonicalizeGenderDivergentSlug(normalizeSlug(speciesId));
  return SPECIES_SET_BY_REGULATION[rulesetId].has(normalized);
}

/**
 * Both regulation pages list no banned/restricted moves - legality here is
 * species-based only (above). This validates the move NAME is a real,
 * well-formed slug (i.e. actually came from the real learnset pipeline) and
 * passes everything else through as legal, logging anything malformed.
 */
export function validateMoveLegality(moveName: string, rulesetId: RegulationId): boolean {
  const normalized = normalizeSlug(moveName);
  if (!normalized || !/^[a-z0-9-]+$/.test(normalized)) {
    console.warn(`[pokemonRules] Non-standard move "${moveName}" could not be validated against ${rulesetId}`);
    return false;
  }
  return true;
}

/**
 * Same rationale as validateMoveLegality: both regulation pages list no
 * banned/restricted items, so this only validates the item is a real,
 * well-formed slug rather than checking it against a ban list.
 */
export function validateItemLegality(itemName: string, rulesetId: RegulationId): boolean {
  const normalized = normalizeSlug(itemName);
  if (!normalized || !/^[a-z0-9-]+$/.test(normalized)) {
    console.warn(`[pokemonRules] Non-standard item "${itemName}" could not be validated against ${rulesetId}`);
    return false;
  }
  return true;
}
