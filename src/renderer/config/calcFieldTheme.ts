/**
 * Which type color each Calc weather/terrain chip borrows from
 * pokemonTheme.ts's TYPE_THEMES, rather than a separate palette. Keyed by the
 * @smogon/calc names useDamageCalc's field state uses.
 */

export const CALC_WEATHER_TYPE: Record<string, string> = {
  Sun: 'fire',
  Rain: 'water',
  Sand: 'ground',
  Snow: 'ice',
  'Harsh Sunshine': 'fire',
  'Heavy Rain': 'water',
  'Strong Winds': 'flying',
};

export const CALC_TERRAIN_TYPE: Record<string, string> = {
  Electric: 'electric',
  Grassy: 'grass',
  Psychic: 'psychic',
  Misty: 'fairy',
};
