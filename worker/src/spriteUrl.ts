/**
 * Worker-side port of src/renderer/utils/spriteUrl.ts's getPixelSpriteUrl -
 * hand-duplicated rather than shared, same "separate build targets, no
 * shared package" reasoning as safetyFilter.ts/USERNAME_PATTERN (see root
 * CLAUDE.md's external-data-sources.md). Needed here because
 * publicProfile.ts's extractPublicPokemon used to just forward a stored
 * `ImportedPokemonInfo.spriteUrl` field straight through to GET
 * /profile/:username - that field is a static value captured once at
 * import time and was never shiny-aware (every real on-screen card in the
 * renderer recomputes the sprite URL live via this same function instead
 * of reading that stored field), so a public profile never showed a
 * shiny sprite even when the Pokemon's own `shiny` flag was true.
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
