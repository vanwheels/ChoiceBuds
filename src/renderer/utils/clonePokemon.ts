/**
 * clonePokemon.ts - Deep-Clone-With-Fresh-Id Helper
 * Was private to useRosterActions.ts (Saved Builds Database for
 * Team-Building Leg 1, see TODO.md) - moved here shared since Leg 2's
 * ImportTeamModal.tsx needs the exact same clone when a parsed import slot
 * picks a saved build instead of the freshly-parsed Showdown text.
 */

import type { ImportedPokemonInfo } from '../types/pokemon';

/**
 * Deep-clones a saved-set's stored ImportedPokemonInfo for placement into a
 * live roster slot, assigning a fresh id/importedAt rather than reusing the
 * saved entry's own - the same saved set can be loaded into multiple slots
 * (or the same slot twice), and `id` is this app's stable per-roster-slot
 * React key (see types/pokemon.ts's ImportedPokemonInfo.id comment), so
 * reusing it here would collide the moment the same saved set is loaded
 * twice into one team.
 */
export function cloneSavedPokemon(pokemon: ImportedPokemonInfo): ImportedPokemonInfo {
  return {
    showdownData: {
      ...pokemon.showdownData,
      evs: { ...pokemon.showdownData.evs },
      moves: [...pokemon.showdownData.moves],
    },
    pokedexNumber: pokemon.pokedexNumber,
    types: [...pokemon.types],
    baseStats: { ...pokemon.baseStats },
    spriteUrl: pokemon.spriteUrl,
    calculatedStats: pokemon.calculatedStats ? { ...pokemon.calculatedStats } : undefined,
    importedAt: Date.now(),
    id: crypto.randomUUID(),
  };
}
