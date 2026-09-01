/**
 * Test suite for Champions move balance overrides - the PP retier formula
 * in particular, since it's the part this project's own research found to
 * be non-obvious (Showdown's raw `pp` field is a pre-transform value, not
 * the final displayed PP - see the file header comment and
 * docs/investigations/champions-showdown-mod-audit.md).
 */

import { describe, expect, it } from 'vitest';
import { applyChampionsMoveOverride, getChampionsPP } from './championsMoveOverrides';
import type { MoveData } from '../types/pokemon';

function makeMove(overrides: Partial<MoveData> = {}): MoveData {
  return {
    name: 'tackle',
    type: 'normal',
    category: 'physical',
    power: 40,
    pp: 35,
    accuracy: 100,
    description: 'A physical attack.',
    flags: [],
    target: 'selected-pokemon',
    ...overrides,
  };
}

describe('getChampionsPP', () => {
  it('applies the game-wide retier formula for moves with no explicit exception', () => {
    expect(getChampionsPP('tackle', 5)).toBe(8);
    expect(getChampionsPP('tackle', 10)).toBe(12);
    expect(getChampionsPP('tackle', 15)).toBe(16);
    expect(getChampionsPP('tackle', 20)).toBe(20);
    expect(getChampionsPP('tackle', 40)).toBe(20); // >20 collapses to a flat 20
  });

  it('uses the hardcoded exception value instead of the formula', () => {
    // Showdown's champions mod scripts.ts: calculatePP = (move.pp / 5 + 1) * 4,
    // applied to a raw pp field that isn't itself the final number - these
    // exceptions exist because the retiered result doesn't match that formula's
    // usual per-tier output for these specific moves' raw base PP.
    expect(getChampionsPP('protect', 10)).toBe(8); // formula alone would give 12
    expect(getChampionsPP('beak-blast', 15)).toBe(8); // formula alone would give 16
    expect(getChampionsPP('shell-trap', 5)).toBe(12); // formula alone would give 8
  });

  it('normalizes the move name before checking exceptions', () => {
    expect(getChampionsPP("King's Shield", 10)).toBe(8);
    expect(getChampionsPP('Night Slash', 20)).toBe(20);
  });
});

describe('applyChampionsMoveOverride', () => {
  it('applies a known balance override on top of the PokeAPI-sourced data', () => {
    const move = makeMove({ name: 'crabhammer', power: 100, accuracy: 90, pp: 10 });
    const result = applyChampionsMoveOverride(move);
    expect(result.accuracy).toBe(95);
    expect(result.power).toBe(100); // untouched - Champions doesn't override Crabhammer's power
    expect(result.pp).toBe(12); // 10 -> 12 via the game-wide formula, no exception for this move
  });

  it('leaves an unrecognized move untouched aside from the PP retier', () => {
    const move = makeMove({ name: 'tackle', power: 40, accuracy: 100, pp: 35 });
    const result = applyChampionsMoveOverride(move);
    expect(result.power).toBe(40);
    expect(result.accuracy).toBe(100);
    expect(result.pp).toBe(20); // 35 collapses to the flat 20 bucket
  });
});
