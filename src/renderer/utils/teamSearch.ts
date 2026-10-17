import type { Team } from '../types/pokemon';

/**
 * Teams Tab Search Bar (see TODO.md) - true when any roster slot's species
 * or nickname (case-insensitive, substring) matches `query`. An empty/
 * whitespace-only query always matches, same "no filter active" convention
 * as BoxPage.tsx's own search input.
 */
export function teamMatchesSearch(team: Team, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized === '') return true;
  return team.pokemon.some(
    (mon) =>
      mon.showdownData.species.toLowerCase().includes(normalized) ||
      (mon.showdownData.nickname?.toLowerCase().includes(normalized) ?? false),
  );
}
