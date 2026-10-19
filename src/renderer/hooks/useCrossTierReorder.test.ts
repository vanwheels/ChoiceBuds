import { describe, it, expect } from 'vitest';
import { pointInRect, moveToOtherTier } from './useCrossTierReorder';

const rect = { left: 0, top: 0, right: 100, bottom: 100 } as DOMRect;

describe('pointInRect', () => {
  it('is true for a point inside the rect, including its edges', () => {
    expect(pointInRect(50, 50, rect)).toBe(true);
    expect(pointInRect(0, 0, rect)).toBe(true);
    expect(pointInRect(100, 100, rect)).toBe(true);
  });
  it('is false for a point outside the rect', () => {
    expect(pointInRect(101, 50, rect)).toBe(false);
    expect(pointInRect(50, -1, rect)).toBe(false);
  });
  it('is false when there is no rect', () => {
    expect(pointInRect(50, 50, undefined)).toBe(false);
  });
});

describe('moveToOtherTier', () => {
  it('removes the id from its source tier and appends it to the other tier', () => {
    const ids = { open: ['a', 'b'], closed: ['c'] };
    expect(moveToOtherTier(ids, 'a', 'open')).toEqual({ open: ['b'], closed: ['c', 'a'] });
  });
  it('moves in the other direction too', () => {
    const ids = { open: ['a'], closed: ['b', 'c'] };
    expect(moveToOtherTier(ids, 'c', 'closed')).toEqual({ open: ['a', 'c'], closed: ['b'] });
  });
  it('does not mutate the input', () => {
    const ids = { open: ['a'], closed: ['b'] };
    moveToOtherTier(ids, 'a', 'open');
    expect(ids).toEqual({ open: ['a'], closed: ['b'] });
  });
});
