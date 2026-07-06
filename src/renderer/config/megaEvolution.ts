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
  'floettite': { species: 'floette', suffix: 'mega' },
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
