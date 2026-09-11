import type { SavedPokemonEntry } from '../types/pokemon';

/**
 * Sorts Box entries so favorited ones always come first, otherwise
 * preserving each group's existing relative order - mirrors
 * teamSort.ts::sortTeamsByFavorite exactly, just for SavedPokemonEntry
 * instead of Team. Composed on top of BoxPage.tsx's existing sortedEntries
 * (applies after either Alphabetical or Custom ordering) - see Box Tab:
 * Favoriting in TODO.md. Returns a new array; does not mutate the input.
 */
export function sortSavedPokemonByFavorite(entries: SavedPokemonEntry[]): SavedPokemonEntry[] {
  return [...entries].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite));
}
