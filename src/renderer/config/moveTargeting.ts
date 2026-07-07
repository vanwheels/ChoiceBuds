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
  'user-and-allies': 'all-allies',
  'all-allies': 'all-allies',
  'all-other-pokemon': 'all-except-self',
  'all-pokemon': 'all-except-self',
  'entire-field': 'field',
  'users-field': 'field',
  'opponents-field': 'field',
  'specific-move': 'field',
  'fainting-pokemon': 'field',
};

export function getTargetCategory(rawTarget: string | undefined): TargetCategory {
  if (!rawTarget) return 'unknown';
  return TARGET_CATEGORY_MAP[rawTarget] ?? 'unknown';
}
