/**
 * Switch-In Ability Effects (Battle Logger stat-stage tracking)
 * A small curated list of abilities with an unambiguous, field-wide effect
 * on switch-in - deliberately not exhaustive. The Battle Logger surfaces a
 * one-tap "apply" chip for these (see Battlefield.tsx/BattlefieldSlot.tsx
 * and OpponentInfoTags.tsx) rather than ever auto-applying, matching the
 * "manual log, not a simulator" philosophy used for the Protect-fail chip.
 *
 * Deliberately excludes Download: its target stat (Atk or SpA) depends on
 * comparing the opposing side's average Def/SpDef, which needs base-stat
 * math this pass doesn't take on - a known gap, not an oversight.
 */

import type { StatKey, WeatherType, TerrainType } from '../types/pokemon';

export type SwitchInEffect =
  | { kind: 'stat'; stat: StatKey; stages: number; target: 'self' | 'opposing-active' }
  | { kind: 'weather'; weather: WeatherType }
  | { kind: 'terrain'; terrain: TerrainType };

const SWITCH_IN_ABILITY_EFFECTS: Record<string, SwitchInEffect> = {
  'intimidate': { kind: 'stat', stat: 'atk', stages: -1, target: 'opposing-active' },
  'intrepid-sword': { kind: 'stat', stat: 'atk', stages: 1, target: 'self' },
  'dauntless-shield': { kind: 'stat', stat: 'def', stages: 1, target: 'self' },
  'drought': { kind: 'weather', weather: 'sun' },
  'drizzle': { kind: 'weather', weather: 'rain' },
  'sand-stream': { kind: 'weather', weather: 'sand' },
  'snow-warning': { kind: 'weather', weather: 'snow' },
  'electric-surge': { kind: 'terrain', terrain: 'electric' },
  'grassy-surge': { kind: 'terrain', terrain: 'grassy' },
  'misty-surge': { kind: 'terrain', terrain: 'misty' },
  'psychic-surge': { kind: 'terrain', terrain: 'psychic' },
};

export function getSwitchInEffect(ability: string | undefined): SwitchInEffect | null {
  if (!ability) return null;
  const slug = ability.toLowerCase().trim().replace(/\s+/g, '-');
  return SWITCH_IN_ABILITY_EFFECTS[slug] ?? null;
}
