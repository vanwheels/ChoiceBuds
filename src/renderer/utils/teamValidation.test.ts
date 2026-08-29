import { describe, it, expect } from 'vitest';
import { validateTeam } from './teamValidation';
import type { Team, ImportedPokemonInfo, ShowdownPokemon } from '../types/pokemon';

const ZERO_EVS = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

function makeShowdownPokemon(overrides: Partial<ShowdownPokemon> = {}): ShowdownPokemon {
  return {
    species: 'Gengar',
    level: 50,
    shiny: false,
    gigantamax: false,
    happiness: 255,
    evs: { ...ZERO_EVS },
    moves: ['Shadow Ball', 'Sludge Bomb', 'Protect', 'Taunt'],
    ...overrides,
  };
}

function makePokemon(overrides: Partial<ShowdownPokemon> = {}): ImportedPokemonInfo {
  return {
    showdownData: makeShowdownPokemon(overrides),
    pokedexNumber: 94,
    types: ['ghost', 'poison'],
    baseStats: { hp: 60, attack: 65, defense: 60, specialAttack: 130, specialDefense: 75, speed: 110 },
    spriteUrl: 'https://example.com/gengar.png',
    importedAt: Date.now(),
  };
}

function makeFullLegalTeam(): Team {
  // 6 distinct, Reg M-B-legal species (Showdown's own Proper-Case convention -
  // validateSpeciesLegality normalizes internally, but display labels use
  // this text as-is), distinct items, no duplicate moves
  const species = ['Gengar', 'Gholdengo', 'Garchomp', 'Incineroar', 'Primarina', 'Sylveon'];
  const items = ['life-orb', 'choice-scarf', 'rocky-helmet', 'sitrus-berry', 'leftovers', 'safety-goggles'];
  return {
    id: 'team-1',
    name: 'Test Team',
    format: 'Reg M-B',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pokemon: species.map((s, i) => makePokemon({ species: s, item: items[i] })),
  };
}

describe('validateTeam', () => {
  it('has no issues for a fully legal, 6-Pokemon, no-clash team', () => {
    const result = validateTeam(makeFullLegalTeam(), 'REG-MB');
    expect(result).toEqual({ valid: true, issues: [] });
  });

  it('flags a team with fewer than 6 Pokemon', () => {
    const team = makeFullLegalTeam();
    team.pokemon = team.pokemon.slice(0, 4);
    const result = validateTeam(team, 'REG-MB');
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Team has only 4 Pokémon (6 required)');
  });

  it('flags a nickname longer than 12 characters, labeling by nickname (species)', () => {
    const team = makeFullLegalTeam();
    team.pokemon[0] = makePokemon({ species: 'Gengar', item: 'life-orb', nickname: 'ReallyLongNickname' });
    const result = validateTeam(team, 'REG-MB');
    expect(result.issues).toContain('ReallyLongNickname (Gengar): nickname is longer than 12 characters');
  });

  it('flags the same move used in more than one slot', () => {
    const team = makeFullLegalTeam();
    team.pokemon[0] = makePokemon({
      species: 'Gengar', item: 'life-orb',
      moves: ['Shadow Ball', 'Shadow Ball', 'Protect', 'Taunt'],
    });
    const result = validateTeam(team, 'REG-MB');
    expect(result.issues).toContain('Gengar: has the same move in more than one slot');
  });

  it('detects duplicate moves case-insensitively', () => {
    const team = makeFullLegalTeam();
    team.pokemon[0] = makePokemon({
      species: 'Gengar', item: 'life-orb',
      moves: ['shadow ball', 'Shadow Ball', 'Protect', 'Taunt'],
    });
    const result = validateTeam(team, 'REG-MB');
    expect(result.issues).toContain('Gengar: has the same move in more than one slot');
  });

  it('flags a species not legal in the given regulation', () => {
    const team = makeFullLegalTeam();
    team.pokemon[0] = makePokemon({ species: 'Gholdengo', item: 'life-orb' });
    const result = validateTeam(team, 'REG-MA'); // Gholdengo is Reg M-B only
    expect(result.issues).toContain('Gholdengo: not legal in Reg M-A');
  });

  it('flags two Pokemon of the same species (Species Clause)', () => {
    const team = makeFullLegalTeam();
    team.pokemon[1] = makePokemon({ species: 'Gengar', item: 'choice-scarf' });
    const result = validateTeam(team, 'REG-MB');
    expect(result.issues).toContain('Duplicate Pokémon: Gengar, Gengar are the same species');
  });

  it('flags two Pokemon holding the same item (Item Clause)', () => {
    const team = makeFullLegalTeam();
    team.pokemon[1] = makePokemon({ species: 'Gholdengo', item: 'life-orb' });
    const result = validateTeam(team, 'REG-MB');
    expect(result.issues).toContain('Item Clause: Gengar, Gholdengo are holding the same item');
  });

  it('does not flag two Pokemon with no item at all as an Item Clause violation', () => {
    const team = makeFullLegalTeam();
    team.pokemon[0] = makePokemon({ species: 'Gengar', item: undefined });
    team.pokemon[1] = makePokemon({ species: 'Gholdengo', item: undefined });
    const result = validateTeam(team, 'REG-MB');
    expect(result.issues.some(i => i.startsWith('Item Clause'))).toBe(false);
  });

  it('labels a species-clause duplicate by nickname when set', () => {
    const team = makeFullLegalTeam();
    team.pokemon[0] = makePokemon({ species: 'Gengar', item: 'life-orb', nickname: 'Ghosty' });
    team.pokemon[1] = makePokemon({ species: 'Gengar', item: 'choice-scarf' });
    const result = validateTeam(team, 'REG-MB');
    expect(result.issues).toContain('Duplicate Pokémon: Ghosty (Gengar), Gengar are the same species');
  });
});
