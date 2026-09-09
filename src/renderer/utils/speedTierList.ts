/**
 * speedTierList.ts - Speed Tiers View Shell (Leg 3, see TODO.md)
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
 * entry (not just its top-ranked build) - each real, independently-usage-
 * ranked spread is its own honest speed value, same reasoning speedTiers.ts's
 * header gives for not crossing spreads with nature/item combinatorially.
 * modifierNotes (nature/item deltas, already anchored to the top-ranked
 * spread by computeThreatSpeedProfile) are only attached to that spread's
 * row - they're annotations on the "most likely" build, not separate rows.
 */
import type { ThreatSpeedModifierNote, ThreatSpeedProfile, TeamSpeedEntry } from './speedTiers';

export interface SpeedTierEntry {
  key: string;
  kind: 'team' | 'threat';
  species: string;
  spriteUrl: string;
  speed: number;
  /** Threat rows only - this spread's share of the species' real ranked usage. */
  percentage?: number;
  /** Threat rows only, and only on the top-ranked (index 0) spread row - see this file's header. */
  modifierNotes?: ThreatSpeedModifierNote[];
}

export interface SpeedTierGroup {
  speed: number;
  entries: SpeedTierEntry[];
}

export interface ThreatTierInput {
  spriteUrl: string;
  profile: ThreatSpeedProfile;
}

/** Flattens a team's per-Pokemon speeds and every threat's per-spread speeds into one unsorted row list. */
export function buildSpeedTierEntries(team: TeamSpeedEntry[], threats: ThreatTierInput[]): SpeedTierEntry[] {
  const teamRows: SpeedTierEntry[] = team.map(t => ({
    key: `team-${t.pokemonId}`,
    kind: 'team',
    species: t.species,
    spriteUrl: t.spriteUrl,
    speed: t.speed,
  }));

  const threatRows: SpeedTierEntry[] = threats.flatMap(({ spriteUrl, profile }) =>
    profile.spreads.map((spread, i) => ({
      key: `threat-${profile.species}-${i}`,
      kind: 'threat' as const,
      species: profile.species,
      spriteUrl,
      speed: spread.speed,
      percentage: spread.percentage,
      modifierNotes: i === 0 ? profile.modifierNotes : undefined,
    }))
  );

  return [...teamRows, ...threatRows];
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
