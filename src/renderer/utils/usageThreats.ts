/**
 * usageThreats.ts - Team Gap Analysis (Ranked Usage Threats)
 * Pure function pairing Pokemon Champions ranked-ladder usage
 * (GameDataCache.usage's columnPosition - see ChampionsUsageEntry's doc
 * comment) with each species' own typing to answer "which real,
 * commonly-used Pokemon does this team have no typing answer for at all?"
 * Mirrors utils/typeCoverage.ts's shape - team defending-types-by-slot in,
 * ranked/filtered list out - but species-level (real Pokemon, their actual
 * 1-2 types) rather than a per-type-row pass over the 18-type chart.
 *
 * Typing-only, same scope as computeDefensiveCoverage: deliberately doesn't
 * factor in a threat's actual likely moveset/coverage - that stays
 * "unconfirmed suggestion" territory per ChampionsUsageEntry's own doc
 * comment, not blended into a typing-fact list. Does account for the team's
 * own defensive ability overrides (Levitate/Water Absorb/etc.) via
 * typeCoverage.ts's `getDefensiveMultiplier`, same as computeDefensiveCoverage -
 * a teammate that fully no-sells one of a threat's types now counts as
 * covering it.
 *
 * Also exports computePartiallyCoveredUsageThreats - threats resisted by
 * exactly one team slot. Original computeUsageThreats is all-or-nothing:
 * a threat resisted by even one otherwise-weak teammate is fully excluded,
 * even if nothing else on the team can actually handle it either. A
 * resist-count of exactly 1 is a fragile answer worth surfacing separately
 * (see TODO.md's Partial/Scored Gaps leg) rather than treated the same as a
 * threat 2+ slots shrug off.
 */

import { type DefendingSlot, getDefensiveMultiplier } from './typeCoverage';

/**
 * Top-N ladder usage cutoff (lower columnPosition = more used). Hand-picked
 * default, not measured against real distribution yet - revisit once the
 * list is live and populated with real numbers if 50 feels too
 * sparse/noisy (see TODO.md).
 */
export const USAGE_THREAT_RANK_CUTOFF = 50;

export interface UsageThreat {
  species: string;
  types: string[];
  columnPosition: number;
  spriteUrl: string;
}

/** UsageThreat resisted/immune-to by exactly one team slot - see computePartiallyCoveredUsageThreats. */
export interface PartiallyCoveredUsageThreat extends UsageThreat {
  /** Always 1 by construction (see computePartiallyCoveredUsageThreats's filter) - kept as a field rather than a boolean so a future looser threshold doesn't need a shape change. */
  resistCount: number;
}

/**
 * Whether one team slot resists or is immune to every one of a threat's
 * attacking types - i.e. its best (max) effectiveness against that slot is
 * < 1. Same Math.max(...) pattern computeOffensiveCoverage uses. Exported
 * for utils/usageCoverageGaps.ts, which runs the same check against a
 * threat's likely moves' effective types rather than its raw species types.
 */
export function slotResistsThreat(threatTypes: string[], defender: DefendingSlot): boolean {
  return Math.max(...threatTypes.map(t => getDefensiveMultiplier(t, defender.types, defender.ability))) < 1;
}

/**
 * Ranked (by columnPosition ascending) list of usage-eligible threats
 * (columnPosition <= USAGE_THREAT_RANK_CUTOFF) that no team slot resists or
 * is immune to.
 */
export function computeUsageThreats(defenders: DefendingSlot[], candidates: UsageThreat[]): UsageThreat[] {
  return candidates
    .filter(c => c.columnPosition <= USAGE_THREAT_RANK_CUTOFF)
    .filter(c => defenders.every(d => !slotResistsThreat(c.types, d)))
    .sort((a, b) => a.columnPosition - b.columnPosition);
}

/**
 * Ranked (by columnPosition ascending) list of usage-eligible threats
 * resisted or immune-to by exactly one team slot - a fragile single answer,
 * distinct from computeUsageThreats' fully-unanswered list (0 resisting
 * slots) and from a threat 2+ slots cover (excluded from both lists).
 */
export function computePartiallyCoveredUsageThreats(
  defenders: DefendingSlot[],
  candidates: UsageThreat[]
): PartiallyCoveredUsageThreat[] {
  return candidates
    .filter(c => c.columnPosition <= USAGE_THREAT_RANK_CUTOFF)
    .map(c => ({ ...c, resistCount: defenders.filter(d => slotResistsThreat(c.types, d)).length }))
    .filter(c => c.resistCount === 1)
    .sort((a, b) => a.columnPosition - b.columnPosition);
}
