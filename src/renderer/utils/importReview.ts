/**
 * importReview.ts - ImportTeamModal.tsx's Saved-Build Review Row Builder
 * Pure helper split out of ImportTeamModal.tsx (Saved Builds Database for
 * Team-Building Leg 2, see TODO.md) so the one non-trivial piece of new
 * logic - matching parsed Pokémon instances against the saved-build library
 * while preserving each row's original parse-array index - gets a unit test
 * without standing up component-render test infrastructure this codebase
 * doesn't otherwise have yet (see CLAUDE.md's Commands section: coverage is
 * pure services/utils functions first, then simpler hooks - no components).
 */

import type { ShowdownPokemon, SavedPokemonEntry } from '../types/pokemon';

export interface ImportReviewRow {
  /** Index into the full parsed-Pokémon array this row represents - not a dense 0..n index, since only matched rows are kept. */
  index: number;
  pokemon: ShowdownPokemon;
  matches: SavedPokemonEntry[];
}

/**
 * One row per parsed Pokémon *instance* with 1+ saved build matching its
 * species - not per unique species name, so a duplicate species in the same
 * paste gets independent rows, each free to pick differently. Pokémon with
 * zero matches are dropped entirely (ImportTeamModal treats an empty result
 * as "skip the review step").
 */
export function buildImportReviewRows(
  parsedPokemon: ShowdownPokemon[],
  getSavedSetsForSpecies: (species: string) => SavedPokemonEntry[]
): ImportReviewRow[] {
  return parsedPokemon
    .map((pokemon, index) => ({ index, pokemon, matches: getSavedSetsForSpecies(pokemon.species) }))
    .filter(row => row.matches.length > 0);
}
