import { describe, it, expect } from 'vitest';
import { formatStatAlignment } from './statAlignment';
import type { EVSpread } from '../types/pokemon';

const zeroEvs: EVSpread = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

describe('formatStatAlignment', () => {
  it('formats a nature with a single non-zero stat', () => {
    const evs: EVSpread = { ...zeroEvs, speed: 32 };
    expect(formatStatAlignment('Timid', evs)).toBe('Timid - 32 Spe');
  });

  it('formats multiple non-zero stats in fixed HP/Atk/Def/SpA/SpD/Spe order regardless of which fields are set', () => {
    const evs: EVSpread = { ...zeroEvs, speed: 32, hp: 20, specialAttack: 14 };
    expect(formatStatAlignment('Modest', evs)).toBe('Modest - 20 HP / 14 SpA / 32 Spe');
  });

  it('omits the "nature - " prefix entirely when no nature is given', () => {
    const evs: EVSpread = { ...zeroEvs, attack: 32 };
    expect(formatStatAlignment(undefined, evs)).toBe('32 Atk');
  });

  it('produces an empty EV line when every stat is zero', () => {
    expect(formatStatAlignment('Hardy', zeroEvs)).toBe('Hardy - ');
  });

  it('produces a fully empty string when there is no nature and every stat is zero', () => {
    expect(formatStatAlignment(undefined, zeroEvs)).toBe('');
  });

  it('includes all six stats when every stat has points', () => {
    const evs: EVSpread = { hp: 4, attack: 4, defense: 4, specialAttack: 4, specialDefense: 4, speed: 4 };
    expect(formatStatAlignment('Jolly', evs)).toBe('Jolly - 4 HP / 4 Atk / 4 Def / 4 SpA / 4 SpD / 4 Spe');
  });
});
