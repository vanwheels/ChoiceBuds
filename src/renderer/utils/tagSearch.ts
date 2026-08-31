/**
 * Shared '#tag' search-filter convention used by the species/item/move
 * pickers: search text starting with '#' is treated as an exact
 * category/type tag lookup instead of a substring name match.
 */
export function parseTagFilter(search: string): string | null {
  const trimmed = search.trim();
  if (!trimmed.startsWith('#')) return null;
  return trimmed.slice(1).trim().toLowerCase();
}

/**
 * Multi-tag variant used by the species picker (see SpeciesPickerCard.tsx),
 * which ANDs several '#tag's together in one search, e.g.
 * '#fire #shadowclaw #flashfire'. Tags are split on '#' rather than
 * whitespace, since a single tag's own text can contain spaces (a move/
 * ability name like '#dragon dance') - each '#' starts a new tag that runs
 * until the next '#'. Returns [] when search doesn't start with '#' at all.
 */
export function parseTagFilters(search: string): string[] {
  const trimmed = search.trim();
  if (!trimmed.startsWith('#')) return [];
  return trimmed.split('#').slice(1).map(tag => tag.trim().toLowerCase());
}
