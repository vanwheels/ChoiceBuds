import { describe, it, expect } from 'vitest';
import { buildImportReviewRows } from './importReview';
import type { ImportedPokemonInfo, SavedPokemonEntry, ShowdownPokemon } from '../types/pokemon';

const ZERO_EVS = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

function makeShowdownPokemon(overrides: Partial<ShowdownPokemon> = {}): ShowdownPokemon {
  return {
    species: 'Gengar',
    level: 50,
    shiny: false,
    gigantamax: false,
    happiness: 255,
    evs: { ...ZERO_EVS },
    moves: ['Shadow Ball'],
    ...overrides,
  };
}

function makeSavedEntry(overrides: Partial<ImportedPokemonInfo> = {}, label = 'My Gengar'): SavedPokemonEntry {
  const pokemon: ImportedPokemonInfo = {
    showdownData: makeShowdownPokemon(),
    pokedexNumber: 94,
    types: ['ghost', 'poison'],
    baseStats: { hp: 60, attack: 65, defense: 60, specialAttack: 130, specialDefense: 75, speed: 110 },
    spriteUrl: 'https://example.com/gengar.png',
    importedAt: Date.now(),
    id: crypto.randomUUID(),
    ...overrides,
  };
  return { id: crypto.randomUUID(), label, pokemon, savedAt: Date.now(), updatedAt: Date.now() };
}

describe('buildImportReviewRows', () => {
  it('returns no rows when nothing in the paste has a saved-build match', () => {
    const parsed = [makeShowdownPokemon({ species: 'Gengar' }), makeShowdownPokemon({ species: 'Dragapult' })];
    const rows = buildImportReviewRows(parsed, () => []);
    expect(rows).toEqual([]);
  });

  it('keeps only the matched instances, preserving their original parse-array index', () => {
    const dragapult = makeShowdownPokemon({ species: 'Dragapult' });
    const gengar = makeShowdownPokemon({ species: 'Gengar' });
    const parsed = [dragapult, gengar];
    const gengarEntry = makeSavedEntry();

    const rows = buildImportReviewRows(parsed, species =>
      species === 'Gengar' ? [gengarEntry] : []
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].index).toBe(1); // Dragapult (unmatched, index 0) is dropped - Gengar keeps its real index 1
    expect(rows[0].pokemon).toBe(gengar);
    expect(rows[0].matches).toEqual([gengarEntry]);
  });

  it('gives a duplicate species independent rows, each with its own index and matches', () => {
    const first = makeShowdownPokemon({ species: 'Gengar', shiny: false });
    const second = makeShowdownPokemon({ species: 'Gengar', shiny: true });
    const entry = makeSavedEntry();

    const rows = buildImportReviewRows([first, second], () => [entry]);

    expect(rows).toHaveLength(2);
    expect(rows.map(r => r.index)).toEqual([0, 1]);
    expect(rows[0].pokemon).toBe(first);
    expect(rows[1].pokemon).toBe(second);
  });

  it('passes each row multiple matches through unmodified, in lookup order', () => {
    const parsed = [makeShowdownPokemon({ species: 'Gengar' })];
    const entryA = makeSavedEntry({}, 'Gengar A');
    const entryB = makeSavedEntry({}, 'Gengar B');

    const rows = buildImportReviewRows(parsed, () => [entryA, entryB]);

    expect(rows[0].matches).toEqual([entryA, entryB]);
  });
});
