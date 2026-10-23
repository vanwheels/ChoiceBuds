import { describe, it, expect } from 'vitest';
import { reconcileSyncedSavedPokemon } from './savedPokemonSyncReconciliation';
import type { ImportedPokemonInfo, SavedPokemonEntry, ShowdownPokemon } from '../types/pokemon';

const ZERO_EVS = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

function makePokemon(overrides: Partial<ShowdownPokemon> = {}): ImportedPokemonInfo {
  const showdownData: ShowdownPokemon = {
    species: 'Gengar',
    level: 50,
    shiny: false,
    gigantamax: false,
    happiness: 255,
    evs: { ...ZERO_EVS },
    moves: ['Shadow Ball'],
    ...overrides,
  };
  return {
    showdownData,
    pokedexNumber: 94,
    types: ['ghost', 'poison'],
    baseStats: {
      hp: 60,
      attack: 65,
      defense: 60,
      specialAttack: 130,
      specialDefense: 75,
      speed: 110,
    },
    spriteUrl: 'https://example.com/gengar.png',
    importedAt: 0,
    id: 'pokemon-1',
  };
}

function makeEntry(overrides: Partial<SavedPokemonEntry> = {}): SavedPokemonEntry {
  return {
    id: 'entry-1',
    label: 'Test Entry',
    pokemon: makePokemon(),
    savedAt: 0,
    updatedAt: 1000,
    ...overrides,
  };
}

describe('reconcileSyncedSavedPokemon', () => {
  it('normalizes a legacy-shaped remote entry that wins a merge over a local entry', () => {
    const local = makeEntry({ id: 'a', updatedAt: 1000 });
    const remote = makeEntry({
      id: 'a',
      updatedAt: 2000,
      pokemon: makePokemon({ species: 'indeedee-female' }),
    });

    const result = reconcileSyncedSavedPokemon([local], [], [remote], []);

    expect(result.entries[0].pokemon.showdownData.species).toBe('Indeedee-F');
    expect(result.entries[0].updatedAt).toBeGreaterThan(2000);
  });

  it('normalizes a legacy-shaped remote entry appended as new (no local copy yet)', () => {
    const remote = makeEntry({
      id: 'new',
      updatedAt: 2000,
      pokemon: makePokemon({ species: 'meowstic-male' }),
    });

    const result = reconcileSyncedSavedPokemon([], [], [remote], []);

    expect(result.entries[0].pokemon.showdownData.species).toBe('Meowstic');
    expect(result.entries[0].updatedAt).toBeGreaterThan(2000);
  });

  it('keeps the local entry untouched when local wins', () => {
    const local = makeEntry({ id: 'a', updatedAt: 3000 });
    const remote = makeEntry({
      id: 'a',
      updatedAt: 2000,
      pokemon: makePokemon({ species: 'indeedee-female' }),
    });

    const result = reconcileSyncedSavedPokemon([local], [], [remote], []);

    expect(result.entries[0]).toBe(local);
  });
});
