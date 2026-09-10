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
 *
 * A threat also contributes 1-2 Live Calc rows when the caller supplies an
 * `inferredBound` (Live Calc -> Speed Tiers Tie-in, Leg 6, see TODO.md /
 * hooks/useLiveCalcThreatPins.ts) - a real turn-order-narrowed Speed range
 * for that exact species, pinned from the Live Calc tab. These are additive
 * (`isLiveCalcBound: true`), annotating the threat's generic usage rows
 * rather than replacing them - the usage spreads/bounds still show what's
 * statistically likely, while the Live Calc rows show what this specific
 * opponent's Pokémon has actually been observed to do. One row when the
 * narrowed range has collapsed to a single Speed value, two (min/max)
 * otherwise.
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
  /** Threat bound rows only - which reference tier this is: the 3 fixed generic ones, or a Live Calc-pinned observed range (see isLiveCalcBound). */
  boundLabel?: 'Min' | 'Neutral' | 'Max' | 'Live' | 'Live Min' | 'Live Max';
  /** True for a Live Calc-pinned row (Leg 6) - a real, turn-order-narrowed range for this exact opponent Pokémon, not a generic usage/bound number, so it renders distinctly from the dimmed generic bound rows. */
  isLiveCalcBound?: boolean;
}

export interface SpeedTierGroup {
  speed: number;
  entries: SpeedTierEntry[];
}

export interface ThreatTierInput {
  spriteUrl: string;
  profile: ThreatSpeedProfile;
  /** Live Calc -> Speed Tiers Tie-in (Leg 6): a pinned, turn-order-narrowed
   * Speed bound for this exact threat species (utils/speedTiers.ts::
   * computeInferredThreatSpeedBound). Undefined when nothing's pinned for
   * this species - the common case. */
  inferredBound?: { min: number; max: number };
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

  const threatRows: SpeedTierEntry[] = threats.flatMap(({ spriteUrl, profile, inferredBound }) => {
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

    const liveCalcRows: SpeedTierEntry[] = !inferredBound
      ? []
      : inferredBound.min === inferredBound.max
        ? [{
            key: `threat-${profile.species}-live`,
            kind: 'threat' as const,
            species: profile.species,
            spriteUrl,
            speed: inferredBound.min,
            boundLabel: 'Live' as const,
            isLiveCalcBound: true,
          }]
        : [
            {
              key: `threat-${profile.species}-live-min`,
              kind: 'threat' as const,
              species: profile.species,
              spriteUrl,
              speed: inferredBound.min,
              boundLabel: 'Live Min' as const,
              isLiveCalcBound: true,
            },
            {
              key: `threat-${profile.species}-live-max`,
              kind: 'threat' as const,
              species: profile.species,
              spriteUrl,
              speed: inferredBound.max,
              boundLabel: 'Live Max' as const,
              isLiveCalcBound: true,
            },
          ];

    return [...spreadRows, ...boundRows, ...liveCalcRows];
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
