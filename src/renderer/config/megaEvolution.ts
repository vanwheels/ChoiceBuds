/**
 * Mega Stone -> Species mapping for the sprite swap feature: a Pokémon
 * shows its Mega sprite only if it can Mega Evolve AND is holding its own
 * specific stone (not just any Mega Stone).
 *
 * DATA SOURCE: verified live via WebFetch against Serebii's Pokémon
 * Champions items page (https://www.serebii.net/pokemonchampions/items.shtml),
 * which lists each Mega Stone alongside the exact species it belongs to -
 * not guessed from name-shape conventions. Charizard and Raichu are the only
 * two species with split X/Y stones or forms.
 *
 * `suffix` matches the PokeAPI resource name convention (`{species}-{suffix}`,
 * e.g. "gengar-mega", "charizard-mega-x") used to look up the real sprite at
 * render time - see hooks/useMegaSprite.ts. Species newly introduced to
 * Mega Evolution by Pokémon Champions (a 2026 release, after this app's
 * knowledge cutoff) mostly have no PokeAPI resource yet; useMegaSprite
 * handles that as a plain fetch miss and falls back to the normal sprite
 * rather than this file asserting which ones currently resolve.
 */
export const MEGA_STONE_TO_SPECIES: Record<string, { species: string; suffix: string }> = {
  'abomasite': { species: 'abomasnow', suffix: 'mega' },
  'absolite': { species: 'absol', suffix: 'mega' },
  'aerodactylite': { species: 'aerodactyl', suffix: 'mega' },
  'aggronite': { species: 'aggron', suffix: 'mega' },
  'alakazite': { species: 'alakazam', suffix: 'mega' },
  'altarianite': { species: 'altaria', suffix: 'mega' },
  'ampharosite': { species: 'ampharos', suffix: 'mega' },
  'audinite': { species: 'audino', suffix: 'mega' },
  'banettite': { species: 'banette', suffix: 'mega' },
  'barbaracite': { species: 'barbaracle', suffix: 'mega' },
  'beedrillite': { species: 'beedrill', suffix: 'mega' },
  'blastoisinite': { species: 'blastoise', suffix: 'mega' },
  'blazikenite': { species: 'blaziken', suffix: 'mega' },
  'cameruptite': { species: 'camerupt', suffix: 'mega' },
  'chandelurite': { species: 'chandelure', suffix: 'mega' },
  'charizardite x': { species: 'charizard', suffix: 'mega-x' },
  'charizardite y': { species: 'charizard', suffix: 'mega-y' },
  'chesnaughtite': { species: 'chesnaught', suffix: 'mega' },
  'chimechite': { species: 'chimecho', suffix: 'mega' },
  'clefablite': { species: 'clefable', suffix: 'mega' },
  'crabominite': { species: 'crabominable', suffix: 'mega' },
  'delphoxite': { species: 'delphox', suffix: 'mega' },
  'dragalgite': { species: 'dragalge', suffix: 'mega' },
  'dragoninite': { species: 'dragonite', suffix: 'mega' },
  'drampanite': { species: 'drampa', suffix: 'mega' },
  'eelektrossite': { species: 'eelektross', suffix: 'mega' },
  'emboarite': { species: 'emboar', suffix: 'mega' },
  'excadrite': { species: 'excadrill', suffix: 'mega' },
  'falinksite': { species: 'falinks', suffix: 'mega' },
  'feraligite': { species: 'feraligatr', suffix: 'mega' },
  // Champions' real legal Floette is the Eternal Flower form, not the
  // ordinary color-variant form - see utils/pokemonRules.ts's REG_MA_SPECIES.
  'floettite': { species: 'floette-eternal', suffix: 'mega' },
  'froslassite': { species: 'froslass', suffix: 'mega' },
  'galladite': { species: 'gallade', suffix: 'mega' },
  'garchompite': { species: 'garchomp', suffix: 'mega' },
  'gardevoirite': { species: 'gardevoir', suffix: 'mega' },
  'gengarite': { species: 'gengar', suffix: 'mega' },
  'glalitite': { species: 'glalie', suffix: 'mega' },
  'glimmoranite': { species: 'glimmora', suffix: 'mega' },
  'golurkite': { species: 'golurk', suffix: 'mega' },
  'greninjite': { species: 'greninja', suffix: 'mega' },
  'gyaradosite': { species: 'gyarados', suffix: 'mega' },
  'hawluchanite': { species: 'hawlucha', suffix: 'mega' },
  'heracronite': { species: 'heracross', suffix: 'mega' },
  'houndoominite': { species: 'houndoom', suffix: 'mega' },
  'kangaskhanite': { species: 'kangaskhan', suffix: 'mega' },
  'lopunnite': { species: 'lopunny', suffix: 'mega' },
  'lucarionite': { species: 'lucario', suffix: 'mega' },
  'malamarite': { species: 'malamar', suffix: 'mega' },
  'manectite': { species: 'manectric', suffix: 'mega' },
  'mawilite': { species: 'mawile', suffix: 'mega' },
  'medichamite': { species: 'medicham', suffix: 'mega' },
  'meganiumite': { species: 'meganium', suffix: 'mega' },
  'meowsticite': { species: 'meowstic', suffix: 'mega' },
  'metagrossite': { species: 'metagross', suffix: 'mega' },
  'pidgeotite': { species: 'pidgeot', suffix: 'mega' },
  'pinsirite': { species: 'pinsir', suffix: 'mega' },
  'pyroarite': { species: 'pyroar', suffix: 'mega' },
  'raichunite x': { species: 'raichu', suffix: 'mega-x' },
  'raichunite y': { species: 'raichu', suffix: 'mega-y' },
  'sablenite': { species: 'sableye', suffix: 'mega' },
  'sceptilite': { species: 'sceptile', suffix: 'mega' },
  'scizorite': { species: 'scizor', suffix: 'mega' },
  'scolipite': { species: 'scolipede', suffix: 'mega' },
  'scovillainite': { species: 'scovillain', suffix: 'mega' },
  'scraftinite': { species: 'scrafty', suffix: 'mega' },
  'sharpedonite': { species: 'sharpedo', suffix: 'mega' },
  'skarmorite': { species: 'skarmory', suffix: 'mega' },
  'slowbronite': { species: 'slowbro', suffix: 'mega' },
  'staraptite': { species: 'staraptor', suffix: 'mega' },
  'starminite': { species: 'starmie', suffix: 'mega' },
  'steelixite': { species: 'steelix', suffix: 'mega' },
  'swampertite': { species: 'swampert', suffix: 'mega' },
  'tyranitarite': { species: 'tyranitar', suffix: 'mega' },
  'venusaurite': { species: 'venusaur', suffix: 'mega' },
  'victreebelite': { species: 'victreebel', suffix: 'mega' },
};

