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
