import { describe, expect, it } from 'vitest';
import type { TeamSpeedEntry, ThreatSpeedProfile } from './speedTiers';
import { buildSpeedTierEntries, groupSpeedTiers, type ThreatTierInput } from './speedTierList';

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
    modifierNotes: [{ kind: 'item', label: 'Choice Scarf', percentage: 20, speed: 300 }],
    ...overrides,
  };
  return { spriteUrl: 'chien-pao.png', profile };
}

describe('buildSpeedTierEntries', () => {
  it('emits one row per team member', () => {
    const entries = buildSpeedTierEntries([teamEntry()], []);
    expect(entries).toEqual([
      { key: 'team-p1', kind: 'team', species: 'Incineroar', spriteUrl: 'incineroar.png', speed: 100 },
    ]);
  });

  it('emits one row per threat spread, attaching modifierNotes only to the top-ranked (index 0) spread', () => {
    const entries = buildSpeedTierEntries([], [threatInput()]);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ key: 'threat-Chien-Pao-0', speed: 200, percentage: 60 });
    expect(entries[0].modifierNotes).toHaveLength(1);
    expect(entries[1]).toMatchObject({ key: 'threat-Chien-Pao-1', speed: 180, percentage: 30 });
    expect(entries[1].modifierNotes).toBeUndefined();
  });

  it('combines team and threat rows', () => {
    const entries = buildSpeedTierEntries([teamEntry()], [threatInput()]);
    expect(entries).toHaveLength(3);
  });
});

describe('groupSpeedTiers', () => {
  it('sorts descending by default and groups equal-speed entries together', () => {
    const entries = buildSpeedTierEntries([teamEntry({ speed: 180 })], [threatInput()]);
    const groups = groupSpeedTiers(entries, false);
    expect(groups.map(g => g.speed)).toEqual([200, 180]);
    expect(groups[1].entries).toHaveLength(2); // team's 180 ties the threat's second spread
  });

  it('sorts ascending under Trick Room', () => {
    const entries = buildSpeedTierEntries([teamEntry({ speed: 50 })], [threatInput()]);
    const groups = groupSpeedTiers(entries, true);
    expect(groups.map(g => g.speed)).toEqual([50, 180, 200]);
  });

  it('returns no groups for an empty entry list', () => {
    expect(groupSpeedTiers([], false)).toEqual([]);
  });
});
