/**
 * Move -> Field-Effect Reference (Battle Logger)
 * Moves that set weather/terrain/Trick Room/screens/hazards should update
 * the field-effect trackers the moment they're logged, not require a
 * separate manual toggle - see useBattleLogActions.ts's logAction. Same
 * shape/spirit as config/onSwitchInAbilities.ts, keyed by move instead of
 * ability. Side conditions (Tailwind/screens) always land on the user's
 * own side; hazards (Stealth Rock/Spikes/etc.) always land on the
 * opposing side - that's a real-game rule, not a per-move choice.
 */

import type { WeatherType, TerrainType } from '../types/pokemon';
import type { TurnTrackedCondition, BooleanHazard, StackableHazard } from './fieldConditions';

export type MoveFieldEffect =
  | { kind: 'weather'; weather: WeatherType }
  | { kind: 'terrain'; terrain: TerrainType }
  | { kind: 'trickRoom' }
  | { kind: 'sideCondition'; key: TurnTrackedCondition }
  | { kind: 'booleanHazard'; key: BooleanHazard }
  | { kind: 'stackableHazard'; key: StackableHazard };

const MOVE_FIELD_EFFECTS: Record<string, MoveFieldEffect> = {
  'sunny-day': { kind: 'weather', weather: 'sun' },
  'rain-dance': { kind: 'weather', weather: 'rain' },
  'sandstorm': { kind: 'weather', weather: 'sand' },
  'snowscape': { kind: 'weather', weather: 'snow' },
  'hail': { kind: 'weather', weather: 'snow' },
  'chilly-reception': { kind: 'weather', weather: 'snow' },

  'electric-terrain': { kind: 'terrain', terrain: 'electric' },
  'grassy-terrain': { kind: 'terrain', terrain: 'grassy' },
  'misty-terrain': { kind: 'terrain', terrain: 'misty' },
  'psychic-terrain': { kind: 'terrain', terrain: 'psychic' },

  'trick-room': { kind: 'trickRoom' },

  'tailwind': { kind: 'sideCondition', key: 'tailwind' },
  'reflect': { kind: 'sideCondition', key: 'reflect' },
  'light-screen': { kind: 'sideCondition', key: 'lightScreen' },
  'aurora-veil': { kind: 'sideCondition', key: 'auroraVeil' },
  'safeguard': { kind: 'sideCondition', key: 'safeguard' },
  'mist': { kind: 'sideCondition', key: 'mist' },

  'stealth-rock': { kind: 'booleanHazard', key: 'stealthRock' },
  'sticky-web': { kind: 'booleanHazard', key: 'stickyWeb' },
  'spikes': { kind: 'stackableHazard', key: 'spikes' },
  'toxic-spikes': { kind: 'stackableHazard', key: 'toxicSpikes' },
};

export function getMoveFieldEffect(move: string | undefined): MoveFieldEffect | null {
  if (!move) return null;
  return MOVE_FIELD_EFFECTS[move.toLowerCase().trim().replace(/\s+/g, '-')] ?? null;
}
