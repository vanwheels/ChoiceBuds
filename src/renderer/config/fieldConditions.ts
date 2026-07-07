/**
 * Field & Side-Condition Reference Data (Battle Logger)
 * Static durations/labels for weather, terrain, screens, Tailwind, and
 * hazards, plus the pure remaining-turns calculation. See
 * types/pokemon.ts's SideConditions/FieldState for the data shape and
 * useBattleLogActions.ts for the mutations that set/clear these.
 *
 * Durations are the standard (no held-item extension modeled, e.g. Light
 * Clay/weather rocks) - this is a manually-observed log, not a simulator,
 * so the countdown is a helpful default the user can clear early or ignore
 * if a real game extends it. Hazards have no duration entry since they
 * persist untimed until removed (Rapid Spin/Defog/etc.).
 */

import type { SideConditions, WeatherType, TerrainType } from '../types/pokemon';
import { getTypeTheme, type TypeTheme } from './pokemonTheme';

export type TurnTrackedCondition = 'tailwind' | 'reflect' | 'lightScreen' | 'auroraVeil' | 'safeguard' | 'mist';
export type BooleanHazard = 'stealthRock' | 'stickyWeb';
export type StackableHazard = 'spikes' | 'toxicSpikes';

export const TURN_TRACKED_CONDITIONS: TurnTrackedCondition[] = [
  'tailwind', 'reflect', 'lightScreen', 'auroraVeil', 'safeguard', 'mist',
];
export const BOOLEAN_HAZARDS: BooleanHazard[] = ['stealthRock', 'stickyWeb'];
export const STACKABLE_HAZARDS: StackableHazard[] = ['spikes', 'toxicSpikes'];

export const STACKABLE_HAZARD_MAX: Record<StackableHazard, number> = {
  spikes: 3,
  toxicSpikes: 2,
};

export const SIDE_CONDITION_DURATIONS: Record<TurnTrackedCondition, number> = {
  tailwind: 4,
  reflect: 5,
  lightScreen: 5,
  auroraVeil: 5,
  safeguard: 5,
  mist: 5,
};

export const SIDE_CONDITION_LABELS: Record<TurnTrackedCondition, string> = {
  tailwind: 'Tailwind',
  reflect: 'Reflect',
  lightScreen: 'Lt. Screen',
  auroraVeil: 'Aurora Veil',
  safeguard: 'Safeguard',
  mist: 'Mist',
};

export const HAZARD_LABELS: Record<BooleanHazard | StackableHazard, string> = {
  stealthRock: 'Stealth Rock',
  stickyWeb: 'Sticky Web',
  spikes: 'Spikes',
  toxicSpikes: 'Toxic Spikes',
};

export const WEATHER_OPTIONS: WeatherType[] = ['rain', 'sun', 'sand', 'snow'];
export const WEATHER_LABELS: Record<WeatherType, string> = {
  rain: 'Rain',
  sun: 'Sun',
  sand: 'Sandstorm',
  snow: 'Snow',
};
/** Reuses the existing type-color theme rather than a new palette. */
const WEATHER_TYPE_MAP: Record<WeatherType, string> = {
  rain: 'water',
  sun: 'fire',
  sand: 'ground',
  snow: 'ice',
};

export const TERRAIN_OPTIONS: TerrainType[] = ['electric', 'grassy', 'misty', 'psychic'];
export const TERRAIN_LABELS: Record<TerrainType, string> = {
  electric: 'Electric Terrain',
  grassy: 'Grassy Terrain',
  misty: 'Misty Terrain',
  psychic: 'Psychic Terrain',
};
const TERRAIN_TYPE_MAP: Record<TerrainType, string> = {
  electric: 'electric',
  grassy: 'grass',
  misty: 'fairy',
  psychic: 'psychic',
};

export function getWeatherTheme(weather: WeatherType): TypeTheme {
  return getTypeTheme(WEATHER_TYPE_MAP[weather]);
}

export function getTerrainTheme(terrain: TerrainType): TypeTheme {
  return getTypeTheme(TERRAIN_TYPE_MAP[terrain]);
}

/** Turns remaining given when a condition was set, its duration, and the current turn number. Never negative. */
export function getRemainingTurns(setOnTurn: number, duration: number, currentTurn: number): number {
  return Math.max(0, duration - (currentTurn - setOnTurn));
}

export function getSideConditionRemaining(
  conditions: SideConditions,
  key: TurnTrackedCondition,
  currentTurn: number
): number | null {
  const setOnTurn = conditions[key];
  if (setOnTurn == null) return null;
  return getRemainingTurns(setOnTurn, SIDE_CONDITION_DURATIONS[key], currentTurn);
}
