import { describe, it, expect } from 'vitest';
import { buildPastedTeam } from './teamPaste';
import type { ImportedPokemonInfo, Team } from '../types/pokemon';

function makePokemon(id: string): ImportedPokemonInfo {
  return {
    showdownData: {
      species: 'Gengar',
      level: 50,
      shiny: false,
      gigantamax: false,
      happiness: 255,
      evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      moves: ['Shadow Ball'],
    },
    pokedexNumber: 94,
    types: ['ghost', 'poison'],
    baseStats: { hp: 60, attack: 65, defense: 60, specialAttack: 130, specialDefense: 75, speed: 110 },
    spriteUrl: 'https://example.com/gengar.png',
    importedAt: 0,
    id,
  };
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'My Team',
    format: 'Reg M-B',
    pokemon: [makePokemon('mon-1'), makePokemon('mon-2')],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('buildPastedTeam', () => {
  it('appends " (Copy)" to the name when unused', () => {
    const pasted = buildPastedTeam(makeTeam({ name: 'Rain Team' }), ['Rain Team']);
    expect(pasted.name).toBe('Rain Team (Copy)');
  });

  it('appends " (Copy N)" once "(Copy)" is already taken, finding the smallest unused N', () => {
    const pasted = buildPastedTeam(makeTeam({ name: 'Rain Team' }), ['Rain Team', 'Rain Team (Copy)', 'Rain Team (Copy 2)']);
    expect(pasted.name).toBe('Rain Team (Copy 3)');
  });

  it('assigns a fresh team id and fresh per-slot Pokemon ids, distinct from the source', () => {
    const source = makeTeam();
    const pasted = buildPastedTeam(source, []);

    expect(pasted.id).not.toBe(source.id);
    expect(pasted.pokemon.map(p => p.id)).not.toEqual(source.pokemon.map(p => p.id));
    expect(pasted.pokemon).toHaveLength(source.pokemon.length);
    expect(new Set(pasted.pokemon.map(p => p.id)).size).toBe(pasted.pokemon.length); // no id collisions between slots either
  });

  it('resets favorite to false even when the source team was favorited', () => {
    const pasted = buildPastedTeam(makeTeam({ favorite: true }), []);
    expect(pasted.favorite).toBe(false);
  });

  it('carries over format/author/notes verbatim', () => {
    const source = makeTeam({ format: 'Reg M-C', author: 'Ash', notes: 'Bring rain' });
    const pasted = buildPastedTeam(source, []);

    expect(pasted.format).toBe('Reg M-C');
    expect(pasted.author).toBe('Ash');
    expect(pasted.notes).toBe('Bring rain');
  });
});
