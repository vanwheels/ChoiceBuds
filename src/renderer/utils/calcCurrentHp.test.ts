import { describe, it, expect } from 'vitest';
import { flatHpToPercent, percentToFlatHp, clampCurHp } from './calcCurrentHp';

// Rule (Showdown's calc): current HP is editable as a flat number or a % of
// max HP, each updating the other. Percent shown rounds to nearest whole %;
// flat from percent rounds to nearest HP but never below 1 (a 0 HP target
// isn't a damage-calc scenario) and never above max.

describe('flatHpToPercent', () => {
  it('is 100 at full HP', () => {
    expect(flatHpToPercent(155, 155)).toBe(100);
  });
  it('rounds to the nearest whole percent', () => {
    expect(flatHpToPercent(78, 155)).toBe(50); // 50.32
    expect(flatHpToPercent(1, 155)).toBe(1); // 0.65
  });
  it('is 100 when max HP is unknown/zero', () => {
    expect(flatHpToPercent(10, 0)).toBe(100);
  });
});

describe('percentToFlatHp', () => {
  it('maps 100% to max HP', () => {
    expect(percentToFlatHp(100, 155)).toBe(155);
  });
  it('rounds to the nearest HP', () => {
    expect(percentToFlatHp(50, 155)).toBe(78); // 77.5
  });
  it('never drops below 1 HP', () => {
    expect(percentToFlatHp(0, 155)).toBe(1);
  });
  it('never exceeds max HP', () => {
    expect(percentToFlatHp(250, 155)).toBe(155);
  });
});

describe('clampCurHp', () => {
  it('returns null (full HP) when value is at or above max', () => {
    expect(clampCurHp(155, 155)).toBeNull();
    expect(clampCurHp(999, 155)).toBeNull();
  });
  it('clamps below 1 up to 1', () => {
    expect(clampCurHp(0, 155)).toBe(1);
    expect(clampCurHp(-5, 155)).toBe(1);
  });
  it('passes through an in-range value', () => {
    expect(clampCurHp(80, 155)).toBe(80);
  });
});
