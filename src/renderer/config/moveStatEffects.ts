/**
 * Deterministic Move Stat Changes (Battle Logger)
 * Every move with a 100%-guaranteed stat-stage side effect on a successful
 * use gets a row here - unlike a switch-in ability chip (which requires a
 * manual tap since the user is confirming what they observed), these are
 * as certain as the move's own damage, so useBattleLogActions.ts
 * ::logAction auto-applies them the moment the move is logged. A move with
 * only a *chance* of a secondary stat effect (Rock Smash 50% Def-1, Iron
 * Tail 30% Def-1, Ancient Power/Silver Wind/Ominous Wind 10% +1 all,
 * Charge Beam 70% SpA+1, Play Rough 10% Atk-1, etc.) is deliberately
 * excluded - there's no way to know from a log alone whether the chance
 * actually triggered, and guessing would put a stat change on record the
 * user never confirmed. Researched and cross-checked against Bulbapedia's
 * stat-modifier reference and each move's own page (2026-07-07) rather
 * than assembled from memory, given how easy it is to misremember an
 * exact percentage.
 *
 * `appliesTo: 'self'` always affects the user (Draco Meteor, Agility,
 * etc.); `appliesTo: 'target'` affects whichever Pokemon(s) were logged as
 * the move's target (Charm, Parting Shot's stat-drop half, Coaching's ally
 * buff, etc.) - the click-to-log flow already allows targeting any
 * occupied field slot manually (ally included), so no separate targeting
 * logic is needed here, and a spread move (Bulldoze, Struggle Bug) works
 * automatically since `logAction` loops over every logged target id.
 *
 * A move's `changes` can also vary by the field's active weather (Growth:
 * +1 Atk/SpA normally, +2 each in Sun - the ONLY move confirmed to work
 * this way; Electro Shot was checked specifically since it also involves
 * weather, but its SpA+1 self-boost is flat regardless of weather - rain
 * only skips its charge turn, not the stage amount) - `inWeather`
 * overrides `changes` entirely for a listed weather, rather than stacking
 * with it, since Growth's is the only currently-known example and it
 * replaces rather than adds. `getMoveStatEffect` resolves this down to a
 * plain `MoveStatEffect` before returning, so callers never need to know
 * about `inWeather` at all.
 *
 * Deliberately excluded despite affecting a tracked stat, because the
 * model only supports additive stage deltas (not the mechanic these moves
 * actually use):
 * - Belly Drum: sets Attack to exactly +6 outright, not a "+6 delta" (a
 *   delta from a negative starting stage would land short of +6).
 * - Curse: completely different effect depending on the user's own type
 *   (Atk+1/Def+1/Spe-1 self if non-Ghost; an unrelated HP-cost/target-DOT
 *   effect if Ghost) - would need a type-conditional branch this table
 *   doesn't model, not just another row.
 * - Psych Up, Spectral Thief: copy/steal the target's *current* stat
 *   stages rather than applying a fixed amount - unknowable in advance.
 * - Guard Swap, Power Swap, Speed Swap, Heart Swap, Guard Split, Power
 *   Split: swap or average stages between two Pokemon rather than adding
 *   a fixed delta to one.
 */

import type { StatKey, WeatherType } from '../types/pokemon';

export interface MoveStatEffect {
  changes: { stat: StatKey; stages: number }[];
  appliesTo: 'self' | 'target';
}

interface MoveStatEffectEntry extends MoveStatEffect {
  inWeather?: Partial<Record<WeatherType, { stat: StatKey; stages: number }[]>>;
}

