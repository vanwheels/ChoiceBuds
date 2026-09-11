import { describe, it, expect } from 'vitest';
import { sortSavedPokemonByFavorite } from './savedPokemonSort';
import type { ImportedPokemonInfo, SavedPokemonEntry, ShowdownPokemon } from '../types/pokemon';

const ZERO_EVS = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

function makePokemon(): ImportedPokemonInfo {
  const showdownData: ShowdownPokemon = {
    species: 'Gengar',
    level: 50,
    shiny: false,
    gigantamax: false,
    happiness: 255,
    evs: { ...ZERO_EVS },
    moves: ['Shadow Ball'],
  };
  return {
    showdownData,
    pokedexNumber: 94,
    types: ['ghost', 'poison'],
    baseStats: { hp: 60, attack: 65, defense: 60, specialAttack: 130, specialDefense: 75, speed: 110 },
    spriteUrl: 'https://example.com/gengar.png',
    importedAt: Date.now(),
    id: crypto.randomUUID(),
  };
}

function makeEntry(overrides: Partial<SavedPokemonEntry> = {}): SavedPokemonEntry {
  return {
    id: 'entry-1',
    label: 'Test Entry',
    pokemon: makePokemon(),
    savedAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('sortSavedPokemonByFavorite', () => {
  it('moves favorited entries to the top', () => {
    const entries = [
      makeEntry({ id: 'a' }),
      makeEntry({ id: 'b', favorite: true }),
      makeEntry({ id: 'c' }),
    ];

    expect(sortSavedPokemonByFavorite(entries).map(e => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('preserves relative order within the favorited and unfavorited groups', () => {
    const entries = [
      makeEntry({ id: 'a' }),
      makeEntry({ id: 'b', favorite: true }),
      makeEntry({ id: 'c' }),
      makeEntry({ id: 'd', favorite: true }),
    ];

    expect(sortSavedPokemonByFavorite(entries).map(e => e.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('does not mutate the input array', () => {
    const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b', favorite: true })];
    const original = [...entries];

    sortSavedPokemonByFavorite(entries);

    expect(entries).toEqual(original);
  });

  it('is a no-op when no entries are favorited', () => {
    const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })];

    expect(sortSavedPokemonByFavorite(entries).map(e => e.id)).toEqual(['a', 'b']);
  });
});
