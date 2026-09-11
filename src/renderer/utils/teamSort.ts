import type { Team } from '../types/pokemon';

/**
 * Sorts teams so favorited teams always come first, otherwise preserving
 * each group's existing relative order (the drag-reorder position
 * useTeams.ts's reorderTeam persists) - see Favorite Teams in TODO.md.
 * Returns a new array; does not mutate the input.
 */
export function sortTeamsByFavorite(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite));
}
