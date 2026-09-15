import { describe, it, expect } from 'vitest';
import { teamPokemonToCalcUpdates, realSetBundleToCalcUpdates } from './calcTeamImport';
import type { ImportedPokemonInfo, ShowdownPokemon, VgcRealSetBundle } from '../types/pokemon';

const ZERO_EVS = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

function makePokemon(sdOverrides: Partial<ShowdownPokemon> = {}): ImportedPokemonInfo {
  return {
    showdownData: {
      species: 'Gengar',
      level: 50,
      shiny: false,
      gigantamax: false,
      happiness: 255,
      evs: { ...ZERO_EVS },
      moves: ['Shadow Ball', 'Sludge Bomb', 'Protect', 'Taunt'],
      ...sdOverrides,
    },
    pokedexNumber: 94,
    types: ['ghost', 'poison'],
    baseStats: { hp: 60, attack: 65, defense: 60, specialAttack: 130, specialDefense: 75, speed: 110 },
    spriteUrl: 'https://example.com/gengar.png',
    importedAt: Date.now(),
    id: crypto.randomUUID(),
  };
}

describe('teamPokemonToCalcUpdates', () => {
  it('maps evs directly into sps with no scale conversion', () => {
    const p = makePokemon({ evs: { hp: 4, attack: 0, defense: 4, specialAttack: 20, specialDefense: 6, speed: 32 } });
    const result = teamPokemonToCalcUpdates(p);
    expect(result.sps).toEqual({ hp: 4, atk: 0, def: 4, spa: 20, spd: 6, spe: 32 });
  });

  it('pads the move list to exactly 4 slots, filling missing ones with empty strings', () => {
    const p = makePokemon({ moves: ['Shadow Ball', 'Sludge Bomb'] });
    const result = teamPokemonToCalcUpdates(p);
    expect(result.moves).toEqual([
      { name: 'Shadow Ball', isCrit: false },
      { name: 'Sludge Bomb', isCrit: false },
      { name: '', isCrit: false },
      { name: '', isCrit: false },
    ]);
  });

  it('defaults level to 50 when unset (falsy)', () => {
    const p = makePokemon({ level: 0 });
    expect(teamPokemonToCalcUpdates(p).level).toBe(50);
  });

  it('defaults nature to Hardy when unset', () => {
    const p = makePokemon({ nature: undefined });
    expect(teamPokemonToCalcUpdates(p).nature).toBe('Hardy');
  });

  it('defaults item/ability to empty string when unset', () => {
    const p = makePokemon({ item: undefined, ability: undefined });
    const result = teamPokemonToCalcUpdates(p);
    expect(result.item).toBe('');
    expect(result.ability).toBe('');
  });

  it('passes through a valid M/F/N gender', () => {
    const p = makePokemon({ gender: 'F' });
    expect(teamPokemonToCalcUpdates(p).gender).toBe('F');
  });

  it('normalizes an empty-string gender to empty string (not a crash)', () => {
    const p = makePokemon({ gender: '' });
    expect(teamPokemonToCalcUpdates(p).gender).toBe('');
  });

  it('starts every boost stage at zero regardless of input', () => {
    const result = teamPokemonToCalcUpdates(makePokemon());
    expect(result.boosts).toEqual({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
  });
});

function makeBundle(overrides: Partial<VgcRealSetBundle> = {}): VgcRealSetBundle {
  return {
    item: 'Safety Goggles',
    ability: 'Intimidate',
    nature: 'Adamant',
    moves: ['Fake Out', 'Flare Blitz', 'Knock Off', 'U-turn'],
    evs: { hp: 4, attack: 252, defense: 0, specialAttack: 0, specialDefense: 0, speed: 252 },
    occurrences: 3,
    ...overrides,
  };
}

describe('realSetBundleToCalcUpdates', () => {
  it('maps evs directly into sps with no scale conversion', () => {
    const result = realSetBundleToCalcUpdates(makeBundle());
    expect(result.sps).toEqual({ hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 });
  });

  it('pads the move list to exactly 4 slots, filling missing ones with empty strings', () => {
    const result = realSetBundleToCalcUpdates(makeBundle({ moves: ['Fake Out', 'Flare Blitz'] }));
    expect(result.moves).toEqual([
      { name: 'Fake Out', isCrit: false },
      { name: 'Flare Blitz', isCrit: false },
      { name: '', isCrit: false },
      { name: '', isCrit: false },
    ]);
  });

  it('defaults nature to Hardy when unset', () => {
    const result = realSetBundleToCalcUpdates(makeBundle({ nature: undefined }));
    expect(result.nature).toBe('Hardy');
  });

  it('defaults item/ability to empty string when unset', () => {
    const result = realSetBundleToCalcUpdates(makeBundle({ item: undefined, ability: undefined }));
    expect(result.item).toBe('');
    expect(result.ability).toBe('');
  });

  it('does not touch species, gender, level, status, or boosts - a bundle carries none of those', () => {
    const result = realSetBundleToCalcUpdates(makeBundle());
    expect(result.species).toBeUndefined();
    expect(result.gender).toBeUndefined();
    expect(result.level).toBeUndefined();
    expect(result.status).toBeUndefined();
    expect(result.boosts).toBeUndefined();
  });
});
