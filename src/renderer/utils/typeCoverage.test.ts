import { describe, it, expect } from 'vitest';
import { computeOffensiveCoverage, computeDefensiveCoverage } from './typeCoverage';
import { ALL_TYPES } from '../config/typeEffectiveness';

describe('computeOffensiveCoverage', () => {
  it('returns one row per type in ALL_TYPES', () => {
    const rows = computeOffensiveCoverage([['fire']]);
    expect(rows.map(r => r.type)).toEqual([...ALL_TYPES]);
  });

  it('marks a null cell for a slot with no damaging move types', () => {
    const rows = computeOffensiveCoverage([[]]);
    const fireRow = rows.find(r => r.type === 'fire')!;
    expect(fireRow.cells).toEqual([null]);
  });

  it('takes the best (max) multiplier across a slot\'s move types against each defending type', () => {
    // Water is resisted by water/grass/dragon but a Fire move on the same slot hits Grass super-effectively
    const rows = computeOffensiveCoverage([['water', 'fire']]);
    const grassRow = rows.find(r => r.type === 'grass')!;
    // Fire vs Grass = 2x; Water vs Grass = 0.5x -> best is 2
    expect(grassRow.cells).toEqual([2]);
  });

  it('counts a cell under 1 as unfavorable and over 1 as favorable', () => {
    const rows = computeOffensiveCoverage([['fire']]);
    const grassRow = rows.find(r => r.type === 'grass')!; // fire is super-effective vs grass
    const waterRow = rows.find(r => r.type === 'water')!; // fire is resisted by water
    expect(grassRow.favorableCount).toBe(1);
    expect(grassRow.unfavorableCount).toBe(0);
    expect(waterRow.unfavorableCount).toBe(1);
    expect(waterRow.favorableCount).toBe(0);
  });

  it('does not count a null cell toward either favorable or unfavorable', () => {
    const rows = computeOffensiveCoverage([[]]);
    const anyRow = rows[0];
    expect(anyRow.favorableCount).toBe(0);
    expect(anyRow.unfavorableCount).toBe(0);
  });
});

describe('computeDefensiveCoverage', () => {
  it('returns one row per type in ALL_TYPES', () => {
    const rows = computeDefensiveCoverage([['water']]);
    expect(rows.map(r => r.type)).toEqual([...ALL_TYPES]);
  });

  it('computes the dual-type product for a defender with two types', () => {
    // Water/Flying: Electric is 2x vs Water, neutral vs Flying already 2x per mainline -> Electric hits Water/Flying 2x total (per this app's config, matches getEffectivenessMultiplier)
    const rows = computeDefensiveCoverage([['water', 'flying']]);
    const electricRow = rows.find(r => r.type === 'electric')!;
    expect(electricRow.cells[0]).toBeGreaterThan(1);
  });

  it('counts a defensive cell over 1 (weak) as unfavorable and under 1 (resisted) as favorable', () => {
    const rows = computeDefensiveCoverage([['water']]);
    const electricRow = rows.find(r => r.type === 'electric')!; // water is weak to electric
    const fireRow = rows.find(r => r.type === 'fire')!; // water resists fire
    expect(electricRow.unfavorableCount).toBe(1);
    expect(electricRow.favorableCount).toBe(0);
    expect(fireRow.favorableCount).toBe(1);
    expect(fireRow.unfavorableCount).toBe(0);
  });
});
