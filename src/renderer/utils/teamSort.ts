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
 * regulation newest-first, otherwise preserving each group's existing
 * relative order (the drag-reorder position useTeams.ts's setTeamOrder
 * persists) - see Favorite Teams and Teams List Regulation Sort in
 * TODO.md/COMPLETED.md. Returns a new array; does not mutate the input.
 */
export function sortTeams(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    const favoriteDiff = Number(!!b.favorite) - Number(!!a.favorite);
    if (favoriteDiff !== 0) return favoriteDiff;
    return regulationRank(b.format) - regulationRank(a.format);
  });
}
