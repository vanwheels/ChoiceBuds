import type { SavedPokemonEntry } from '../types/pokemon';

/**
 * Box's Alphabetical order: species, then label. Shared by BoxPage.tsx and
 * CalcBoxPanel.tsx so the two surfaces can't drift apart. Returns a new array.
 */
export function sortSavedPokemonAlphabetically(entries: SavedPokemonEntry[]): SavedPokemonEntry[] {
  return [...entries].sort((a, b) => {
    const speciesCompare = a.pokemon.showdownData.species.localeCompare(
      b.pokemon.showdownData.species,
    );
    return speciesCompare !== 0 ? speciesCompare : a.label.localeCompare(b.label);
  });
}

/**
 * Sorts Box entries so favorited ones always come first, otherwise
 * preserving each group's existing relative order - mirrors
 * teamSort.ts::sortTeams' favorite handling, just for SavedPokemonEntry
 * instead of Team (Box entries have no regulation to sort by, so there's
 * no equivalent of that function's regulation secondary key here).
 * Composed on top of BoxPage.tsx's existing sortedEntries
 * (applies after either Alphabetical or Custom ordering) - see Box Tab:
 * Favoriting in TODO.md. Returns a new array; does not mutate the input.
 */
export function sortSavedPokemonByFavorite(entries: SavedPokemonEntry[]): SavedPokemonEntry[] {
  return [...entries].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite));
}