/**
 * Every real Champions Mega form's full slug ("absol-mega", "charizard-mega-x"),
 * derived from MEGA_STONE_TO_SPECIES. Used by utils/calcFormes.ts to constrain
 * the Calc tab's Mega toggle to this same Champions-verified roster instead of
 * trusting @smogon/calc's own bundled species dex at face value - that dex
 * models a broader mainline/Legends Z-A roster and, as of @smogon/calc 0.11.0,
 * includes ~15 species (Mewtwo, Rayquaza, Latias/Latios, Salamence, etc.) with
 * no Mega Stone anywhere in Champions' real item pool (see vgcData.ts), plus a
 * spurious second "-Mega-Z" entry for Absol/Garchomp/Lucario duplicating their
 * real Mega's ability data. Confirmed via live diff 2026-08-31 - see TODO.md's
 * "Mega Eligibility Team Builder vs Calc Mismatch" entry.
 */
export const CURATED_MEGA_FORM_SLUGS = new Set(
  Object.values(MEGA_STONE_TO_SPECIES).map(entry => `${entry.species}-${entry.suffix}`)
);

/**
 * Floette exception (Champions Data Leg 6): MEGA_STONE_TO_SPECIES's
 * `floettite` entry above uses `floette-eternal` as its species - the real
 * legal Floette per utils/pokemonRules.ts, and what showdownData.species
 * actually holds for a Floette on a team, so getMegaApiSlug/
 * getMegaFormsForSpecies match correctly against that. But @smogon/calc's
 * own bundled species dex (unaware of Champions' Floette/Floette-Eternal
 * legal-form swap) still attaches its "Floette-Mega" entry to base
 * "Floette", not "Floette-Eternal" - so the mechanically-derived
 * "floette-eternal-mega" above would never match what calcFormes.ts actually
 * finds in @smogon/calc's dex, silently hiding the Calc tab's Mega toggle for
 * Floette. Substituted with the slug @smogon/calc itself uses.
 */
