/**
 * The dated patch layer's apply logic outside React: the calc's move
 * override path, plus how dated entries stack on the global tables.
 * The tables are mocked with test entries tagged REG-MC, so the stacking
 * rules are tested apart from the real Reg M-D data.
 */

import { describe, it, expect, vi } from 'vitest';
import { getChampionsCalcMoveOverride, applyChampionsMoveOverride } from './championsMoveOverrides';
import { applyChampionsAbilityOverride } from './championsAbilityOverrides';
import { applyDatedMovepoolAdditions } from './championsMovepoolChanges';
import type { MoveData } from '../types/pokemon';

vi.mock('./championsRegulationPatches', () => ({
  CHAMPIONS_DATED_MOVE_PATCHES: {
    tackle: [{ since: 'REG-MC', change: { power: 60, type: 'fighting' } }],
    // crabhammer has a global accuracy override; the dated patch must stack on it
    crabhammer: [
      { since: 'REG-MC', change: { power: 110 } },
      { since: 'REG-MD', change: { power: 120 } },
    ],
  },
  CHAMPIONS_DATED_ABILITY_PATCHES: {
    healer: [{ since: 'REG-MC', change: { description: 'Patched description.' } }],
  },
  CHAMPIONS_DATED_MOVEPOOL_ADDITIONS: {
    gengar: [{ since: 'REG-MC', change: ['psych-up'] }],
  },
}));

function makeMove(overrides: Partial<MoveData>): MoveData {
  return {
    name: 'tackle',
    type: 'normal',
    category: 'physical',
    power: 40,
    pp: 35,
    accuracy: 100,
    description: '',
    flags: [],
    target: 'selected-pokemon',
    cachedAt: 0,
    expiresAt: 0,
    ...overrides,
  };
}

describe('getChampionsCalcMoveOverride with dated patches', () => {
  it('applies a dated damage override from its regulation onward only', () => {
    expect(getChampionsCalcMoveOverride('Tackle', 'REG-MB')).toBeUndefined();
    expect(getChampionsCalcMoveOverride('Tackle', 'REG-MC')).toEqual({
      basePower: 60,
      type: 'Fighting',
    });
    expect(getChampionsCalcMoveOverride('Tackle', 'REG-MD')).toEqual({
      basePower: 60,
      type: 'Fighting',
    });
  });

  it('lets a later dated patch win over an earlier one', () => {
    expect(getChampionsCalcMoveOverride('Crabhammer', 'REG-MB')).toBeUndefined();
    expect(getChampionsCalcMoveOverride('Crabhammer', 'REG-MC')).toEqual({ basePower: 110 });
    expect(getChampionsCalcMoveOverride('Crabhammer', 'REG-MD')).toEqual({ basePower: 120 });
  });
});

describe('dated patches stack on the global overrides', () => {
  it('keeps a global move override in every regulation', () => {
    const before = applyChampionsMoveOverride(
      makeMove({ name: 'crabhammer', power: 100 }),
      'REG-MA',
    );
    expect(before.accuracy).toBe(95);
    expect(before.power).toBe(100);
    const after = applyChampionsMoveOverride(
      makeMove({ name: 'crabhammer', power: 100 }),
      'REG-MD',
    );
    expect(after.accuracy).toBe(95);
    expect(after.power).toBe(120);
  });

  it('keeps a global ability override before the patch, and lets the patch win from its regulation on', () => {
    const ability = { name: 'healer', description: 'x', cachedAt: 0, expiresAt: 0 };
    expect(applyChampionsAbilityOverride(ability, 'REG-MB').description).toContain('50% chance');
    expect(applyChampionsAbilityOverride(ability, 'REG-MC').description).toBe(
      'Patched description.',
    );
  });

  it('adds dated movepool moves without duplicating ones already present', () => {
    expect(applyDatedMovepoolAdditions('gengar', ['hex'], 'REG-MC')).toEqual(['hex', 'psych-up']);
    expect(applyDatedMovepoolAdditions('gengar', ['psych-up'], 'REG-MC')).toEqual(['psych-up']);
    expect(applyDatedMovepoolAdditions('gengar', ['hex'], 'REG-MB')).toEqual(['hex']);
  });
});
