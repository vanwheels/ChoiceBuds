/**
 * Reg M-D's ability balance changes (reg-m-d.md §6) are description-only and
 * must apply from Reg M-D onward, never to Reg M-C or earlier.
 */

import { describe, it, expect } from 'vitest';
import { applyChampionsAbilityOverride } from './championsAbilityOverrides';
import type { AbilityData } from '../types/pokemon';

function makeAbility(name: string, description: string): AbilityData {
  return { name, description, cachedAt: 0, expiresAt: 0 };
}

describe('Reg M-D ability patches', () => {
  const CASES = [
    {
      name: 'flash-fire',
      mainline:
        "Protects against fire moves. Once one has been blocked, the Pokémon's own Fire moves inflict 1.5× damage until it leaves battle.",
      mdIncludes: 'persists through Mega Evolution',
    },
    {
      name: 'stalwart',
      mainline: "Ignores other Pokémon's ability-based move redirection.",
      mdIncludes: 'hit through substitutes',
    },
  ];

  it.each(CASES)(
    '$name gets its Reg M-D description under Reg M-D',
    ({ name, mainline, mdIncludes }) => {
      const result = applyChampionsAbilityOverride(makeAbility(name, mainline), 'REG-MD');
      expect(result.description).toContain(mdIncludes);
    },
  );

  it.each(CASES)('$name keeps its mainline description under Reg M-C', ({ name, mainline }) => {
    const result = applyChampionsAbilityOverride(makeAbility(name, mainline), 'REG-MC');
    expect(result.description).toBe(mainline);
  });

  it('resolves display names as well as slugs', () => {
    const result = applyChampionsAbilityOverride(makeAbility('Flash Fire', 'x'), 'REG-MD');
    expect(result.description).toContain('persists through Mega Evolution');
  });
});
