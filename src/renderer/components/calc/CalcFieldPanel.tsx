/**
 * CalcFieldPanel.tsx - Battlefield Conditions
 * Sits between the two Pokémon panels. Weather/terrain/game type are
 * shared; each Pokémon gets its own symmetric side-conditions group (see
 * CalcSideConditions) since either can be attacking or defending depending
 * on which of the two directions is being viewed.
 */

import type { CalcFieldState, CalcSideConditions as CalcSideConditionsState } from '../../hooks/useDamageCalc';
import { WEATHER_OPTIONS, TERRAIN_OPTIONS } from '../../hooks/useDamageCalc';
import CalcSideConditions from './CalcSideConditions';

interface CalcFieldPanelProps {
  field: CalcFieldState;
  onChangeField: (updates: Partial<Pick<CalcFieldState, 'gameType' | 'weather' | 'terrain'>>) => void;
  onChangePokemon1Side: (updates: Partial<CalcSideConditionsState>) => void;
  onChangePokemon2Side: (updates: Partial<CalcSideConditionsState>) => void;
}

export default function CalcFieldPanel({ field, onChangeField, onChangePokemon1Side, onChangePokemon2Side }: CalcFieldPanelProps) {
  return (
    <div className="flex-1 min-w-[280px] bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-3">
      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">Field</h3>

      <div className="flex gap-2">
        {(['Singles', 'Doubles'] as const).map(type => (
          <button
            key={type}
            type="button"
            onClick={() => onChangeField({ gameType: type })}
            className={`flex-1 px-2 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
              field.gameType === type ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Weather</label>
          <select
            value={field.weather}
            onChange={(e) => onChangeField({ weather: e.target.value as CalcFieldState['weather'] })}
            className="px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white outline-none focus:border-blue-500"
          >
            <option value="">None</option>
            {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Terrain</label>
          <select
            value={field.terrain}
            onChange={(e) => onChangeField({ terrain: e.target.value as CalcFieldState['terrain'] })}
            className="px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white outline-none focus:border-blue-500"
          >
            <option value="">None</option>
            {TERRAIN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-1 border-t border-zinc-800">
        <CalcSideConditions title="Pokémon 1's Side" side={field.pokemon1Side} onChange={onChangePokemon1Side} />
        <CalcSideConditions title="Pokémon 2's Side" side={field.pokemon2Side} onChange={onChangePokemon2Side} />
      </div>
    </div>
  );
}
