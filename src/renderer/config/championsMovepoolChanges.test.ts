/**
 * Test suite for the Champions movepool corrections applied on top of a
 * species' PokeAPI all-time movepool (see file header). Tests the pure
 * `applyChampionsMovepoolChanges` function directly, independent of the
 * `hasChampionsMoveData` gating in useGameData.ts - `GLOBALLY_REMOVED_MOVES`
 * stays real data (covers the Leg 4b findings: the game-wide removal list
 * and the moves it strips that used to be carved out for Floette, see
 * docs/investigations/champions-showdown-mod-audit.md's Leg 4b section),
 * and `CHAMPIONS_MOVEPOOL_ADDITIONS` now holds one real entry (baxcalibur,
 * added 2026-09-05 - see file header) alongside the generic per-species
 * mechanism test exercised against a throwaway 'test-species' key.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  applyChampionsMovepoolChanges,
  CHAMPIONS_MOVEPOOL_ADDITIONS,
  CHAMPIONS_MOVEPOOL_REMOVALS,
} from './championsMovepoolChanges';

describe('applyChampionsMovepoolChanges', () => {
  it('strips a globally-removed move regardless of species', () => {
    const result = applyChampionsMovepoolChanges('some-species', ['tera-blast', 'thunderbolt']);
    expect(result).toEqual(['thunderbolt']);
  });

  it("strips Leg 4a's former Floette carve-out moves now that Leg 4b confirmed they're globally absent", () => {
    const result = applyChampionsMovepoolChanges('floette', [
      'vine-whip', 'tackle', 'razor-leaf', 'fairy-wind', 'magical-leaf', 'moonblast',
    ]);
    expect(result).toEqual(['moonblast']);
  });

  it('leaves a species with no additions/removals entry unaffected beyond the global list', () => {
    const result = applyChampionsMovepoolChanges('unlisted-species', ['tera-blast', 'moonblast']);
    expect(result).toEqual(['moonblast']);
  });

  it("adds back Baxcalibur's own signature move despite it being globally removed", () => {
    const result = applyChampionsMovepoolChanges('baxcalibur', ['glaive-rush', 'icicle-spear', 'dragon-dance']);
    expect(result).toEqual(expect.arrayContaining(['glaive-rush', 'icicle-spear', 'dragon-dance']));
  });

  describe('per-species addition/removal mechanism (generic cases beyond the real baxcalibur entry above)', () => {
    afterEach(() => {
      delete CHAMPIONS_MOVEPOOL_ADDITIONS['test-species'];
      delete CHAMPIONS_MOVEPOOL_REMOVALS['test-species'];
    });

    it('applies a per-species addition on top of the globally-removed baseline', () => {
      CHAMPIONS_MOVEPOOL_ADDITIONS['test-species'] = ['dynamic-punch'];
      const result = applyChampionsMovepoolChanges('test-species', ['scratch', 'tackle']);
      expect(result).toContain('dynamic-punch');
      expect(result).not.toContain('tackle'); // globally removed
      expect(result).not.toContain('scratch'); // globally removed
    });

    it('applies a per-species removal on top of the globally-removed baseline', () => {
      CHAMPIONS_MOVEPOOL_REMOVALS['test-species'] = ['covet', 'final-gambit'];
      const result = applyChampionsMovepoolChanges('test-species', ['covet', 'final-gambit', 'thunderbolt']);
      expect(result).not.toContain('covet'); // per-species removal
      expect(result).not.toContain('final-gambit'); // per-species removal
      expect(result).toContain('thunderbolt'); // untouched
    });
  });
});
