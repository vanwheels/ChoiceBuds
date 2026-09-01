/**
 * Test suite for the Champions movepool corrections applied on top of a
 * species' PokeAPI all-time movepool (see file header - only actually
 * consulted for species PokeAPI hasn't "champions"-tagged yet, which is
 * Floette today). Covers the Leg 4b findings in particular: the game-wide
 * removal list and the moves it now strips that used to be carved out for
 * Floette (see docs/investigations/champions-showdown-mod-audit.md's Leg 4b
 * section for how those 5 moves were confirmed absent from Champions).
 */

import { describe, expect, it } from 'vitest';
import { applyChampionsMovepoolChanges } from './championsMovepoolChanges';

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

  it('applies a per-species addition on top of the globally-removed baseline', () => {
    const result = applyChampionsMovepoolChanges('annihilape', ['scratch', 'tackle']);
    expect(result).toContain('dynamic-punch');
    expect(result).not.toContain('tackle'); // globally removed
    expect(result).not.toContain('scratch'); // globally removed
  });

  it('applies a per-species removal on top of the globally-removed baseline', () => {
    const result = applyChampionsMovepoolChanges('annihilape', ['covet', 'final-gambit', 'thunderbolt']);
    expect(result).not.toContain('covet'); // per-species removal
    expect(result).not.toContain('final-gambit'); // per-species removal
    expect(result).toContain('thunderbolt'); // untouched
  });

  it('leaves a species with no additions/removals entry unaffected beyond the global list', () => {
    const result = applyChampionsMovepoolChanges('unlisted-species', ['tera-blast', 'moonblast']);
    expect(result).toEqual(['moonblast']);
  });
});
