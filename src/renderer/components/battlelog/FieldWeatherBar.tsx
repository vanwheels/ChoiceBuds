/**
 * FieldWeatherBar.tsx - Field-Wide Weather/Terrain Tracker
 * One button group each for weather and terrain, mutually exclusive within
 * each group (selecting a new one replaces, doesn't stack). Countdown is a
 * helpful default (see config/fieldConditions.ts) - clickable off at any
 * time, not auto-cleared, since real games can extend/shorten it.
 *
 * Duration confidence: a Mega Evolution's ability-triggered weather/terrain
 * is always the fixed 5-turn duration (the Mega Stone occupies the item
 * slot, so no duration-extending rock is possible); a regular ability
 * trigger is uncertain (5 or 8 turns, depending on an unrevealed held
 * rock). The small "via Mega" chip is the one extra tap needed to record
 * that certainty - unchecked (the common case) shows the honest 5-8 range.
 */

import type { Battle, WeatherType, TerrainType } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import {
  WEATHER_OPTIONS, WEATHER_LABELS, getWeatherTheme,
  TERRAIN_OPTIONS, TERRAIN_LABELS, getTerrainTheme,
  getRemainingTurns,
} from '../../config/fieldConditions';

interface FieldWeatherBarProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
}

const FIXED_DURATION = 5;
const EXTENDED_DURATION = 8;

function formatDuration(setOnTurn: number, currentTurn: number, wasMegaEvolved: boolean | undefined): string {
  const fixed = getRemainingTurns(setOnTurn, FIXED_DURATION, currentTurn);
  if (wasMegaEvolved) return `${fixed}`;
  const extended = getRemainingTurns(setOnTurn, EXTENDED_DURATION, currentTurn);
  return extended > fixed ? `${fixed}-${extended}?` : `${fixed}`;
}

export default function FieldWeatherBar({ battle, battleLogActions }: FieldWeatherBarProps) {
  const currentTurn = battle.turns.length;
  const { weather, terrain } = battle.fieldState;

  const handleWeather = (type: WeatherType) => {
    battleLogActions.setWeather(battle, weather?.type === type ? null : type);
  };

  const handleTerrain = (type: TerrainType) => {
    battleLogActions.setTerrain(battle, terrain?.type === type ? null : type);
  };

  return (
    <div className="flex flex-wrap gap-4 p-2 rounded-lg bg-gray-800 border border-gray-700">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mr-1">Weather</span>
        {WEATHER_OPTIONS.map(type => {
          const isActive = weather?.type === type;
          const theme = getWeatherTheme(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleWeather(type)}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm cursor-pointer transition-colors ${
                isActive ? `${theme.bg} ${theme.text}` : 'bg-gray-900 text-gray-500 hover:text-gray-300'
              }`}
            >
              {WEATHER_LABELS[type]}{isActive ? ` (${formatDuration(weather.setOnTurn, currentTurn, weather.wasMegaEvolved)})` : ''}
            </button>
          );
        })}
        {weather && (
          <button
            type="button"
            onClick={() => battleLogActions.setWeather(battle, weather.type, !weather.wasMegaEvolved)}
            title="Toggle whether this was set by a Mega Evolution's ability (fixed 5-turn duration, no held rock possible)"
            className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-sm cursor-pointer transition-colors ${
              weather.wasMegaEvolved ? 'bg-yellow-600 text-white' : 'bg-gray-900 text-gray-600 hover:text-gray-400'
            }`}
          >
            via Mega
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mr-1">Terrain</span>
        {TERRAIN_OPTIONS.map(type => {
          const isActive = terrain?.type === type;
          const theme = getTerrainTheme(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleTerrain(type)}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm cursor-pointer transition-colors ${
                isActive ? `${theme.bg} ${theme.text}` : 'bg-gray-900 text-gray-500 hover:text-gray-300'
              }`}
            >
              {TERRAIN_LABELS[type]}{isActive ? ` (${formatDuration(terrain.setOnTurn, currentTurn, terrain.wasMegaEvolved)})` : ''}
            </button>
          );
        })}
        {terrain && (
          <button
            type="button"
            onClick={() => battleLogActions.setTerrain(battle, terrain.type, !terrain.wasMegaEvolved)}
            title="Toggle whether this was set by a Mega Evolution's ability (fixed 5-turn duration, no held rock possible)"
            className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-sm cursor-pointer transition-colors ${
              terrain.wasMegaEvolved ? 'bg-yellow-600 text-white' : 'bg-gray-900 text-gray-600 hover:text-gray-400'
            }`}
          >
            via Mega
          </button>
        )}
      </div>
    </div>
  );
}
