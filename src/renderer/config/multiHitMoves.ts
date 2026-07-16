/**
 * Multi-Hit Moves (Battle Logger)
 * Moves that strike more than once per use (Bullet Seed, Population Bomb,
 * Triple Axel, etc.) - MoveOutcomePrompt.tsx surfaces a "Hits: N" picker for
 * these alongside the Miss/Crit/No Effect/Blocked chips, since the real hit
 * count is random (or, for `multiaccuracy` moves, independently rolled per
 * hit) and can't be inferred from the move name alone - the user has to
 * report what they actually watched land, same manual-confirmation
 * philosophy as the outcome chips.
 *
 * `min`/`max` is the range of hits possible *given the move connects at
 * all* - a full miss is already covered by the existing "Miss" outcome
 * chip, not a `hits: 0` entry here. For `multiaccuracy` moves (Triple Kick/
 * Axel, Population Bomb - each hit rolls its own accuracy) `min` is always
 * 1, since any hit after the first can independently fail; for every other
 * multi-hit move a single accuracy check covers the whole flurry, so `min`
 * is the move's real minimum (2 for the "2-5 hit" family, or the fixed
 * count for moves like Dragon Darts/Surging Strikes that always hit an
 * exact number of times once they connect).
 *
 * Deliberately excluded: Beat Up - its hit count is dynamic (one hit per
 * uninflicted, unfainted, non-status-conditioned Pokemon on the user's
 * team), not a static range this table can express; nothing to log beyond
 * the move's normal single BattleAction.
 *
 * Data generated from @smogon/calc's bundled Gen 9 Showdown movedex - see
 * scripts/generateMultiHitMoves.ts and multiHitMoves.generated.ts. No
 * Champions-specific hit-count deviations are known (championsMoveOverrides.ts
 * has power/accuracy corrections for a couple of these moves, e.g. Bone
 * Rush/Gear Grind, but never touches hit count) - revisit if one turns up.
 */
import { MULTI_HIT_MOVES_DATA } from './multiHitMoves.generated';

export interface MultiHitRange {
  min: number;
  max: number;
}

export function getMultiHitRange(move: string | undefined): MultiHitRange | null {
  if (!move) return null;
  return MULTI_HIT_MOVES_DATA[move.toLowerCase().trim().replace(/\s+/g, '-')] ?? null;
}
