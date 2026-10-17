import { describe, it, expect } from 'vitest';
import { teamMatchesSearch } from './teamSearch';
import type { ImportedPokemonInfo, Team } from '../types/pokemon';

function makePokemon(
  overrides: Partial<ImportedPokemonInfo['showdownData']> = {},
): ImportedPokemonInfo {
  return {
    showdownData: {
      species: 'Gengar',
      level: 50,
      shiny: false,
      gigantamax: false,
      happiness: 255,
      evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      moves: ['Shadow Ball'],
      ...overrides,
    },
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
    id: 'mon-1',
  };
}

function makeTeam(pokemon: ImportedPokemonInfo[]): Team {
  return {
    id: 'team-1',
    name: 'Test Team',
    format: 'Reg M-B',
    pokemon,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('teamMatchesSearch', () => {
  it('matches on a species substring, case-insensitively', () => {
    const team = makeTeam([makePokemon({ species: 'Gengar' })]);
    expect(teamMatchesSearch(team, 'gen')).toBe(true);
    expect(teamMatchesSearch(team, 'GEN')).toBe(true);
  });

  it('matches on a nickname substring, case-insensitively', () => {
    const team = makeTeam([makePokemon({ species: 'Gengar', nickname: 'Spooky' })]);
    expect(teamMatchesSearch(team, 'spook')).toBe(true);
  });

  it('matches if any roster slot matches, not just the first', () => {
    const team = makeTeam([
      makePokemon({ species: 'Gengar' }),
      makePokemon({ species: 'Dragonite' }),
    ]);
    expect(teamMatchesSearch(team, 'dragon')).toBe(true);
  });

  it('returns false when no slot matches', () => {
    const team = makeTeam([makePokemon({ species: 'Gengar' })]);
    expect(teamMatchesSearch(team, 'dragon')).toBe(false);
  });

  it("returns false against a nickname-less Pokemon for a query matching only other teams' nicknames", () => {
    const team = makeTeam([makePokemon({ species: 'Gengar' })]);
    expect(teamMatchesSearch(team, 'spooky')).toBe(false);
  });

  it('treats an empty or whitespace-only query as matching everything', () => {
    const team = makeTeam([makePokemon({ species: 'Gengar' })]);
    expect(teamMatchesSearch(team, '')).toBe(true);
    expect(teamMatchesSearch(team, '   ')).toBe(true);
  });

  it('returns false for an empty roster with a non-empty query', () => {
    const team = makeTeam([]);
    expect(teamMatchesSearch(team, 'gengar')).toBe(false);
  });
});
