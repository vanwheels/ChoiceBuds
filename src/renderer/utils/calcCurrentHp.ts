/**
 * Current-HP math for the Calc's HP % / flat pair. State stores one value
 * (`CalcPokemonState.curHp`, null = full HP); the other representation is
 * always derived, so the two can't drift out of sync.
 */

/** Current HP as a whole percent of max HP. Max HP of 0 (no species yet) reads as 100. */
export function flatHpToPercent(curHp: number, maxHp: number): number {
  if (maxHp <= 0) return 100;
  return Math.round((curHp / maxHp) * 100);
}

/** Flat HP for a percent of max, kept in 1..maxHp - a 0 HP target isn't a calc scenario. */
export function percentToFlatHp(percent: number, maxHp: number): number {
  return Math.max(1, Math.min(maxHp, Math.round((percent / 100) * maxHp)));
}

/** Normalizes a typed flat HP to state form: null at/above max (full HP), otherwise at least 1. */
export function clampCurHp(value: number, maxHp: number): number | null {
  if (value >= maxHp) return null;
  return Math.max(1, value);
}
