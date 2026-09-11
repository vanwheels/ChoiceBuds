/**
 * Converts a lowercase-hyphenated PokeAPI slug (move/item/ability name) into
 * a human-readable display form, e.g. "sucker-punch" -> "Sucker Punch".
 *
 * Not used for species names - those stay hyphenated on purpose so they
 * round-trip through normalizeSpeciesForAPI (see useSpeciesRoster.ts).
 */
export function toReadableName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Same idea as toReadableName above, for an identifier that's already
 * space-separated rather than hyphenated - e.g. config/megaEvolution.ts's
 * MEGA_STONE_TO_SPECIES keys ("charizardite x" -> "Charizardite X"), which
 * matches config/vgcData.ts's VGC_HOLD_ITEMS casing for the same stones.
 */
export function toTitleCase(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
