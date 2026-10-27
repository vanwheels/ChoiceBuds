import type { Team } from '../types/pokemon';

/**
 * Lowercases and drops everything but letters/digits, so 'Landorus-Therian',
 * 'landorus therian', 'Mr. Mime' and 'mr mime' compare equal. Not
 * `tagChipMatch.ts`'s `normalizeChipText`: that one keeps periods and
 * apostrophes, which species names like "Mr. Mime" and "Farfetch'd" contain.
 */
function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

/**
 * Teams Tab Search Bar (see TODO.md) - true when any roster slot's species
 * or nickname (case-insensitive, substring, ignoring spaces/hyphens/
 * punctuation) matches `query`. An empty/separators-only query always
 * matches, same "no filter active" convention as BoxPage.tsx's own search
 * input.
 */
export function teamMatchesSearch(team: Team, query: string): boolean {
  const normalized = normalizeSearchText(query);
  if (normalized === '') return true;
  return team.pokemon.some(
    (mon) =>
      normalizeSearchText(mon.showdownData.species).includes(normalized) ||
      (mon.showdownData.nickname
        ? normalizeSearchText(mon.showdownData.nickname).includes(normalized)
        : false),
  );
}
