import { describe, it, expect } from 'vitest';
import { computeUsageThreats, USAGE_THREAT_RANK_CUTOFF, type UsageThreat } from './usageThreats';
import type { DefendingSlot } from './typeCoverage';

function makeThreat(overrides: Partial<UsageThreat> = {}): UsageThreat {
  return {
    species: 'Gengar',
    types: ['ghost', 'poison'],
    columnPosition: 1,
    spriteUrl: 'https://example.com/sprite.png',
    ...overrides,
  };
}

function slot(types: string[], ability?: string): DefendingSlot {
  return { types, ability };
}

describe('computeUsageThreats', () => {
  it('excludes a candidate past the usage rank cutoff', () => {
    const overCutoff = makeThreat({ types: ['electric'], columnPosition: USAGE_THREAT_RANK_CUTOFF + 1 });
    expect(computeUsageThreats([slot(['water'])], [overCutoff])).toEqual([]);
  });

  it('includes a candidate exactly at the usage rank cutoff', () => {
    const atCutoff = makeThreat({ types: ['electric'], columnPosition: USAGE_THREAT_RANK_CUTOFF });
    expect(computeUsageThreats([slot(['water'])], [atCutoff])).toEqual([atCutoff]);
  });

  it('excludes a candidate resisted by a team slot', () => {
    // Water is resisted by Water (0.5x)
    const resisted = makeThreat({ types: ['water'] });
    expect(computeUsageThreats([slot(['water'])], [resisted])).toEqual([]);
  });

  it('excludes a candidate a team slot is immune to', () => {
    // Ghost is a 0x hit vs Normal
    const immune = makeThreat({ types: ['ghost'] });
    expect(computeUsageThreats([slot(['normal'])], [immune])).toEqual([]);
  });

  it('includes a candidate that lands neutral or better on every slot', () => {
    // Ground vs Water is neutral (1x)
    const neutral = makeThreat({ types: ['ground'] });
    expect(computeUsageThreats([slot(['water'])], [neutral])).toEqual([neutral]);
  });

  it('uses the best (max) of a dual-typed candidate\'s two types against a slot', () => {
    // Water/Grass: Water resisted by Water (0.5x) but Grass is super-effective vs Water (2x) -> best is 2, keeps it
    const dualTyped = makeThreat({ types: ['water', 'grass'] });
    expect(computeUsageThreats([slot(['water'])], [dualTyped])).toEqual([dualTyped]);
  });

  it('excludes a candidate resisted by any one slot even if others are neutral+', () => {
    // Electric is neutral vs Normal but resisted by Ground (0x, immune)
    const mixed = makeThreat({ types: ['electric'] });
    expect(computeUsageThreats([slot(['normal']), slot(['ground'])], [mixed])).toEqual([]);
  });

  it('sorts surviving candidates by columnPosition ascending', () => {
    const third = makeThreat({ species: 'C', types: ['electric'], columnPosition: 30 });
    const first = makeThreat({ species: 'A', types: ['electric'], columnPosition: 5 });
    const second = makeThreat({ species: 'B', types: ['electric'], columnPosition: 15 });
    expect(computeUsageThreats([slot(['normal'])], [third, first, second]).map(t => t.species)).toEqual(['A', 'B', 'C']);
  });

  it('returns an empty list for empty candidates', () => {
    expect(computeUsageThreats([slot(['water'])], [])).toEqual([]);
  });

  it('excludes a candidate that would otherwise be super-effective, when a slot\'s ability immunizes it', () => {
    // Electric is 2x vs a Flying-type slot, but Motor Drive fully no-sells Electric
    const electric = makeThreat({ types: ['electric'] });
    expect(computeUsageThreats([slot(['flying'], 'Motor Drive')], [electric])).toEqual([]);
  });

  it('does not immunize a type the ability does not cover', () => {
    // Levitate blocks Ground, not Electric
    const electric = makeThreat({ types: ['electric'] });
    expect(computeUsageThreats([slot(['flying'], 'Levitate')], [electric])).toEqual([electric]);
  });

  it('still excludes via ability immunity even when the slot\'s raw types are weak to the threat', () => {
    // Water is 2x super-effective vs Ground, but Water Absorb fully no-sells it
    const water = makeThreat({ types: ['water'] });
    expect(computeUsageThreats([slot(['ground'], 'Water Absorb')], [water])).toEqual([]);
  });
});
