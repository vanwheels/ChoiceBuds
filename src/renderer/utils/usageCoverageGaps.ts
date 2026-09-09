/**
 * usageCoverageGaps.ts - Team Gap Analysis (Moveset+Ability-Aware Coverage)
 * Scoped in Ability/Moveset/Speed-Aware Redesign's Leg 1 (see COMPLETED.md).
 * A second, additive lens on top of utils/usageThreats.ts's typing-only gap
 * list: instead of checking a threat's raw species types, this resolves the
 * *effective* type of each of its top-N ranked-usage moves (through its own
 * top-ranked ability, via config/typeChangingAbilities.ts - same lookup
 * hooks/useTeamMoveTypes.ts already does for the player's own team) and
 * checks team resistance against those effective types instead - same
 * slotResistsThreat check usageThreats.ts uses, just fed a different type
 * list. This can surface a gap typing-only analysis misses entirely: a team
 * slot that resists a threat's own types on paper but not the specific
 * move(s) it's actually likely to carry (a coverage move, or a type-changing
 * ability retyping a move away from the species' own typing).
 *
 * Deliberately does not de-duplicate against usageThreats.ts's own output -
 * this is an independent, additive section (see UsageThreatsList.tsx), not a
 * replacement or a refinement pass over the other two lists.
 */

import { type DefendingSlot } from './typeCoverage';
import { slotResistsThreat, USAGE_THREAT_RANK_CUTOFF } from './usageThreats';
import { getEffectiveMoveType } from '../config/typeChangingAbilities';

/**
 * How many of a threat's top-ranked-usage moves to consider. Hand-picked
 * default, same "unmeasured, flag as tunable" status as
 * USAGE_THREAT_RANK_CUTOFF - revisit once this list is live with real data.
 */
export const COVERAGE_GAP_MOVE_CUTOFF = 2;

/** One of a threat's top-ranked-usage moves, with its base (unmodified) type already resolved via GameDataCache.moves. */
export interface RankedMoveWithType {
  name: string;
  type: string;
}

export interface MovesetGapCandidate {
  species: string;
  spriteUrl: string;
  columnPosition: number;
  /** The threat's own top-ranked-usage ability (GameDataCache.usage[species].abilities[0]), if any usage data exists for it. */
  topAbility?: string;
  /** Already sliced to COVERAGE_GAP_MOVE_CUTOFF and filtered to moves with cached move data - see TypeMatchupPage.tsx. */
  topMoves: RankedMoveWithType[];
}

export interface MovesetCoverageGapThreat {
  species: string;
  /** The effective types of the threat's considered top moves (post-ability) - not the species' own typing. Same field name as UsageThreat.types so UsageThreatsList's ThreatRow can render either shape's badges. */
  types: string[];
  columnPosition: number;
  spriteUrl: string;
}

/**
 * Ranked (by columnPosition ascending) list of usage-eligible threats no
 * team slot resists once their likely moves' effective types (rather than
 * their raw species types) are considered. A candidate with no resolvable
 * move types (no cached move data yet for any of its top moves) is excluded
 * rather than treated as an automatic gap.
 */
export function computeMovesetCoverageGaps(
  defenders: DefendingSlot[],
  candidates: MovesetGapCandidate[]
): MovesetCoverageGapThreat[] {
  return candidates
    .filter(c => c.columnPosition <= USAGE_THREAT_RANK_CUTOFF)
    .map((c): MovesetCoverageGapThreat => ({
      species: c.species,
      columnPosition: c.columnPosition,
      spriteUrl: c.spriteUrl,
      types: [...new Set(c.topMoves.map(m => getEffectiveMoveType(m.name, m.type, c.topAbility)))],
    }))
    .filter(c => c.types.length > 0 && defenders.every(d => !slotResistsThreat(c.types, d)))
    .sort((a, b) => a.columnPosition - b.columnPosition);
}
