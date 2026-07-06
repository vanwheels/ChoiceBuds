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
