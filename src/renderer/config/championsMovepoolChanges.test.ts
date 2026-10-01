/**
 * Test suite for the Champions movepool corrections applied on top of a
 * species' PokeAPI all-time movepool (see file header). Tests the pure
 * `applyChampionsMovepoolChanges` function directly, independent of the
 * `hasChampionsMoveData` gating in useGameData.ts - `GLOBALLY_REMOVED_MOVES`
 * stays real data (covers the Leg 4b findings: the game-wide removal list
 * and the moves it strips that used to be carved out for Floette, see
 * docs/investigations/champions-showdown-mod-audit.md's Leg 4b section),
 * and both `CHAMPIONS_MOVEPOOL_ADDITIONS`/`CHAMPIONS_MOVEPOOL_REMOVALS` now
 * hold real entries for all 25 Reg M-C-added species (Reg M-C
 * Z-A-Exclusive Movepool Audit Leg 1, 2026-09-30 - see file header), not
 * just the 5 single-move entries added piecemeal during Reg M-C Prep,
 * alongside the generic per-species mechanism test exercised against a
 * throwaway 'test-species' key.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  applyChampionsMovepoolChanges,
  applyChampionsPatchRemovals,
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

  it("adds back Rillaboom's, Cinderace's, and Pincurchin's own signature moves despite being globally removed", () => {
    expect(applyChampionsMovepoolChanges('rillaboom', ['drum-beating', 'wood-hammer'])).toContain('drum-beating');
    expect(applyChampionsMovepoolChanges('cinderace', ['pyro-ball', 'flamethrower'])).toContain('pyro-ball');
    expect(applyChampionsMovepoolChanges('pincurchin', ['zing-zap', 'spark'])).toContain('zing-zap');
  });

  it('adds back Golisopod moves absent from its PokeAPI all-time movepool entirely (likely Legends Z-A-exclusive)', () => {
    const result = applyChampionsMovepoolChanges('golisopod', ['first-impression', 'liquidation']);
    expect(result).toEqual(expect.arrayContaining(['u-turn', 'gunk-shot', 'night-slash', 'superpower', 'first-impression', 'liquidation']));
  });

  it("applies Wigglytuff's full Leg 1 sweep result (additions + a large per-species removal list)", () => {
    const result = applyChampionsMovepoolChanges('wigglytuff', ['toxic', 'attract', 'double-edge', 'thunderbolt']);
    expect(result).toEqual(expect.arrayContaining(['heal-pulse', 'moonblast', 'perish-song', 'wish', 'double-edge', 'thunderbolt']));
    expect(result).not.toContain('toxic');
    expect(result).not.toContain('attract');
  });

  it('applies identical corrections to all 4 cosmetic Squawkabilly plumage-color varieties', () => {
    const base = ['tackle', 'leafage'];
    const green = applyChampionsMovepoolChanges('squawkabilly-green-plumage', base);
    const blue = applyChampionsMovepoolChanges('squawkabilly-blue-plumage', base);
    expect(green).toEqual(blue);
    expect(green).toEqual(expect.arrayContaining(['lunge', 'seed-bomb']));
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

describe('applyChampionsPatchRemovals', () => {
  it("strips Archaludon's post-launch removals (Mirror Coat, Metal Burst)", () => {
    const result = applyChampionsPatchRemovals('archaludon', ['mirror-coat', 'metal-burst', 'flash-cannon']);
    expect(result).toEqual(['flash-cannon']);
  });

  it('leaves a species with no patch-removal entry unaffected', () => {
    const result = applyChampionsPatchRemovals('unlisted-species', ['tackle', 'moonblast']);
    expect(result).toEqual(['tackle', 'moonblast']);
  });
});
