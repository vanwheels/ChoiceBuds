import { describe, it, expect } from 'vitest';
import { calcStateToShowdownPokemon } from './calcExport';
import type { CalcPokemonState } from '../hooks/useDamageCalc';

function makeCalcState(overrides: Partial<CalcPokemonState> = {}): CalcPokemonState {
  return {
    species: 'Gengar',
    gender: '',
    level: 50,
    item: '',
    ability: '',
    nature: 'Hardy',
    status: '',
    sps: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    boosts: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    moves: [{ name: '', isCrit: false }, { name: '', isCrit: false }, { name: '', isCrit: false }, { name: '', isCrit: false }],
    ...overrides,
  };
}

describe('calcStateToShowdownPokemon', () => {
  it('copies sps directly into evs with no scale conversion', () => {
    const state = makeCalcState({ sps: { hp: 4, atk: 0, def: 4, spa: 20, spd: 6, spe: 32 } });
    const result = calcStateToShowdownPokemon(state);
    expect(result.evs).toEqual({ hp: 4, attack: 0, defense: 4, specialAttack: 20, specialDefense: 6, speed: 32 });
  });

  it('filters out empty move slots', () => {
    const state = makeCalcState({
      moves: [{ name: 'Shadow Ball', isCrit: false }, { name: '', isCrit: false }, { name: 'Protect', isCrit: false }, { name: '', isCrit: false }],
    });
    expect(calcStateToShowdownPokemon(state).moves).toEqual(['Shadow Ball', 'Protect']);
  });

  it('converts empty-string gender/item/ability to undefined', () => {
    const state = makeCalcState({ gender: '', item: '', ability: '' });
    const result = calcStateToShowdownPokemon(state);
    expect(result.gender).toBeUndefined();
    expect(result.item).toBeUndefined();
    expect(result.ability).toBeUndefined();
  });

  it('preserves a set gender/item/ability', () => {
    const state = makeCalcState({ gender: 'M', item: 'Life Orb', ability: 'Cursed Body' });
    const result = calcStateToShowdownPokemon(state);
    expect(result.gender).toBe('M');
    expect(result.item).toBe('Life Orb');
    expect(result.ability).toBe('Cursed Body');
  });

  it('always sets shiny/gigantamax false and happiness 255, matching the app-wide convention', () => {
    const result = calcStateToShowdownPokemon(makeCalcState());
    expect(result.shiny).toBe(false);
    expect(result.gigantamax).toBe(false);
    expect(result.happiness).toBe(255);
  });

  it('carries species, level, and nature straight through', () => {
    const state = makeCalcState({ species: 'Incineroar', level: 50, nature: 'Careful' });
    const result = calcStateToShowdownPokemon(state);
    expect(result.species).toBe('Incineroar');
    expect(result.level).toBe(50);
    expect(result.nature).toBe('Careful');
  });
});