const MOVE_STAT_EFFECTS: Record<string, MoveStatEffectEntry> = {
  // Self-lowering after use
  'draco-meteor': { changes: [{ stat: 'spa', stages: -2 }], appliesTo: 'self' },
  'overheat': { changes: [{ stat: 'spa', stages: -2 }], appliesTo: 'self' },
  'leaf-storm': { changes: [{ stat: 'spa', stages: -2 }], appliesTo: 'self' },
  'psycho-boost': { changes: [{ stat: 'spa', stages: -2 }], appliesTo: 'self' },
  'fleur-cannon': { changes: [{ stat: 'spa', stages: -2 }], appliesTo: 'self' },
  'make-it-rain': { changes: [{ stat: 'spa', stages: -2 }], appliesTo: 'self' },
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
  'growth': {
    changes: [{ stat: 'atk', stages: 1 }, { stat: 'spa', stages: 1 }],
    appliesTo: 'self',
    inWeather: { sun: [{ stat: 'atk', stages: 2 }, { stat: 'spa', stages: 2 }] },
  },
  'work-up': { changes: [{ stat: 'atk', stages: 1 }, { stat: 'spa', stages: 1 }], appliesTo: 'self' },
  'hone-claws': { changes: [{ stat: 'atk', stages: 1 }], appliesTo: 'self' }, // also +1 accuracy - not a tracked stat
  'cosmic-power': { changes: [{ stat: 'def', stages: 1 }, { stat: 'spd', stages: 1 }], appliesTo: 'self' },
  'geomancy': { changes: [{ stat: 'spa', stages: 2 }, { stat: 'spd', stages: 2 }, { stat: 'spe', stages: 2 }], appliesTo: 'self' },
  'shift-gear': { changes: [{ stat: 'atk', stages: 1 }, { stat: 'spe', stages: 2 }], appliesTo: 'self' },
  'no-retreat': { changes: [{ stat: 'atk', stages: 1 }, { stat: 'def', stages: 1 }, { stat: 'spa', stages: 1 }, { stat: 'spd', stages: 1 }, { stat: 'spe', stages: 1 }], appliesTo: 'self' },
  'clangorous-soul': { changes: [{ stat: 'atk', stages: 1 }, { stat: 'def', stages: 1 }, { stat: 'spa', stages: 1 }, { stat: 'spd', stages: 1 }, { stat: 'spe', stages: 1 }], appliesTo: 'self' },
  'victory-dance': { changes: [{ stat: 'atk', stages: 1 }, { stat: 'def', stages: 1 }, { stat: 'spe', stages: 1 }], appliesTo: 'self' },
  'fillet-away': { changes: [{ stat: 'atk', stages: 2 }, { stat: 'spa', stages: 2 }, { stat: 'spe', stages: 2 }], appliesTo: 'self' },
  'tidy-up': { changes: [{ stat: 'atk', stages: 1 }, { stat: 'spe', stages: 1 }], appliesTo: 'self' },
  'take-heart': { changes: [{ stat: 'spa', stages: 1 }, { stat: 'spd', stages: 1 }], appliesTo: 'self' },
  'trailblaze': { changes: [{ stat: 'spe', stages: 1 }], appliesTo: 'self' },
  'psyshield-bash': { changes: [{ stat: 'def', stages: 1 }], appliesTo: 'self' },
  'torch-song': { changes: [{ stat: 'spa', stages: 1 }], appliesTo: 'self' },
  'mystical-power': { changes: [{ stat: 'spa', stages: 1 }], appliesTo: 'self' },
  'flame-charge': { changes: [{ stat: 'spe', stages: 1 }], appliesTo: 'self' },
  'electro-shot': { changes: [{ stat: 'spa', stages: 1 }], appliesTo: 'self' }, // rain only skips the charge turn, doesn't change the stage amount
  'barrier': { changes: [{ stat: 'def', stages: 2 }], appliesTo: 'self' },
  'withdraw': { changes: [{ stat: 'def', stages: 1 }], appliesTo: 'self' },
  'defense-curl': { changes: [{ stat: 'def', stages: 1 }], appliesTo: 'self' },
  'charge': { changes: [{ stat: 'spd', stages: 1 }], appliesTo: 'self' },
  'stockpile': { changes: [{ stat: 'def', stages: 1 }, { stat: 'spd', stages: 1 }], appliesTo: 'self' },

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
  'mystical-fire': { changes: [{ stat: 'spa', stages: -1 }], appliesTo: 'target' },
  'snarl': { changes: [{ stat: 'spa', stages: -1 }], appliesTo: 'target' },
  'struggle-bug': { changes: [{ stat: 'spa', stages: -1 }], appliesTo: 'target' },
  'acid-spray': { changes: [{ stat: 'spd', stages: -2 }], appliesTo: 'target' },
  'skitter-smack': { changes: [{ stat: 'spa', stages: -1 }], appliesTo: 'target' },
  'spirit-break': { changes: [{ stat: 'spa', stages: -1 }], appliesTo: 'target' },
  'bitter-malice': { changes: [{ stat: 'spa', stages: -1 }], appliesTo: 'target' },
  'lunge': { changes: [{ stat: 'atk', stages: -1 }], appliesTo: 'target' },
  'breaking-swipe': { changes: [{ stat: 'atk', stages: -1 }], appliesTo: 'target' },
  'trop-kick': { changes: [{ stat: 'atk', stages: -1 }], appliesTo: 'target' },
  'screech': { changes: [{ stat: 'def', stages: -2 }], appliesTo: 'target' },
  'metal-sound': { changes: [{ stat: 'spd', stages: -2 }], appliesTo: 'target' },
  'fake-tears': { changes: [{ stat: 'spd', stages: -2 }], appliesTo: 'target' },
  'cotton-spore': { changes: [{ stat: 'spe', stages: -2 }], appliesTo: 'target' },
  'tickle': { changes: [{ stat: 'atk', stages: -1 }, { stat: 'def', stages: -1 }], appliesTo: 'target' },
  'tearful-look': { changes: [{ stat: 'atk', stages: -1 }, { stat: 'spa', stages: -1 }], appliesTo: 'target' },
  'icy-wind': { changes: [{ stat: 'spe', stages: -1 }], appliesTo: 'target' },
  'bulldoze': { changes: [{ stat: 'spe', stages: -1 }], appliesTo: 'target' },
  'rock-tomb': { changes: [{ stat: 'spe', stages: -1 }], appliesTo: 'target' },
  'mud-shot': { changes: [{ stat: 'spe', stages: -1 }], appliesTo: 'target' },

  // Target-raising (ally support moves)
  'decorate': { changes: [{ stat: 'atk', stages: 2 }, { stat: 'spa', stages: 2 }], appliesTo: 'target' },
  'coaching': { changes: [{ stat: 'atk', stages: 1 }, { stat: 'def', stages: 1 }], appliesTo: 'target' },
  'aromatic-mist': { changes: [{ stat: 'spd', stages: 1 }], appliesTo: 'target' },
  'flower-shield': { changes: [{ stat: 'def', stages: 1 }], appliesTo: 'target' },
};

export function getMoveStatEffect(move: string | undefined, weather?: WeatherType | null): MoveStatEffect | null {
  if (!move) return null;
  const entry = MOVE_STAT_EFFECTS[move.toLowerCase().trim().replace(/\s+/g, '-')];
  if (!entry) return null;
  const overridden = weather ? entry.inWeather?.[weather] : undefined;
  return { changes: overridden ?? entry.changes, appliesTo: entry.appliesTo };
}
