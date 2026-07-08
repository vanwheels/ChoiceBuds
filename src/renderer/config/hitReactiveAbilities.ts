/**
 * Hit-Triggered Reactive Abilities (Battle Logger stat-stage tracking)
 * A second reactive-ability category, distinct from config/reactiveAbilities.ts
 * (which triggers when the OWNER's own stat gets lowered - Defiant/
 * Competitive). These instead trigger when the owner is hit by an
 * attacking move matching some condition (a type, a damage category, or
 * any hit at all) - Justified/Stamina/Weak Armor/etc. Needed a different
 * effect shape entirely, not just more rows in reactiveAbilities.ts, since
 * the trigger condition is "was hit by X" rather than "had a stat lowered".
 *
 * Relies on BattleAction.moveType/moveCategory (types/pokemon.ts), snapshotted
 * at log time in Battlefield.tsx the same way `effectiveness` already is -
 * see utils/battleLookup.ts::hasUnappliedHitReactiveEffect for how a trigger
 * is detected from the logged action history alone.
 *
 * Deliberately excluded, both real abilities in this exact family but
 * needing data this app doesn't track at all:
 * - Anger Point: triggers on being hit by a CRITICAL hit specifically -
 *   nothing in the Battle Logger records whether a given hit was a crit
 *   (crit/miss tracking is an explicitly deferred future item - see
 *   "Battle Logger - beyond the core MVP" in the top-level TODO).
 * - Anger Shell, Berserk: trigger when HP drops to/below half from a hit -
 *   this app doesn't track numeric/percentage HP anywhere, only a boolean
 *   fainted flag, so "crossed the 50% threshold" isn't knowable from
 *   logged data.
 * Also simplified: Rattled's real trigger is "Bug/Ghost/Dark move OR hit by
 * Intimidate" - only the move-type half is modeled here. The Intimidate
 * half would mean cross-checking a *different* trigger source (an
 * Intimidate-application note, not a logged move action) - a real gap, not
 * an oversight, left out to keep this pass's trigger model to one shape
 * (reacting to a logged move) rather than two.
 */

import type { StatKey } from '../types/pokemon';

export type HitTrigger =
  | { kind: 'any-hit' }
  | { kind: 'category'; category: 'physical' | 'special' }
  | { kind: 'move-type'; types: string[] };

export interface HitReactiveEffect {
  trigger: HitTrigger;
  changes: { stat: StatKey; stages: number }[];
}

const HIT_REACTIVE_ABILITIES: Record<string, HitReactiveEffect> = {
  'justified': { trigger: { kind: 'move-type', types: ['dark'] }, changes: [{ stat: 'atk', stages: 1 }] },
  'rattled': { trigger: { kind: 'move-type', types: ['bug', 'ghost', 'dark'] }, changes: [{ stat: 'spe', stages: 1 }] },
  'stamina': { trigger: { kind: 'any-hit' }, changes: [{ stat: 'def', stages: 1 }] },
  'weak-armor': { trigger: { kind: 'category', category: 'physical' }, changes: [{ stat: 'def', stages: -1 }, { stat: 'spe', stages: 2 }] },
  'water-compaction': { trigger: { kind: 'move-type', types: ['water'] }, changes: [{ stat: 'def', stages: 2 }] },
  'steam-engine': { trigger: { kind: 'move-type', types: ['fire', 'water'] }, changes: [{ stat: 'spe', stages: 6 }] },
};

export function getHitReactiveEffect(ability: string | undefined): HitReactiveEffect | null {
  if (!ability) return null;
  const slug = ability.toLowerCase().trim().replace(/\s+/g, '-');
  return HIT_REACTIVE_ABILITIES[slug] ?? null;
}

/** Whether a logged move action matches a hit-reactive ability's trigger condition. */
export function matchesHitTrigger(trigger: HitTrigger, moveCategory: string | undefined, moveType: string | undefined): boolean {
  if (moveCategory === 'status') return false; // "hit" always means a damaging move, not a status move
  if (trigger.kind === 'any-hit') return true;
  if (trigger.kind === 'category') return moveCategory === trigger.category;
  return !!moveType && trigger.types.includes(moveType);
}
