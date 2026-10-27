/**
 * Shared pixel sprite URL builder (PokeAPI/sprites hotlink convention).
 * Basculegion/Indeedee already have distinct national dex IDs per gender
 * (see useSpeciesRoster.ts's form-level roster entries), so they must skip
 * the female/ folder path that cosmetic-only gender forms like Pikachu need.
 */
export function getPixelSpriteUrl(
  id: number,
  name: string,
  gender: string,
  shiny: boolean,
): string {
  const n = name.toLowerCase().trim();
  const s = shiny ? 'shiny/' : '';
  if (n.includes('basculegion') || n.includes('indeedee'))
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s}${id}.png`;
  if (
    gender === 'F' &&
    ['pikachu', 'eevee', 'venusaur', 'raichu', 'torchic', 'wobbuffet'].includes(n)
  )
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s}female/${id}.png`;
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
const GENDER_DIVERGENT_BASE_SPECIES: readonly string[] = [
  'basculegion',
  'indeedee',
  'meowstic',
  'oinkologne',
];

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
 * Species whose real name contains a hyphen. Their animated filename strips it
 * ("hooh.gif", "tinglu.gif" - the hyphenated spellings 404 on the CDN), so the
 * species/forme split below must not treat that hyphen as a forme separator.
 */
const HYPHENATED_BASE_SPECIES: readonly string[] = [
  'ho-oh',
  'porygon-z',
  'jangmo-o',
  'hakamo-o',
  'kommo-o',
  'nidoran-f',
  'nidoran-m',
  'wo-chien',
  'chien-pao',
  'ting-lu',
  'chi-yu',
];

/**
 * Showdown's animated filenames keep exactly one hyphen, between base species
 * and forme ("castform-snowy", "landorus-therian"), while hyphens inside the
 * forme are dropped ("charizard-mega-x" -> "charizard-megax"). Verified
 * against the live CDN; the stripped-everything id 404s for every forme.
 */
function toShowdownAnimatedId(name: string): string {
  const lower = name.toLowerCase().trim();
  const hyphenatedBase = HYPHENATED_BASE_SPECIES.find(
    (b) => lower === b || lower.startsWith(`${b}-`),
  );
  const base = hyphenatedBase ?? lower.split('-')[0];
  const forme = lower.slice(base.length + 1);
  const baseId = toShowdownSpriteId(base);
  const formeId = toShowdownSpriteId(forme);
  return formeId ? `${baseId}-${formeId}` : baseId;
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
    id = toShowdownAnimatedId(name);
  }

  return `https://play.pokemonshowdown.com/sprites/${folder}/${id}.gif`;
}

/**
 * Static "misc" UI icons hotlinked from the same Showdown sprite CDN as
 * getAnimatedSpriteUrl above (same hotlink exception) - Showdown's own
 * client's icons for "this is a Mega Evolution" and "this Pokémon is shiny"
 * respectively, reused here rather than a hand-drawn glyph. EditablePokemonCore.tsx's
 * shiny corner badge and MegaFormToggleBadge.tsx both resolve these through
 * useSpriteCache's resolveSprite() the same way every other hotlinked sprite
 * in the app does, so they get the same local-cache treatment.
 */
export const MEGA_BADGE_ICON_URL = 'https://play.pokemonshowdown.com/sprites/misc/mega.png';
export const SHINY_BADGE_ICON_URL = 'https://play.pokemonshowdown.com/sprites/misc/shiny.png';
