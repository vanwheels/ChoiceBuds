/**
 * Team Validation - Pure Rule Checks for the "Validate Team" Button
 * Every check reads directly off `Team.pokemon`, which is now kept in sync
 * with in-progress edits (item/ability/move/EV/nickname all persist
 * immediately - see PokemonCard.tsx's updateShowdownData), so this always
 * validates what's actually on screen, not stale imported data.
 */

import type { Team } from '../types/pokemon';
import { validateSpeciesLegality, getRegulationLabel, type RegulationId } from './pokemonRules';
import { normalizeSlug } from './pokemonRules';

const MAX_NICKNAME_LENGTH = 12;

export interface TeamValidationResult {
  valid: boolean;
  issues: string[];
}

function label(nickname: string | undefined, species: string): string {
  return nickname ? `${nickname} (${species})` : species;
}

export function validateTeam(team: Team, rulesetId: RegulationId): TeamValidationResult {
  const issues: string[] = [];
  const regLabel = getRegulationLabel(rulesetId);

  team.pokemon.forEach(({ showdownData }) => {
    const who = label(showdownData.nickname, showdownData.species);

    if (showdownData.nickname && showdownData.nickname.length > MAX_NICKNAME_LENGTH) {
      issues.push(`${who}: nickname is longer than ${MAX_NICKNAME_LENGTH} characters`);
    }

    const setMoves = showdownData.moves.filter(Boolean);
    const uniqueMoves = new Set(setMoves.map(m => m.toLowerCase()));
    if (uniqueMoves.size !== setMoves.length) {
      issues.push(`${who}: has the same move in more than one slot`);
    }

    if (!validateSpeciesLegality(showdownData.species, rulesetId)) {
      issues.push(`${who}: not legal in ${regLabel}`);
    }
  });

  const speciesSeen = new Map<string, string[]>();
  team.pokemon.forEach(({ showdownData }) => {
    const key = normalizeSlug(showdownData.species);
    const who = label(showdownData.nickname, showdownData.species);
    speciesSeen.set(key, [...(speciesSeen.get(key) ?? []), who]);
  });
  for (const [, whos] of speciesSeen) {
    if (whos.length > 1) {
      issues.push(`Duplicate Pokémon: ${whos.join(', ')} are the same species`);
    }
  }

  return { valid: issues.length === 0, issues };
}
