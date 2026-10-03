import { describe, it, expect } from 'vitest';
import { pickSlotIndex, moveToIndex } from './useGridReorder';

const grid = [
  { left: 0, top: 0, width: 100, height: 100 },
  { left: 110, top: 0, width: 100, height: 100 },
  { left: 0, top: 110, width: 100, height: 100 },
];

describe('pickSlotIndex', () => {
  it('finds the slot containing the point, across rows', () => {
    expect(pickSlotIndex(grid, 150, 50)).toBe(1);
    expect(pickSlotIndex(grid, 50, 150)).toBe(2);
  });
  it('falls back to the nearest center in a gap or outside', () => {
    expect(pickSlotIndex(grid, 105, 50)).toBe(0);
    expect(pickSlotIndex(grid, 400, 400)).toBe(1);
  });
  it('returns -1 with no slots', () => {
    expect(pickSlotIndex([], 0, 0)).toBe(-1);
  });
});

describe('moveToIndex', () => {
  it('moves an id to the target slot', () => {
    expect(moveToIndex(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a']);
    expect(moveToIndex(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
  });
  it('returns the same array when already in place', () => {
    const ids = ['a', 'b'];
    expect(moveToIndex(ids, 'a', 0)).toBe(ids);
  });
});
