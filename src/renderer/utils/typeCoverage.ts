/**
 * typeCoverage.ts - Team-Wide Offensive/Defensive Type Coverage Matrices
 * Pure functions over config/typeEffectiveness.ts's existing chart - no new
 * type-effectiveness data, just per-team aggregation for the Type Matchup
 * page's two coverage tables (components/typematchup/).
 */

import { ALL_TYPES, getEffectivenessMultiplier } from '../config/typeEffectiveness';

export interface CoverageRow {
  type: string;
  /** One entry per team slot, parallel to the pokemon array the caller passed in. null = no data for that slot (offensive only - a pokemon with no damaging moves at all). */
  cells: (number | null)[];
  /** Count of slots landing on the "bad" side of neutral for this row's type - Not Very Effective/immune (offense) or Weak (defense). */
  unfavorableCount: number;
  /** Count of slots landing on the "good" side of neutral - Super Effective (offense) or Resist/immune (defense). */
  favorableCount: number;
}

/**
 * For each of the 18 types, the best (max) effectiveness each team member's
 * damaging moves would achieve against a hypothetical mono-type defender of
 * that type - i.e. "can this team hit a Fire-type opponent hard?" Status
 * moves are the caller's responsibility to have already filtered out (see
 * hooks/useTeamMoveTypes.ts), since a move with no damage class doesn't
 * meaningfully "hit" anything.
 */
export function computeOffensiveCoverage(moveTypesByPokemon: string[][]): CoverageRow[] {
  return ALL_TYPES.map(type => {
    const cells = moveTypesByPokemon.map(moveTypes =>
      moveTypes.length === 0 ? null : Math.max(...moveTypes.map(mt => getEffectivenessMultiplier(mt, [type])))
    );
    return {
      type,
      cells,
      unfavorableCount: cells.filter(c => c !== null && c < 1).length,
      favorableCount: cells.filter(c => c !== null && c > 1).length,
    };
  });
}

/**
 * For each of the 18 attacking types, how each team member's own (1-2) types
 * take that hit - i.e. the team's shared weaknesses/resistances.
 */
export function computeDefensiveCoverage(defendingTypesByPokemon: string[][]): CoverageRow[] {
  return ALL_TYPES.map(type => {
    const cells = defendingTypesByPokemon.map(defTypes => getEffectivenessMultiplier(type, defTypes));
    return {
      type,
      cells,
      unfavorableCount: cells.filter(c => c !== null && c > 1).length,
      favorableCount: cells.filter(c => c !== null && c < 1).length,
    };
  });
}
