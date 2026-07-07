/**
 * Reactive Stat-Raise Abilities (Battle Logger stat-stage tracking)
 * Abilities that raise the OWNER's own stat when any of their stats gets
 * lowered - Defiant/Competitive are the common VGC examples. Distinct from
 * config/onSwitchInAbilities.ts (which triggers on switch-in, not on being
 * lowered) - see Battlefield.tsx/BattlefieldSlot.tsx for the chip and
 * utils/battleLookup.ts::hasUnappliedReactiveLowerEffect for when it shows.
 */

import type { StatKey } from '../types/pokemon';

export interface ReactiveLowerEffect {
  stat: StatKey;
  stages: number;
}

const REACTIVE_ON_STAT_LOWERED: Record<string, ReactiveLowerEffect> = {
  'defiant': { stat: 'atk', stages: 2 },
  'competitive': { stat: 'spa', stages: 2 },
};

export function getReactiveLowerEffect(ability: string | undefined): ReactiveLowerEffect | null {
  if (!ability) return null;
  const slug = ability.toLowerCase().trim().replace(/\s+/g, '-');
  return REACTIVE_ON_STAT_LOWERED[slug] ?? null;
}
