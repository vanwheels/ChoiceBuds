/**
 * Stat-Stage Display Constants (Battle Logger)
 * Shared by useBattleLogActions.ts (log note text), StatStagePopover.tsx,
 * and Battlefield.tsx (summary badge) so all three agree on ordering/labels.
 */

import type { StatKey } from '../types/pokemon';

export const STAT_ORDER: StatKey[] = ['atk', 'def', 'spa', 'spd', 'spe'];

export const STAT_LABELS: Record<StatKey, string> = {
  atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe',
};
