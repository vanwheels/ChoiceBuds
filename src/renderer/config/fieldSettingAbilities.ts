/**
 * Field-Setting Abilities (Calc auto weather/terrain)
 * Abilities that set weather or terrain the moment their holder enters the
 * field, keyed by ability slug, valued in the Calc's own Weather/Terrain
 * vocabulary (@smogon/calc names, not the Battle Logger's lowercase
 * `WeatherType`/`TerrainType` - see onSwitchInAbilities.ts, a separate table
 * for that surface). Mega-granted abilities need no rows of their own: the
 * Calc sets the Mega's ability from config/megaAbilities.ts, so Mega
 * Charizard Y, Abomasnow, Tyranitar, Froslass and Raichu X all resolve
 * through the ability name here.
 *
 * Deliberately excluded:
 * - Desolate Land / Primordial Sea / Delta Stream: primal weathers aren't
 *   selectable in the Calc's field panel (WEATHER_OPTIONS), and no
 *   regulation-legal Pokemon has them.
 * - Sand Spit / Seed Sower: reactive (trigger when hit), not on switch-in.
 * - Hadron Engine / Orichalcum Pulse also boost a stat under their field;
 *   @smogon/calc models that on its own, only the field-setting half lives
 *   here.
 */

import type { Weather, Terrain } from '@smogon/calc/dist/data/interface';

export type FieldSettingEffect =
  { kind: 'weather'; weather: Weather } | { kind: 'terrain'; terrain: Terrain };

const FIELD_SETTING_ABILITIES: Record<string, FieldSettingEffect> = {
  drought: { kind: 'weather', weather: 'Sun' },
  'orichalcum-pulse': { kind: 'weather', weather: 'Sun' },
  drizzle: { kind: 'weather', weather: 'Rain' },
  'sand-stream': { kind: 'weather', weather: 'Sand' },
  'snow-warning': { kind: 'weather', weather: 'Snow' },
  'electric-surge': { kind: 'terrain', terrain: 'Electric' },
  'hadron-engine': { kind: 'terrain', terrain: 'Electric' },
  'grassy-surge': { kind: 'terrain', terrain: 'Grassy' },
  'misty-surge': { kind: 'terrain', terrain: 'Misty' },
  'psychic-surge': { kind: 'terrain', terrain: 'Psychic' },
};

/** The weather/terrain an ability sets on switch-in, or null if it sets none. */
export function getFieldSettingEffect(ability: string | undefined): FieldSettingEffect | null {
  if (!ability) return null;
  const slug = ability.toLowerCase().trim().replace(/\s+/g, '-');
  return FIELD_SETTING_ABILITIES[slug] ?? null;
}
