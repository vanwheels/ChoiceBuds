/**
 * Tests for profileTeamImport.ts's pure PublicTeam -> ShowdownPokemon/
 * RegulationLabel conversion, from the stated rule (Save/Import a Team
 * From a Profile's done check, see TODO.md): an imported team must match
 * the source profile team's species/moves/items/EVs/nature.
 */

import { describe, expect, it } from 'vitest';
import { buildShowdownPokemonFromPublic, resolveImportedTeamFormat } from './profileTeamImport';
import type { PublicTeam } from '../services/syncApi';

type PublicPokemon = PublicTeam['pokemon'][number];

const FULL_SET_POKEMON: PublicPokemon = {
  species: 'Incineroar',
  nickname: 'Big Cat',
  spriteUrl: 'https://example.com/incineroar.png',
  item: 'Safety Goggles',
  ability: 'Intimidate',
  level: 50,
  shiny: true,
  gigantamax: false,
  happiness: 0,
  teraType: 'Grass',
  nature: 'Careful',
  evs: { hp: 252, attack: 4, defense: 0, specialAttack: 0, specialDefense: 252, speed: 0 },
  moves: ['Fake Out', 'Parting Shot', 'Flare Blitz', 'Knock Off'],
  gender: 'M',
};

describe('buildShowdownPokemonFromPublic', () => {
  it('carries species/moves/items/EVs/nature straight through unchanged', () => {
    const result = buildShowdownPokemonFromPublic(FULL_SET_POKEMON);

    expect(result.species).toBe('Incineroar');
    expect(result.item).toBe('Safety Goggles');
    expect(result.ability).toBe('Intimidate');
    expect(result.nature).toBe('Careful');
    expect(result.evs).toEqual(FULL_SET_POKEMON.evs);
    expect(result.moves).toEqual(FULL_SET_POKEMON.moves);
    expect(result.teraType).toBe('Grass');
    expect(result.nickname).toBe('Big Cat');
    expect(result.gender).toBe('M');
    expect(result.level).toBe(50);
    expect(result.shiny).toBe(true);
    expect(result.happiness).toBe(0);
  });

  it('falls back to parser.ts-matching defaults when optional fields are missing', () => {
    const minimal: PublicPokemon = {
      species: 'Gholdengo',
      spriteUrl: 'https://example.com/gholdengo.png',
    };

    const result = buildShowdownPokemonFromPublic(minimal);

    expect(result.level).toBe(50);
    expect(result.shiny).toBe(false);
    expect(result.gigantamax).toBe(false);
    expect(result.happiness).toBe(255);
    expect(result.evs).toEqual({
      hp: 0,
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
    });
    expect(result.moves).toEqual([]);
    expect(result.gender).toBe('');
  });

  it('normalizes an unrecognized gender string to empty rather than passing it through', () => {
    const result = buildShowdownPokemonFromPublic({ ...FULL_SET_POKEMON, gender: 'bogus' });
    expect(result.gender).toBe('');
  });
});

describe('resolveImportedTeamFormat', () => {
  it('passes through a recognized RegulationLabel unchanged', () => {
    expect(resolveImportedTeamFormat('Reg M-B', 'Reg M-A')).toBe('Reg M-B');
  });

  it('falls back to the importing account default when the format is unrecognized', () => {
    expect(resolveImportedTeamFormat('Reg Z-9', 'Reg M-C')).toBe('Reg M-C');
    expect(resolveImportedTeamFormat('', 'Reg M-A')).toBe('Reg M-A');
  });
});
