/**
 * teamPaste.ts - Pasted-Team Object Construction
 * Shared by TeamCard.tsx's per-card "Paste as New Team" and TeamsPage.tsx's
 * anywhere-in-empty-space paste (Quick Copy/Paste Pokémon & Teams via
 * Right-Click Leg 2, see TODO.md) - both build the exact same kind of "new
 * team from a clipboard-copied one" object, just from different trigger
 * points, so the construction logic lives here once instead of twice.
 */

import type { Team } from '../types/pokemon';

/**
 * "Team Name" -> "Team Name (Copy)" -> "Team Name (Copy 2)"... - distinct
 * from useSavedPokemon.ts's nextAvailableLabel/ImportTeamModal.tsx's
 * nextGenericTeamName (both only disambiguate a name that already collides);
 * this always appends "(Copy)" regardless of whether the original name is
 * otherwise unique, since the point of a paste is telling it apart from the
 * team it came from, not just avoiding a collision.
 */
function nextPastedTeamName(baseName: string, existingNames: string[]): string {
  const taken = new Set(existingNames);
  const first = `${baseName} (Copy)`;
  if (!taken.has(first)) return first;
  let n = 2;
  while (taken.has(`${baseName} (Copy ${n})`)) n++;
  return `${baseName} (Copy ${n})`;
}

/**
 * Builds a brand-new Team from a clipboard-pasted one: fresh id/createdAt/
 * updatedAt for the team and a fresh id per roster slot (so nothing
 * collides with the copy still sitting on the clipboard, or a second paste
 * of the same copy), a disambiguated name (see nextPastedTeamName above),
 * and `favorite` explicitly reset - a pasted team is new and hasn't been
 * favorited by the user yet, even if the team it was copied from was.
 */
export function buildPastedTeam(pasted: Team, existingTeamNames: string[]): Team {
  return {
    ...pasted,
    id: crypto.randomUUID(),
    name: nextPastedTeamName(pasted.name, existingTeamNames),
    pokemon: pasted.pokemon.map(p => ({ ...p, id: crypto.randomUUID() })),
    favorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
