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

/**
 * Ranked (by columnPosition ascending) list of usage-eligible threats
 * (columnPosition <= USAGE_THREAT_RANK_CUTOFF) that no team slot resists or
 * is immune to - i.e. for every team slot, the threat's own types' best
 * (max) effectiveness against that slot's defending types (and ability) is
 * >= 1. Same Math.max(...) pattern computeOffensiveCoverage uses, just
 * driven by a real species' own types instead of a move list.
 */
export function computeUsageThreats(defenders: DefendingSlot[], candidates: UsageThreat[]): UsageThreat[] {
  return candidates
    .filter(c => c.columnPosition <= USAGE_THREAT_RANK_CUTOFF)
    .filter(c =>
      defenders.every(
        d => Math.max(...c.types.map(t => getDefensiveMultiplier(t, d.types, d.ability))) >= 1
      )
    )
    .sort((a, b) => a.columnPosition - b.columnPosition);
}
