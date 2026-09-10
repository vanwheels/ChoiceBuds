import { describe, it, expect } from 'vitest';
import { getTotalSP, MAX_TOTAL_SP } from './evTotal';
import type { EVSpread } from '../types/pokemon';

const spread = (overrides: Partial<EVSpread> = {}): EVSpread => ({
  hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0,
  ...overrides,
});

describe('getTotalSP', () => {
  it('sums all six stats', () => {
    expect(getTotalSP(spread({ hp: 4, attack: 20, speed: 32 }))).toBe(56);
  });

  it('returns 0 for an all-zero spread', () => {
    expect(getTotalSP(spread())).toBe(0);
  });

  it('can exceed MAX_TOTAL_SP when a Speed Tiers save pushes it over the cap', () => {
    const total = getTotalSP(spread({ attack: 40, speed: 32 }));
    expect(total).toBe(72);
    expect(total).toBeGreaterThan(MAX_TOTAL_SP);
  });
});
