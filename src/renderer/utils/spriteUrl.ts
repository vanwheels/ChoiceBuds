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
