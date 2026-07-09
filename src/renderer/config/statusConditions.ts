/**
 * Status-Condition Display Constants + PokeAPI Ailment Mapping (Battle Logger)
 * Shared by useBattleLogActions.ts (log note text), StatusConditionPopover.tsx,
 * BattlefieldSlot.tsx (badge), and Battlefield.tsx (statusAilment snapshotting)
 * so all agree on ordering/labels/colors - same pattern as config/statStages.ts.
 */

import type { StatusCondition } from '../types/pokemon';

export const STATUS_ORDER: StatusCondition[] = ['burn', 'freeze', 'paralysis', 'poison', 'badly-poisoned', 'sleep'];

export const STATUS_LABELS: Record<StatusCondition, string> = {
  burn: 'Burn',
  freeze: 'Freeze',
  paralysis: 'Paralysis',
  poison: 'Poison',
  'badly-poisoned': 'Badly Poisoned',
  sleep: 'Sleep',
};

/** 3-letter abbreviation for the persistent BattlefieldSlot badge. */
export const STATUS_ABBREVIATIONS: Record<StatusCondition, string> = {
  burn: 'BRN',
  freeze: 'FRZ',
  paralysis: 'PAR',
  poison: 'PSN',
  'badly-poisoned': 'TOX',
  sleep: 'SLP',
};

/** Tailwind text/background classes for the badge and popover buttons. */
export const STATUS_COLORS: Record<StatusCondition, string> = {
  burn: 'text-orange-300 bg-orange-900/60',
  freeze: 'text-cyan-300 bg-cyan-900/60',
  paralysis: 'text-yellow-300 bg-yellow-900/60',
  poison: 'text-purple-300 bg-purple-900/60',
  'badly-poisoned': 'text-purple-300 bg-purple-950/80',
  sleep: 'text-gray-300 bg-gray-700/60',
};

/**
 * Narrows a raw PokeAPI move ailment (its /move/{id} `meta.ailment.name`) to
 * our own StatusCondition, only for guaranteed-on-hit effects. PokeAPI's
 * `ailment_chance` is confusingly 0 for a pure status move whose entire
 * point IS the ailment (Thunder Wave, Toxic, Spore, Will-O-Wisp, Confuse
 * Ray all report 0, verified live against the real API) - that field is
 * only meaningful for a *secondary* effect on a damaging move (Nuzzle/
 * Zap Cannon: 100 = guaranteed; Body Slam/Thunder/Sludge Bomb: a real
 * percentage = probabilistic). So "guaranteed" here means: the move's own
 * damage_class is 'status' (its accuracy check is the only gate), OR it's a
 * damaging move with ailmentChance === 100. Genuinely probabilistic
 * secondary effects (Body Slam's 30%, etc.) are deliberately excluded, same
 * "certain effects only" philosophy as config/moveStatEffects.ts. PokeAPI
 * reports Toxic's ailment as plain "poison" with no separate "badly
 * poisoned" ailment slug - that distinction is real-game-known and
 * hard-coded here by move name rather than derived, since PokeAPI has no
 * field for it. Ailments outside our 6-status model (confusion,
 * infatuation, trap, etc.) return null.
 */
export function mapAilmentToStatus(
  moveName: string,
  ailment: string | undefined,
  ailmentChance: number | undefined,
  category: 'physical' | 'special' | 'status' | undefined
): StatusCondition | null {
  if (!ailment || ailment === 'none') return null;
  const isGuaranteed = category === 'status' || ailmentChance === 100;
  if (!isGuaranteed) return null;
  if (moveName.trim().toLowerCase() === 'toxic') return 'badly-poisoned';
  if ((STATUS_ORDER as string[]).includes(ailment)) return ailment as StatusCondition;
  return null;
}
