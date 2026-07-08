/**
 * Deterministic Move Stat Changes (Battle Logger)
 * A curated (not exhaustive) list of moves with a guaranteed stat-stage
 * side effect on a successful use - unlike a switch-in ability chip (which
 * requires a manual tap since the user is confirming what they observed),
 * these are as certain as the move's own damage, so useBattleLogActions.ts
 * ::logAction auto-applies them the moment the move is logged.
 *
 * `appliesTo: 'self'` always affects the user (Draco Meteor, Agility,
 * etc.); `appliesTo: 'target'` affects whichever Pokemon(s) were logged as
 * the move's target (Charm, Parting Shot's stat-drop half, etc.) - the
 * click-to-log flow already allows targeting any occupied field slot
 * manually, so no separate targeting logic is needed here.
 */

import type { StatKey } from '../types/pokemon';

export interface MoveStatEffect {
  changes: { stat: StatKey; stages: number }[];
  appliesTo: 'self' | 'target';
}

const MOVE_STAT_EFFECTS: Record<string, MoveStatEffect> = {
  // Self-lowering after use
  'draco-meteor': { changes: [{ stat: 'spa', stages: -2 }], appliesTo: 'self' },
  'overheat': { changes: [{ stat: 'spa', stages: -2 }], appliesTo: 'self' },
  'leaf-storm': { changes: [{ stat: 'spa', stages: -2 }], appliesTo: 'self' },
  'psycho-boost': { changes: [{ stat: 'spa', stages: -2 }], appliesTo: 'self' },
  'superpower': { changes: [{ stat: 'atk', stages: -1 }, { stat: 'def', stages: -1 }], appliesTo: 'self' },
  'close-combat': { changes: [{ stat: 'def', stages: -1 }, { stat: 'spd', stages: -1 }], appliesTo: 'self' },
  'v-create': { changes: [{ stat: 'def', stages: -1 }, { stat: 'spd', stages: -1 }, { stat: 'spe', stages: -1 }], appliesTo: 'self' },

  // Self-boosting
  'shell-smash': { changes: [{ stat: 'atk', stages: 2 }, { stat: 'spa', stages: 2 }, { stat: 'spe', stages: 2 }, { stat: 'def', stages: -1 }, { stat: 'spd', stages: -1 }], appliesTo: 'self' },
  'quiver-dance': { changes: [{ stat: 'spa', stages: 1 }, { stat: 'spd', stages: 1 }, { stat: 'spe', stages: 1 }], appliesTo: 'self' },
  'agility': { changes: [{ stat: 'spe', stages: 2 }], appliesTo: 'self' },
  'rock-polish': { changes: [{ stat: 'spe', stages: 2 }], appliesTo: 'self' },
  'swords-dance': { changes: [{ stat: 'atk', stages: 2 }], appliesTo: 'self' },
  'nasty-plot': { changes: [{ stat: 'spa', stages: 2 }], appliesTo: 'self' },
  'calm-mind': { changes: [{ stat: 'spa', stages: 1 }, { stat: 'spd', stages: 1 }], appliesTo: 'self' },
  'bulk-up': { changes: [{ stat: 'atk', stages: 1 }, { stat: 'def', stages: 1 }], appliesTo: 'self' },
  'dragon-dance': { changes: [{ stat: 'atk', stages: 1 }, { stat: 'spe', stages: 1 }], appliesTo: 'self' },
  'iron-defense': { changes: [{ stat: 'def', stages: 2 }], appliesTo: 'self' },
  'amnesia': { changes: [{ stat: 'spd', stages: 2 }], appliesTo: 'self' },
  'acid-armor': { changes: [{ stat: 'def', stages: 2 }], appliesTo: 'self' },
  'cotton-guard': { changes: [{ stat: 'def', stages: 3 }], appliesTo: 'self' },
  'coil': { changes: [{ stat: 'atk', stages: 1 }, { stat: 'def', stages: 1 }], appliesTo: 'self' },

  // Target-lowering
  'charm': { changes: [{ stat: 'atk', stages: -2 }], appliesTo: 'target' },
  'eerie-impulse': { changes: [{ stat: 'spa', stages: -2 }], appliesTo: 'target' },
  'captivate': { changes: [{ stat: 'spa', stages: -2 }], appliesTo: 'target' },
  'scary-face': { changes: [{ stat: 'spe', stages: -2 }], appliesTo: 'target' },
  'string-shot': { changes: [{ stat: 'spe', stages: -2 }], appliesTo: 'target' },
  'parting-shot': { changes: [{ stat: 'atk', stages: -1 }, { stat: 'spa', stages: -1 }], appliesTo: 'target' },
  'noble-roar': { changes: [{ stat: 'atk', stages: -1 }, { stat: 'spa', stages: -1 }], appliesTo: 'target' },
  'growl': { changes: [{ stat: 'atk', stages: -1 }], appliesTo: 'target' },
  'tail-whip': { changes: [{ stat: 'def', stages: -1 }], appliesTo: 'target' },
  'leer': { changes: [{ stat: 'def', stages: -1 }], appliesTo: 'target' },
  'confide': { changes: [{ stat: 'spa', stages: -1 }], appliesTo: 'target' },
  'play-nice': { changes: [{ stat: 'atk', stages: -1 }], appliesTo: 'target' },
  'baby-doll-eyes': { changes: [{ stat: 'atk', stages: -1 }], appliesTo: 'target' },
};

export function getMoveStatEffect(move: string | undefined): MoveStatEffect | null {
  if (!move) return null;
  return MOVE_STAT_EFFECTS[move.toLowerCase().trim().replace(/\s+/g, '-')] ?? null;
}
