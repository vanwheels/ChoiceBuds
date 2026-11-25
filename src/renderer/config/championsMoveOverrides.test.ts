/**
 * Test suite for Champions move balance overrides - the PP retier formula
 * in particular, since it's the part this project's own research found to
 * be non-obvious (Showdown's raw `pp` field is a pre-transform value, not
 * the final displayed PP - see the file header comment and
 * docs/investigations/champions-showdown-mod-audit.md).
 */

import { describe, expect, it } from 'vitest';
import {
  applyChampionsMoveOverride,
  getChampionsCalcMoveOverride,
  getChampionsPP,
} from './championsMoveOverrides';
import type { MoveData } from '../types/pokemon';
import { LATEST_REGULATION_ID } from '../utils/pokemonRules';

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
    cachedAt: Date.now(),
    expiresAt: Date.now() + 100_000,
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
    expect(getChampionsPP('strength-sap', 10)).toBe(8); // formula alone would give 12
    expect(getChampionsPP('wish', 10)).toBe(8); // formula alone would give 12
  });

  it('normalizes the move name before checking exceptions', () => {
    expect(getChampionsPP("King's Shield", 10)).toBe(8);
    expect(getChampionsPP('Night Slash', 20)).toBe(20);
  });
});

describe('applyChampionsMoveOverride', () => {
  it('applies a known balance override on top of the PokeAPI-sourced data', () => {
    const move = makeMove({ name: 'crabhammer', power: 100, accuracy: 90, pp: 10 });
    const result = applyChampionsMoveOverride(move, LATEST_REGULATION_ID);
    expect(result.accuracy).toBe(95);
    expect(result.power).toBe(100); // untouched - Champions doesn't override Crabhammer's power
    expect(result.pp).toBe(12); // 10 -> 12 via the game-wide formula, no exception for this move
  });

  it('leaves an unrecognized move untouched aside from the PP retier', () => {
    const move = makeMove({ name: 'tackle', power: 40, accuracy: 100, pp: 35 });
    const result = applyChampionsMoveOverride(move, LATEST_REGULATION_ID);
    expect(result.power).toBe(40);
    expect(result.accuracy).toBe(100);
    expect(result.pp).toBe(20); // 35 collapses to the flat 20 bucket
  });
});

describe('Reg M-D move patches (Dec 2 2026)', () => {
  // Mainline (PokeAPI) values each patched move starts from.
  const MAINLINE: { name: string; accuracy: number; mdAccuracy: number }[] = [
    { name: 'screech', accuracy: 85, mdAccuracy: 100 },
    { name: 'metal-sound', accuracy: 85, mdAccuracy: 100 },
    { name: 'steel-wing', accuracy: 90, mdAccuracy: 100 },
    { name: 'frost-breath', accuracy: 90, mdAccuracy: 100 },
    { name: 'rock-slide', accuracy: 90, mdAccuracy: 95 },
  ];
  const ROCK_SLIDE_MAINLINE_DESC = 'Has a chance to make the target flinch.'; // PokeAPI's short_effect, no %;

  it.each(MAINLINE)(
    '$name takes its new accuracy under Reg M-D',
    ({ name, accuracy, mdAccuracy }) => {
      const result = applyChampionsMoveOverride(makeMove({ name, accuracy }), 'REG-MD');
      expect(result.accuracy).toBe(mdAccuracy);
    },
  );

  it.each(MAINLINE)('$name keeps its mainline accuracy under Reg M-C', ({ name, accuracy }) => {
    const result = applyChampionsMoveOverride(makeMove({ name, accuracy }), 'REG-MC');
    expect(result.accuracy).toBe(accuracy);
  });

  it("drops Rock Slide's flinch chance to 20% under Reg M-D only", () => {
    const move = makeMove({
      name: 'rock-slide',
      accuracy: 90,
      description: ROCK_SLIDE_MAINLINE_DESC,
    });
    expect(applyChampionsMoveOverride(move, 'REG-MD').description).toBe(
      'Has a 20% chance to make the target flinch.',
    );
    expect(applyChampionsMoveOverride(move, 'REG-MC').description).toBe(ROCK_SLIDE_MAINLINE_DESC);
  });

  it('gives the damage calc no override for any of them, since accuracy does not affect damage', () => {
    for (const { name } of MAINLINE) {
      expect(getChampionsCalcMoveOverride(name, 'REG-MD')).toBeUndefined();
      expect(getChampionsCalcMoveOverride(name, 'REG-MC')).toBeUndefined();
    }
  });
});
