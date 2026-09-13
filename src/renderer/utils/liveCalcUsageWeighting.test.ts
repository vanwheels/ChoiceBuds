/**
 * Test suite for the pure usage-weighting pass. `applyUsageWeighting()`
 * never touches `@smogon/calc`'s own Generation data - it only reads/ranks
 * the candidate string arrays a `UsageWeightedAxes` already carries - so
 * these tests build a minimal literal fixture directly rather than routing
 * through any real inference pipeline.
 */

import { describe, expect, it } from 'vitest';
import type { NatureName } from '@smogon/calc/dist/data/interface';
import { NO_ITEM, applyUsageWeighting, type UsageWeightedAxes } from './liveCalcUsageWeighting';
import type { ChampionsUsageEntry } from '../types/gameData';

function baseInference(overrides: Partial<UsageWeightedAxes> = {}): UsageWeightedAxes {
  return {
    natureCandidates: ['Jolly', 'Adamant', 'Hardy'] as NatureName[],
    abilityCandidates: ['Sand Veil', 'Rough Skin'],
    itemCandidates: [NO_ITEM, 'Chople Berry', 'Life Orb'],
    natureUsageCandidates: [],
    abilityUsageCandidates: [],
    itemUsageCandidates: [],
    ...overrides,
  };
}

function usage(overrides: Partial<ChampionsUsageEntry> = {}): ChampionsUsageEntry {
  return {
    species: 'test', season: 'Season M-3', moves: [], statSpreads: [],
    abilities: [], items: [], natures: [],
    columnPosition: 1, cachedAt: 0, expiresAt: 0,
    ...overrides,
  };
}

describe('applyUsageWeighting - no usage data', () => {
  it('is a full no-op: every axis becomes an unranked mirror of its base candidates', () => {
    const inference = baseInference();
    const result = applyUsageWeighting(inference, null);

    expect(result.natureUsageCandidates).toEqual([
      { value: 'Jolly', percentage: 0 }, { value: 'Adamant', percentage: 0 }, { value: 'Hardy', percentage: 0 },
    ]);
    expect(result.abilityUsageCandidates).toEqual([
      { value: 'Sand Veil', percentage: 0 }, { value: 'Rough Skin', percentage: 0 },
    ]);
    expect(result.itemUsageCandidates).toEqual([
      { value: NO_ITEM, percentage: 0 }, { value: 'Chople Berry', percentage: 0 }, { value: 'Life Orb', percentage: 0 },
    ]);
    // Every other field passes through untouched.
    expect(result.natureCandidates).toEqual(inference.natureCandidates);
  });
});

describe('applyUsageWeighting - real usage data', () => {
  it('filters out a candidate absent from the ranked rows and ranks the rest most-used-first', () => {
    const result = applyUsageWeighting(
      baseInference(),
      usage({ abilities: [{ name: 'Sand Veil', percentage: 15 }] }), // Rough Skin absent
    );

    expect(result.abilityUsageCandidates).toEqual([{ value: 'Sand Veil', percentage: 15 }]);
  });

  it('keeps a low-percentage candidate rather than applying an arbitrary cutoff', () => {
    const result = applyUsageWeighting(
      baseInference(),
      usage({ items: [{ name: 'Chople Berry', percentage: 0.4 }, { name: NO_ITEM, percentage: 60 }] }),
    );

    expect(result.itemUsageCandidates).toEqual([
      { value: NO_ITEM, percentage: 60 }, { value: 'Chople Berry', percentage: 0.4 },
    ]);
  });

  it('sorts most-used-first regardless of the ranked-row input order', () => {
    const result = applyUsageWeighting(
      baseInference(),
      usage({ natures: [{ name: 'Hardy', percentage: 5 }, { name: 'Jolly', percentage: 70 }, { name: 'Adamant', percentage: 25 }] }),
    );

    expect(result.natureUsageCandidates.map(c => c.value)).toEqual(['Jolly', 'Adamant', 'Hardy']);
  });

  it('matches names case/whitespace-insensitively via normalizeSlug, not exact string equality', () => {
    const result = applyUsageWeighting(
      baseInference({ itemCandidates: ['Chople Berry'] }),
      usage({ items: [{ name: 'chople berry', percentage: 33 }] }),
    );

    expect(result.itemUsageCandidates).toEqual([{ value: 'Chople Berry', percentage: 33 }]);
  });

  it('never-empty-axis fallback: falls back to the full unranked candidate list when every candidate has zero ladder usage', () => {
    const result = applyUsageWeighting(
      baseInference(),
      usage({ abilities: [{ name: 'Some Other Ability', percentage: 100 }] }), // matches neither candidate
    );

    expect(result.abilityUsageCandidates).toEqual([
      { value: 'Sand Veil', percentage: 0 }, { value: 'Rough Skin', percentage: 0 },
    ]);
  });

  it('a locked axis (already narrowed to one candidate) is trivially reproduced, never filtered away to nothing', () => {
    const result = applyUsageWeighting(
      baseInference({ abilityCandidates: ['Sand Veil'] }),
      usage({ abilities: [{ name: 'Rough Skin', percentage: 100 }] }), // the locked value itself is absent from the ladder
    );

    expect(result.abilityUsageCandidates).toEqual([{ value: 'Sand Veil', percentage: 0 }]);
  });

  it('an empty base candidate list (e.g. no defender species yet) stays empty rather than fabricating entries', () => {
    const result = applyUsageWeighting(
      baseInference({ abilityCandidates: [] }),
      usage({ abilities: [{ name: 'Sand Veil', percentage: 90 }] }),
    );

    expect(result.abilityUsageCandidates).toEqual([]);
  });
});
