/**
 * Shared pixel sprite URL builder (PokeAPI/sprites hotlink convention).
 * Basculegion/Indeedee already have distinct national dex IDs per gender
 * (see useSpeciesRoster.ts's form-level roster entries), so they must skip
 * the female/ folder path that cosmetic-only gender forms like Pikachu need.
 */
export function getPixelSpriteUrl(id: number, name: string, gender: string, shiny: boolean): string {
  const n = name.toLowerCase().trim();
  const s = shiny ? 'shiny/' : '';
  if (n.includes('basculegion') || n.includes('indeedee')) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s}${id}.png`;
  if (gender === 'F' && ['pikachu', 'eevee', 'venusaur', 'raichu', 'torchic', 'wobbuffet'].includes(n)) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s}female/${id}.png`;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s}${id}.png`;
}

/**
 * Species base names that resolve to two entirely distinct Showdown sprite
 * IDs by gender rather than one shared ID (mirrors normalizeSpeciesForAPI's
 * gender-divergent list in services/pokeapi.ts, but the *output* shape is
 * different: Showdown's default/male ID has no suffix at all, and the female
 * form's own ID just appends "f" - there's no "-female"/"-male" convention
 * on this CDN the way PokeAPI has one).
 */
const GENDER_DIVERGENT_BASE_SPECIES: readonly string[] = ['basculegion', 'indeedee', 'meowstic', 'oinkologne'];

/**
 * Showdown's own internal ID scheme (what its client calls `toID()`):
 * lowercase, every non-alphanumeric character stripped. This is also
 * literally the sprite CDN's filename convention - regional forms, Megas,
 * and punctuation-bearing names (Farfetch'd -> farfetchd, Ho-Oh -> hooh,
 * Type: Null -> typenull) all fall out of this one mechanical rule with no
 * exception table needed; confirmed against this app's own already-ASCII
 * species strings (e.g. "Nidoran-F", "Flabebe" - see config/pokemonRules.ts)
 * and Showdown's real sprite filenames per CLAUDE.md's research rule.
 */
function toShowdownSpriteId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Animated (GIF) sprite URL builder for Showdown's sprite CDN - used only by
 * PokemonCard.tsx's main sprite when the "Show Animated Sprites" setting is
 * on (see CLAUDE.md's hotlink-exception #5). `name` can be either a bare/
 * form-suffixed species name ("Basculegion", "Basculegion-F",
 * "Landorus-Therian") or a Mega API slug ("charizard-mega-x") - the latter
 * never collides with the gender-divergent species below, so one function
 * covers both PokemonCard call sites (base sprite and Mega-form sprite).
 */
export function getAnimatedSpriteUrl(name: string, gender: string, shiny: boolean): string {
  const nameLower = name.toLowerCase().trim();
  const baseSpecies = nameLower.split('-')[0];
  const folder = shiny ? 'ani-shiny' : 'ani';

  let id: string;
  if (GENDER_DIVERGENT_BASE_SPECIES.includes(baseSpecies)) {
    const isFemale = gender === 'F' || nameLower.endsWith('-f') || nameLower.endsWith('-female');
    id = isFemale ? `${baseSpecies}f` : baseSpecies;
  } else {
    id = toShowdownSpriteId(name);
  }

  return `https://play.pokemonshowdown.com/sprites/${folder}/${id}.gif`;
}
