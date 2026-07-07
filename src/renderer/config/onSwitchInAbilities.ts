/**
 * Switch-In Ability Effects (Battle Logger stat-stage tracking)
 * A small curated list of abilities with an unambiguous, field-wide stat
 * effect on switch-in - deliberately not exhaustive. The Battle Logger
 * surfaces a one-tap "apply" chip for these (see Battlefield.tsx and
 * OpponentInfoTags.tsx) rather than ever auto-applying, matching the
 * "manual log, not a simulator" philosophy used for the Protect-fail chip.
 *
 * Deliberately excludes Download: its target stat (Atk or SpA) depends on
 * comparing the opposing side's average Def/SpDef, which needs base-stat
 * math this pass doesn't take on - a known gap, not an oversight.
 */

import type { StatKey } from '../types/pokemon';

export interface SwitchInEffect {
  stat: StatKey;
  stages: number;
  target: 'self' | 'opposing-active';
}

const SWITCH_IN_ABILITY_EFFECTS: Record<string, SwitchInEffect> = {
  'intimidate': { stat: 'atk', stages: -1, target: 'opposing-active' },
  'intrepid-sword': { stat: 'atk', stages: 1, target: 'self' },
  'dauntless-shield': { stat: 'def', stages: 1, target: 'self' },
};

export function getSwitchInEffect(ability: string | undefined): SwitchInEffect | null {
  if (!ability) return null;
  const slug = ability.toLowerCase().trim().replace(/\s+/g, '-');
  return SWITCH_IN_ABILITY_EFFECTS[slug] ?? null;
}
