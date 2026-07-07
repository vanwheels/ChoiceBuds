/**
 * FieldWeatherBar.tsx - Field-Wide Weather/Terrain Tracker
 * One button group each for weather and terrain, mutually exclusive within
 * each group (selecting a new one replaces, doesn't stack). Countdown is a
 * helpful default (see config/fieldConditions.ts) - clickable off at any
 * time, not auto-cleared, since real games can extend/shorten it.
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

const DURATION = 5;

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
          const remaining = isActive ? getRemainingTurns(weather.setOnTurn, DURATION, currentTurn) : null;
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleWeather(type)}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm cursor-pointer transition-colors ${
                isActive ? `${theme.bg} ${theme.text}` : 'bg-gray-900 text-gray-500 hover:text-gray-300'
              }`}
            >
              {WEATHER_LABELS[type]}{remaining != null ? ` (${remaining})` : ''}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mr-1">Terrain</span>
        {TERRAIN_OPTIONS.map(type => {
          const isActive = terrain?.type === type;
          const theme = getTerrainTheme(type);
          const remaining = isActive ? getRemainingTurns(terrain.setOnTurn, DURATION, currentTurn) : null;
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleTerrain(type)}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm cursor-pointer transition-colors ${
                isActive ? `${theme.bg} ${theme.text}` : 'bg-gray-900 text-gray-500 hover:text-gray-300'
              }`}
            >
              {TERRAIN_LABELS[type]}{remaining != null ? ` (${remaining})` : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
