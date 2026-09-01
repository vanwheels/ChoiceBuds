import { describe, it, expect } from 'vitest';
import { computeUsageThreats, USAGE_THREAT_RANK_CUTOFF, type UsageThreat } from './usageThreats';

function makeThreat(overrides: Partial<UsageThreat> = {}): UsageThreat {
  return {
    species: 'Gengar',
    types: ['ghost', 'poison'],
    columnPosition: 1,
    spriteUrl: 'https://example.com/sprite.png',
    ...overrides,
  };
}

describe('computeUsageThreats', () => {
  it('excludes a candidate past the usage rank cutoff', () => {
    const overCutoff = makeThreat({ types: ['electric'], columnPosition: USAGE_THREAT_RANK_CUTOFF + 1 });
    expect(computeUsageThreats([['water']], [overCutoff])).toEqual([]);
  });

  it('includes a candidate exactly at the usage rank cutoff', () => {
    const atCutoff = makeThreat({ types: ['electric'], columnPosition: USAGE_THREAT_RANK_CUTOFF });
    expect(computeUsageThreats([['water']], [atCutoff])).toEqual([atCutoff]);
  });

  it('excludes a candidate resisted by a team slot', () => {
    // Water is resisted by Water (0.5x)
    const resisted = makeThreat({ types: ['water'] });
    expect(computeUsageThreats([['water']], [resisted])).toEqual([]);
  });

  it('excludes a candidate a team slot is immune to', () => {
    // Ghost is a 0x hit vs Normal
    const immune = makeThreat({ types: ['ghost'] });
    expect(computeUsageThreats([['normal']], [immune])).toEqual([]);
  });

  it('includes a candidate that lands neutral or better on every slot', () => {
    // Ground vs Water is neutral (1x)
    const neutral = makeThreat({ types: ['ground'] });
    expect(computeUsageThreats([['water']], [neutral])).toEqual([neutral]);
  });

  it('uses the best (max) of a dual-typed candidate\'s two types against a slot', () => {
    // Water/Grass: Water resisted by Water (0.5x) but Grass is super-effective vs Water (2x) -> best is 2, keeps it
    const dualTyped = makeThreat({ types: ['water', 'grass'] });
    expect(computeUsageThreats([['water']], [dualTyped])).toEqual([dualTyped]);
  });

  it('excludes a candidate resisted by any one slot even if others are neutral+', () => {
    // Electric is neutral vs Normal but resisted by Ground (0x, immune)
    const mixed = makeThreat({ types: ['electric'] });
    expect(computeUsageThreats([['normal'], ['ground']], [mixed])).toEqual([]);
  });

  it('sorts surviving candidates by columnPosition ascending', () => {
    const third = makeThreat({ species: 'C', types: ['electric'], columnPosition: 30 });
    const first = makeThreat({ species: 'A', types: ['electric'], columnPosition: 5 });
    const second = makeThreat({ species: 'B', types: ['electric'], columnPosition: 15 });
    expect(computeUsageThreats([['normal']], [third, first, second]).map(t => t.species)).toEqual(['A', 'B', 'C']);
  });

  it('returns an empty list for empty candidates', () => {
    expect(computeUsageThreats([['water']], [])).toEqual([]);
  });
});
