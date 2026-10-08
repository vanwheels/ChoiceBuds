import type { Team } from '../types/pokemon';

/**
 * Regulation display/chronological order, oldest first - same list as
 * TeamsPage.tsx's filterButtons / VgcPasteCatalogModal.tsx's REGULATIONS.
 * sortTeams below reverses this (newest first) for its secondary sort key.
 */
const REGULATION_ORDER: readonly string[] = ['Reg M-A', 'Reg M-B', 'Reg M-C'];

function regulationRank(format: string): number {
  const index = REGULATION_ORDER.indexOf(format);
  return index === -1 ? REGULATION_ORDER.length : index;
}

/**
 * Sorts teams: favorited teams first (across every regulation), then by
 * regulation newest-first, then by each team's own `sortOrder` (ascending -
 * see that field's doc comment in types/pokemon.ts for why drag-reorder
 * position lives there instead of just this array's element order),
 * otherwise falling back to the existing relative order for teams that
 * don't have a `sortOrder` yet - see Favorite Teams and Teams List
 * Regulation Sort in TODO.md/COMPLETED.md. Returns a new array; does not
 * mutate the input.
 */
export function sortTeams(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    const favoriteDiff = Number(!!b.favorite) - Number(!!a.favorite);
    if (favoriteDiff !== 0) return favoriteDiff;
    const regulationDiff = regulationRank(b.format) - regulationRank(a.format);
    if (regulationDiff !== 0) return regulationDiff;
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) return a.sortOrder - b.sortOrder;
    return 0;
  });
}
