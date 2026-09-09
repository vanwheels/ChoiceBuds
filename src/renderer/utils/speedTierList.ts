/**
 * speedTierList.ts - Speed Tiers View Shell
 * Pure functions merging speedTiers.ts's per-Pokemon output
 * (computeTeamSpeed/computeThreatSpeedProfile) into one sorted, tie-grouped
 * list - the actual "tier list" the view renders. Kept separate from
 * speedTiers.ts itself since that file is explicitly scoped to per-Pokemon
 * Speed math only and defers sort-direction/merging to "whatever consumes
 * its output" (see its header) - this is that consumer's own pure layer,
 * split out from the page component so it's independently unit-testable
 * (project convention - see CLAUDE.md's Testing section).
 *
 * A threat contributes one tier-list row per ChampionsUsageEntry.statSpreads
 * entry above SPREAD_USAGE_CUTOFF_PERCENT (not just its top-ranked build) -
 * each real, independently-usage-ranked spread above the floor is its own
 * honest speed value, same reasoning speedTiers.ts's header gives for not
 * crossing spreads with nature/item combinatorially. It also contributes 3
 * bound rows (min/neutral/max - see ThreatSpeedBounds), unfiltered by the
 * cutoff since they aren't usage data to begin with.
 */
import type { ThreatSpeedBounds, ThreatSpeedProfile, TeamSpeedEntry } from './speedTiers';

/** Minimum real usage share (%) a ranked spread needs to get its own plotted row - see this file's header. Tunable; not derived from any measured distribution yet. */
export const SPREAD_USAGE_CUTOFF_PERCENT = 10;

const BOUND_LABELS: { key: keyof ThreatSpeedBounds; label: 'Min' | 'Neutral' | 'Max' }[] = [
  { key: 'min', label: 'Min' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'max', label: 'Max' },
];

export interface SpeedTierEntry {
  key: string;
  kind: 'team' | 'threat';
  species: string;
  spriteUrl: string;
  speed: number;
  /** Threat spread rows only - this spread's share of the species' real ranked usage. */
  percentage?: number;
  /** Threat bound rows only - which of the 3 fixed min/neutral/max reference tiers this is. */
  boundLabel?: 'Min' | 'Neutral' | 'Max';
}

export interface SpeedTierGroup {
  speed: number;
  entries: SpeedTierEntry[];
}

export interface ThreatTierInput {
  spriteUrl: string;
  profile: ThreatSpeedProfile;
}

/** Flattens a team's per-Pokemon speeds and every threat's per-spread/bound speeds into one unsorted row list. */
export function buildSpeedTierEntries(team: TeamSpeedEntry[], threats: ThreatTierInput[]): SpeedTierEntry[] {
  const teamRows: SpeedTierEntry[] = team.map(t => ({
    key: `team-${t.pokemonId}`,
    kind: 'team',
    species: t.species,
    spriteUrl: t.spriteUrl,
    speed: t.speed,
  }));

  const threatRows: SpeedTierEntry[] = threats.flatMap(({ spriteUrl, profile }) => {
    const spreadRows: SpeedTierEntry[] = profile.spreads
      .filter(spread => spread.percentage >= SPREAD_USAGE_CUTOFF_PERCENT)
      .map((spread, i) => ({
        key: `threat-${profile.species}-spread-${i}`,
        kind: 'threat' as const,
        species: profile.species,
        spriteUrl,
        speed: spread.speed,
        percentage: spread.percentage,
      }));

    const boundRows: SpeedTierEntry[] = BOUND_LABELS.map(({ key, label }) => ({
      key: `threat-${profile.species}-bound-${key}`,
      kind: 'threat' as const,
      species: profile.species,
      spriteUrl,
      speed: profile.bounds[key],
      boundLabel: label,
    }));

    return [...spreadRows, ...boundRows];
  });

  return [...teamRows, ...threatRows];
}

/** Case-insensitive species-name substring filter over already-built entries - the page's search box narrowing the icon grid. Blank query returns entries unchanged. */
export function filterSpeedTierEntries(entries: SpeedTierEntry[], query: string): SpeedTierEntry[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return entries;
  return entries.filter(entry => entry.species.toLowerCase().includes(trimmed));
}

/**
 * Sorts entries into speed-value groups (descending, or ascending under
 * Trick Room - see speedTiers.ts's header on why that's a sort-direction
 * flip owned here rather than a flag on the data layer). Entries sharing a
 * speed value land in the same group, in stable input order, so a caller can
 * render a "tie" indicator per group.
 */
export function groupSpeedTiers(entries: SpeedTierEntry[], trickRoom: boolean): SpeedTierGroup[] {
  const sorted = [...entries].sort((a, b) => (trickRoom ? a.speed - b.speed : b.speed - a.speed));
  const groups: SpeedTierGroup[] = [];
  for (const entry of sorted) {
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup.speed === entry.speed) {
      currentGroup.entries.push(entry);
    } else {
      groups.push({ speed: entry.speed, entries: [entry] });
    }
  }
  return groups;
}
