/**
 * Move Targeting Reference (Battle Logger click-to-log flow)
 * Maps PokeAPI's raw move `target` slug (see MoveData.target) to a coarse
 * category the Battlefield can act on in a 2v2 doubles field - either
 * auto-resolving the target(s) with no extra click, or highlighting the
 * slot(s) that make sense to click. This is a helpful default only: the
 * Battlefield always allows a manual click on any slot regardless of what's
 * highlighted, since this is a log, not a rules enforcer.
 */

export type TargetCategory =
  | 'self'
  | 'single-foe'
  | 'all-foes'
  | 'single-ally'
  | 'all-allies'
  | 'other-allies'
  | 'all-except-self'
  | 'field'
  | 'unknown';

const TARGET_CATEGORY_MAP: Record<string, TargetCategory> = {
  'user': 'self',
  'selected-pokemon': 'single-foe',
  'selected-pokemon-me-first': 'single-foe',
  'random-opponent': 'single-foe',
  'all-opponents': 'all-foes',
  'ally': 'single-ally',
  'user-or-ally': 'single-ally',
  // PokeAPI distinguishes these two: 'user-and-allies' includes the mover
  // itself (e.g. Life Dew), 'all-allies' means every OTHER Pokemon on the
  // user's side, explicitly excluding the user - collapsing them into one
  // category previously meant any "all-allies"-shaped move always included
  // the user, whether or not that was actually correct.
  'user-and-allies': 'all-allies',
  'all-allies': 'other-allies',
  'all-other-pokemon': 'all-except-self',
  'all-pokemon': 'all-except-self',
  'entire-field': 'field',
  'users-field': 'field',
  'opponents-field': 'field',
  'specific-move': 'field',
  'fainting-pokemon': 'field',
};

/**
 * PokeAPI's raw `target` field is occasionally just wrong for a specific
 * move, not merely coarse - Coaching is the one confirmed case: PokeAPI
 * reports "user-and-allies" (would include the user), but Coaching's own
 * documented effect explicitly excludes the user ("boosts the Attack and
 * Defense of all allies (but not the user...)"). Checked by move name
 * before the raw-target mapping - same override-table pattern already used
 * elsewhere in this app for other PokeAPI data gaps (see
 * config/championsMoveOverrides.ts), just keyed on target category instead
 * of power/accuracy/description.
 */
const MOVE_TARGET_OVERRIDES: Record<string, TargetCategory> = {
  'coaching': 'other-allies',
};

export function getTargetCategory(rawTarget: string | undefined, moveName?: string): TargetCategory {
  const override = moveName ? MOVE_TARGET_OVERRIDES[moveName.toLowerCase().trim().replace(/\s+/g, '-')] : undefined;
  if (override) return override;
  if (!rawTarget) return 'unknown';
  return TARGET_CATEGORY_MAP[rawTarget] ?? 'unknown';
}
