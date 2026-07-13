/**
 * Move Effects That Change With Active Weather - Non-Stat Category (Battle Logger)
 * Distinct from config/moveStatEffects.ts's stat-stage table: these moves
 * change accuracy, power, healing amount, or skip a charge turn depending
 * on the field's active weather, rather than a stat-stage side effect.
 * Purely informational - unlike moveStatEffects.ts (which auto-applies a
 * guaranteed stat change the moment a move is logged), the Battle Logger
 * doesn't track computed damage/accuracy/heal numbers at all, so there's
 * nothing here to apply automatically. `getMoveWeatherNote` just resolves a
 * plain human-readable reminder string for whatever weather is currently
 * active, shown next to the move in MoveLogPopover.tsx at the moment the
 * user is about to log it - same "manual log, not a simulator" spirit as
 * the switch-in ability chips, just a note instead of a clickable action
 * (there's no stat/HP/field state here to actually apply).
 *
 * Researched and cross-checked against each move's own dedicated Bulbapedia
 * page individually (2026-07-13, per this project's own research-technique
 * convention for "what exactly does X do" questions - a shared prose
 * reference page risks conflating effects/percentages across moves):
 * - Thunder/Hurricane: 70% accuracy normally: Bulbapedia's Thunder_(move)/
 *   Hurricane_(move) pages both confirm "bypasses accuracy checks to
 *   always hit" in Rain, and accuracy "reduced to 50%" in harsh sunlight.
 * - Solar Beam/Solar Blade: Bulbapedia's Solar_Beam_(move)/Solar_Blade_(move)
 *   pages confirm no charge turn needed in harsh sunlight, and power halved
 *   in Rain/Sandstorm/Snow (also Fog, which this app doesn't model as a
 *   weather type, so it's omitted here).
 * - Weather Ball: Bulbapedia's Weather_Ball_(move) page confirms power
 *   doubles from 50 to 100 in any of the 4 weather types, changing type to
 *   Water (Rain), Fire (Sun), Rock (Sandstorm), or Ice (Snow).
 * - Synthesis/Moonlight/Morning Sun: Bulbapedia's own page for each move
 *   (they're mechanically identical) confirms 50% HP normally, ~67%
 *   (2732/4096) in harsh sunlight, and 25% in Rain/Sandstorm/Snow.
 * - Blizzard: Bulbapedia's Blizzard_(move) page confirms 70% accuracy
 *   normally, bypassing accuracy checks to always hit in Snow.
 *
 * Deliberately excluded: any move whose weather interaction isn't a
 * guaranteed mechanical change relevant to a manual log (e.g. moves only
 * affected by Strong Winds/Fog, weather types this app doesn't model).
 */

import type { WeatherType } from '../types/pokemon';

const MOVE_WEATHER_EFFECTS: Record<string, Partial<Record<WeatherType, string>>> = {
  'thunder': { rain: 'Never misses in Rain', sun: '50% accuracy in Sun (down from 70%)' },
  'hurricane': { rain: 'Never misses in Rain', sun: '50% accuracy in Sun (down from 70%)' },
  'solar-beam': {
    sun: 'No charge turn needed in Sun',
    rain: 'Half power in Rain',
    sand: 'Half power in Sandstorm',
    snow: 'Half power in Snow',
  },
  'solar-blade': {
    sun: 'No charge turn needed in Sun',
    rain: 'Half power in Rain',
    sand: 'Half power in Sandstorm',
    snow: 'Half power in Snow',
  },
  'weather-ball': {
    rain: 'Becomes Water-type, 100 power in Rain',
    sun: 'Becomes Fire-type, 100 power in Sun',
    sand: 'Becomes Rock-type, 100 power in Sandstorm',
    snow: 'Becomes Ice-type, 100 power in Snow',
  },
  'synthesis': {
    sun: 'Heals ~67% HP in Sun (up from 50%)',
    rain: 'Heals 25% HP in Rain (down from 50%)',
    sand: 'Heals 25% HP in Sandstorm (down from 50%)',
    snow: 'Heals 25% HP in Snow (down from 50%)',
  },
  'moonlight': {
    sun: 'Heals ~67% HP in Sun (up from 50%)',
    rain: 'Heals 25% HP in Rain (down from 50%)',
    sand: 'Heals 25% HP in Sandstorm (down from 50%)',
    snow: 'Heals 25% HP in Snow (down from 50%)',
  },
  'morning-sun': {
    sun: 'Heals ~67% HP in Sun (up from 50%)',
    rain: 'Heals 25% HP in Rain (down from 50%)',
    sand: 'Heals 25% HP in Sandstorm (down from 50%)',
    snow: 'Heals 25% HP in Snow (down from 50%)',
  },
  'blizzard': { snow: 'Never misses in Snow' },
};

export function getMoveWeatherNote(move: string | undefined, weather: WeatherType | null | undefined): string | null {
  if (!move || !weather) return null;
  const entry = MOVE_WEATHER_EFFECTS[move.toLowerCase().trim().replace(/\s+/g, '-')];
  return entry?.[weather] ?? null;
}