CURATED_MEGA_FORM_SLUGS.delete('floette-eternal-mega');
CURATED_MEGA_FORM_SLUGS.add('floette-mega');

/**
 * Resolves the PokeAPI resource slug ("gengar-mega", "charizard-mega-x") for
 * a held item + species pair, or null if that item isn't this species' own
 * Mega Stone. Regional forms (e.g. Slowbro-Galar) never match - Mega
 * Evolution in this data set is only ever the standard form's stone.
 */
export function getMegaApiSlug(heldItem: string | undefined, species: string): string | null {
  if (!heldItem) return null;
  const entry = MEGA_STONE_TO_SPECIES[heldItem.trim().toLowerCase()];
  if (!entry) return null;
  return entry.species === species.trim().toLowerCase() ? `${entry.species}-${entry.suffix}` : null;
}

/**
 * Every Mega Stone (and therefore every Mega form) available to a species -
 * empty for a non-mega-capable species, one entry for most mega-capable
 * ones, two for Charizard/Raichu's X/Y split. Powers the Battle Logger's
 * Mega button: hidden entirely when empty, resolved automatically when
 * there's exactly one form (even if the holder's item isn't confirmed yet -
 * declaring Mega IS revealing that item), and a small X/Y picker only when
 * there's real ambiguity to resolve.
 */
export function getMegaFormsForSpecies(species: string): { item: string; suffix: string }[] {
  const normalized = species.trim().toLowerCase();
  return Object.entries(MEGA_STONE_TO_SPECIES)
    .filter(([, entry]) => entry.species === normalized)
    .map(([item, entry]) => ({ item, suffix: entry.suffix }));
}

const MEGA_SPECIES_SUFFIX_PATTERN = /-Mega(-[XY])?$/i;

/**
 * Showdown exports sometimes list a Mega-Evolved Pokemon's species as its Mega
 * form (e.g. "Aerodactyl-Mega") rather than the base species holding its Mega
 * Stone - Mega Evolution isn't a held/set-in-stone form the way a regional
 * variant is, it only happens in-battle, so a set built that way fails legality
 * validation (there's no such standalone species). Detects that specific shape
 * - species name ends in "-Mega"/"-Mega-X"/"-Mega-Y" AND the held item is that
 * exact base species' own Mega Stone - and returns the corrected base species
 * name; returns the species unchanged for every other case (including a "-Mega"
 * suffix with no matching stone held, which is left for team validation to flag
 * rather than silently guessed at here).
 */
export function normalizeMegaSpeciesOnImport(species: string, item: string | undefined): string {
  if (!item) return species;
  const match = species.match(MEGA_SPECIES_SUFFIX_PATTERN);
  if (!match) return species;

  const base = species.slice(0, match.index).trim();
  if (!base) return species;
  const suffix = match[1] ? `mega-${match[1].slice(1).toLowerCase()}` : 'mega';

  const entry = MEGA_STONE_TO_SPECIES[item.trim().toLowerCase()];
  if (!entry || entry.species !== base.toLowerCase() || entry.suffix !== suffix) return species;

  return base;
}
