import { describe, it, expect } from 'vitest';
import { normalizeIncomingSyncSavedPokemonEntry } from './savedPokemonMigrations';
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

describe('normalizeIncomingSyncSavedPokemonEntry', () => {
  it('fixes a legacy gender-split-resource species and bumps updatedAt so the fix can out-rank the stale sender', () => {
    const raw = makeEntry({
      pokemon: makePokemon({ species: 'indeedee-female' }),
      updatedAt: 1000,
    });

    const result = normalizeIncomingSyncSavedPokemonEntry(raw);

    expect(result.pokemon.showdownData.species).toBe('Indeedee-F');
    expect(result.updatedAt).toBeGreaterThan(1000);
  });

  it('leaves updatedAt untouched when normalization is a no-op', () => {
    const raw = makeEntry({ updatedAt: 1000 });

    const result = normalizeIncomingSyncSavedPokemonEntry(raw);

    expect(result.updatedAt).toBe(1000);
  });
});
