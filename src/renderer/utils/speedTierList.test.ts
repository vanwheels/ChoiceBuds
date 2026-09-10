import { describe, expect, it } from 'vitest';
import type { TeamSpeedEntry, ThreatSpeedProfile } from './speedTiers';
import { buildSpeedTierEntries, filterSpeedTierEntries, groupSpeedTiers, SPREAD_USAGE_CUTOFF_PERCENT, type ThreatTierInput } from './speedTierList';

function teamEntry(overrides: Partial<TeamSpeedEntry> = {}): TeamSpeedEntry {
  return { pokemonId: 'p1', species: 'Incineroar', spriteUrl: 'incineroar.png', speed: 100, ...overrides };
}

function threatInput(overrides: Partial<ThreatSpeedProfile> = {}): ThreatTierInput {
  const profile: ThreatSpeedProfile = {
    species: 'Chien-Pao',
    spreads: [
      { speed: 200, percentage: 60 },
      { speed: 180, percentage: 30 },
    ],
    bounds: { min: 90, neutral: 150, max: 300 },
    ...overrides,
  };
  return { spriteUrl: 'chien-pao.png', profile, types: ['Dark', 'Ice'] };
}

describe('buildSpeedTierEntries', () => {
  it('emits one row per team member', () => {
    const entries = buildSpeedTierEntries([teamEntry()], []);
    expect(entries).toEqual([
      { key: 'team-p1', kind: 'team', species: 'Incineroar', spriteUrl: 'incineroar.png', speed: 100 },
    ]);
  });

  it('emits one row per threat spread above the usage cutoff, plus 3 min/neutral/max bound rows', () => {
    const entries = buildSpeedTierEntries([], [threatInput()]);
    expect(entries).toHaveLength(5); // 2 spreads (both above cutoff) + 3 bounds
    expect(entries[0]).toMatchObject({ key: 'threat-Chien-Pao-spread-0', speed: 200, percentage: 60 });
    expect(entries[1]).toMatchObject({ key: 'threat-Chien-Pao-spread-1', speed: 180, percentage: 30 });
    expect(entries[2]).toMatchObject({ key: 'threat-Chien-Pao-bound-min', speed: 90, boundLabel: 'Min' });
    expect(entries[3]).toMatchObject({ key: 'threat-Chien-Pao-bound-neutral', speed: 150, boundLabel: 'Neutral' });
    expect(entries[4]).toMatchObject({ key: 'threat-Chien-Pao-bound-max', speed: 300, boundLabel: 'Max' });
  });

  it('drops a spread at or below the usage cutoff but keeps the bound rows', () => {
    const belowCutoff = threatInput({
      spreads: [
        { speed: 200, percentage: 60 },
        { speed: 180, percentage: SPREAD_USAGE_CUTOFF_PERCENT - 1 },
      ],
    });
    const entries = buildSpeedTierEntries([], [belowCutoff]);
    expect(entries.filter(e => e.percentage !== undefined)).toHaveLength(1);
    expect(entries.filter(e => e.boundLabel !== undefined)).toHaveLength(3);
  });

  it('combines team and threat rows', () => {
    const entries = buildSpeedTierEntries([teamEntry()], [threatInput()]);
    expect(entries).toHaveLength(6);
  });

  it('adds two Live Calc rows for a pinned threat with a widened inferred bound', () => {
    const pinned = threatInput();
    pinned.inferredBound = { min: 120, max: 160 };
    const entries = buildSpeedTierEntries([], [pinned]);
    const liveRows = entries.filter(e => e.isLiveCalcBound);
    expect(liveRows).toEqual([
      { key: 'threat-Chien-Pao-live-min', kind: 'threat', species: 'Chien-Pao', spriteUrl: 'chien-pao.png', speed: 120, boundLabel: 'Live Min', isLiveCalcBound: true },
      { key: 'threat-Chien-Pao-live-max', kind: 'threat', species: 'Chien-Pao', spriteUrl: 'chien-pao.png', speed: 160, boundLabel: 'Live Max', isLiveCalcBound: true },
    ]);
  });

  it('adds a single Live Calc row when the pinned inferred bound has collapsed to one value', () => {
    const pinned = threatInput();
    pinned.inferredBound = { min: 140, max: 140 };
    const entries = buildSpeedTierEntries([], [pinned]);
    const liveRows = entries.filter(e => e.isLiveCalcBound);
    expect(liveRows).toEqual([
      { key: 'threat-Chien-Pao-live', kind: 'threat', species: 'Chien-Pao', spriteUrl: 'chien-pao.png', speed: 140, boundLabel: 'Live', isLiveCalcBound: true },
    ]);
  });

  it('adds no Live Calc rows for an unpinned threat', () => {
    const entries = buildSpeedTierEntries([], [threatInput()]);
    expect(entries.some(e => e.isLiveCalcBound)).toBe(false);
  });
});

describe('filterSpeedTierEntries', () => {
  const entries = buildSpeedTierEntries([teamEntry()], [threatInput()]);

  it('returns all entries unchanged for a blank query', () => {
    expect(filterSpeedTierEntries(entries, '   ')).toEqual(entries);
  });

  it('keeps only entries whose species matches, case-insensitively', () => {
    const filtered = filterSpeedTierEntries(entries, 'chien');
    expect(filtered.every(e => e.species === 'Chien-Pao')).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(entries.length);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterSpeedTierEntries(entries, 'not a real species')).toEqual([]);
  });
});

describe('groupSpeedTiers', () => {
  it('sorts descending by default and groups equal-speed entries together', () => {
    const entries = buildSpeedTierEntries([teamEntry({ speed: 180 })], [threatInput()]);
    const groups = groupSpeedTiers(entries, false);
    expect(groups.map(g => g.speed)).toEqual([300, 200, 180, 150, 90]);
    const tieGroup = groups.find(g => g.speed === 180);
    expect(tieGroup?.entries).toHaveLength(2); // team's 180 ties the threat's second spread
  });

  it('sorts ascending under Trick Room', () => {
    const entries = buildSpeedTierEntries([teamEntry({ speed: 50 })], [threatInput()]);
    const groups = groupSpeedTiers(entries, true);
    expect(groups.map(g => g.speed)).toEqual([50, 90, 150, 180, 200, 300]);
  });

  it('returns no groups for an empty entry list', () => {
    expect(groupSpeedTiers([], false)).toEqual([]);
  });
});
