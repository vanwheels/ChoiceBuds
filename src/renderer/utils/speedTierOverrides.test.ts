/**
 * Test suite for the Team Preview Strip's scratch-state data layer - pure/
 * side-effect-free, same no-mocking convention as speedTiers.test.ts.
 */
import { describe, expect, it } from 'vitest';
import type { ImportedPokemonInfo } from '../types/pokemon';
import { applySpeedOverride, defaultSpeedOverride, patchPokemonWithOverride } from './speedTierOverrides';

function teamPokemon(overrides: Partial<ImportedPokemonInfo['showdownData']> = {}): ImportedPokemonInfo {
  return {
    showdownData: {
      species: 'Charizard',
      item: '',
      ability: 'Blaze',
      level: 50,
      shiny: false,
      gigantamax: false,
      happiness: 255,
      nature: 'Timid',
      evs: { hp: 0, attack: 0, defense: 0, specialAttack: 4, specialDefense: 0, speed: 20 },
      moves: [],
      ...overrides,
    },
    pokedexNumber: 6,
    types: ['fire', 'flying'],
    baseStats: { hp: 78, attack: 84, defense: 78, specialAttack: 109, specialDefense: 85, speed: 100 },
    spriteUrl: 'https://example.com/charizard.png',
    importedAt: 0,
    id: 'test-id',
  };
}

describe('defaultSpeedOverride', () => {
  it('reproduces the pokemon\'s own real Speed SP/nature/species', () => {
    const override = defaultSpeedOverride(teamPokemon());
    expect(override).toEqual({ spSpeed: 20, nature: 'Timid', species: 'Charizard' });
  });

  it('falls back to Hardy when no nature is set', () => {
    const override = defaultSpeedOverride(teamPokemon({ nature: undefined }));
    expect(override.nature).toBe('Hardy');
  });
});

describe('applySpeedOverride', () => {
  it('returns the pokemon unchanged when there is no override', () => {
    const pokemon = teamPokemon();
    expect(applySpeedOverride(pokemon, undefined)).toBe(pokemon);
  });

  it('folds species/nature/Speed-SP into a copy of showdownData', () => {
    const pokemon = teamPokemon();
    const result = applySpeedOverride(pokemon, { spSpeed: 32, nature: 'Jolly', species: 'Charizard' });
    expect(result.showdownData.evs.speed).toBe(32);
    expect(result.showdownData.nature).toBe('Jolly');
    expect(result.showdownData.species).toBe('Charizard');
    // Every other EV stays untouched - only Speed is overridden.
    expect(result.showdownData.evs.specialAttack).toBe(4);
  });

  it('forces the fixed Mega ability when toggled into a curated Mega forme', () => {
    const pokemon = teamPokemon();
    const result = applySpeedOverride(pokemon, { spSpeed: 20, nature: 'Timid', species: 'Charizard-Mega-Y' });
    expect(result.showdownData.ability).toBe('Drought');
  });

  it('keeps the real ability for a non-Mega forme toggle', () => {
    const pokemon = teamPokemon();
    const result = applySpeedOverride(pokemon, { spSpeed: 20, nature: 'Timid', species: 'Charizard' });
    expect(result.showdownData.ability).toBe('Blaze');
  });
});

describe('patchPokemonWithOverride', () => {
  it('folds Speed-SP/nature into a copy of showdownData, leaving every other field untouched', () => {
    const pokemon = teamPokemon();
    const result = patchPokemonWithOverride(pokemon, { spSpeed: 32, nature: 'Jolly', species: 'Charizard-Mega-Y' });
    expect(result.showdownData.evs.speed).toBe(32);
    expect(result.showdownData.nature).toBe('Jolly');
    // Every other EV, and species/ability, stay untouched - the override's
    // species is deliberately ignored (form stays preview-only, see this
    // file's header).
    expect(result.showdownData.evs.specialAttack).toBe(4);
    expect(result.showdownData.species).toBe('Charizard');
    expect(result.showdownData.ability).toBe('Blaze');
  });

  it('does not mutate the original pokemon', () => {
    const pokemon = teamPokemon();
    patchPokemonWithOverride(pokemon, { spSpeed: 32, nature: 'Jolly', species: 'Charizard' });
    expect(pokemon.showdownData.evs.speed).toBe(20);
    expect(pokemon.showdownData.nature).toBe('Timid');
  });
});
