import { describe, it, expect } from 'vitest';
import { isAegislash, getAegislashBladeStats } from './aegislashForme';

describe('isAegislash', () => {
  it('matches the bare stored species', () => {
    expect(isAegislash('Aegislash')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isAegislash('aegislash')).toBe(true);
  });

  it('matches an already-formed Blade/Shield spelling', () => {
    expect(isAegislash('Aegislash-Blade')).toBe(true);
    expect(isAegislash('Aegislash-Shield')).toBe(true);
  });

  it('does not match an unrelated species', () => {
    expect(isAegislash('Honedge')).toBe(false);
  });
});

describe('getAegislashBladeStats', () => {
  it('swaps Attack<->Defense and Sp. Atk<->Sp. Def, leaving HP/Speed unchanged', () => {
    const shieldStats = {
      hp: 60,
      attack: 50,
      defense: 140,
      specialAttack: 50,
      specialDefense: 140,
      speed: 60,
    };
    expect(getAegislashBladeStats(shieldStats)).toEqual({
      hp: 60,
      attack: 140,
      defense: 50,
      specialAttack: 140,
      specialDefense: 50,
      speed: 60,
    });
  });
});
