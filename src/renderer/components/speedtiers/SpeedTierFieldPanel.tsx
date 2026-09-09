/**
 * SpeedTierFieldPanel.tsx - Speed Tiers Field Conditions
 * Weather/terrain + per-side Tailwind toggles feeding speedTiers.ts's
 * SpeedFieldContext, plus Trick Room (a pure sort-direction flip over the
 * resulting tier list - see speedTiers.ts's header on why it isn't part of
 * SpeedFieldContext itself). Deliberately smaller than CalcFieldPanel: no
 * game type or full side-conditions group, since those don't feed
 * getFinalSpeed() the way weather/terrain/Tailwind do.
 */
import type { ReactNode } from 'react';
import { WEATHER_OPTIONS, TERRAIN_OPTIONS } from '../../hooks/useDamageCalc';
import type { SpeedFieldContext } from '../../utils/speedTiers';

interface SpeedTierFieldPanelProps {
  field: SpeedFieldContext;
  onChangeField: (updates: Partial<SpeedFieldContext>) => void;
  trickRoom: boolean;
  onChangeTrickRoom: (value: boolean) => void;
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-2 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
        active ? 'bg-accent-gold text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
      }`}
    >
      {children}
    </button>
  );
}

export default function SpeedTierFieldPanel({ field, onChangeField, trickRoom, onChangeTrickRoom }: SpeedTierFieldPanelProps) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Weather</label>
        <select
          value={field.weather}
          onChange={e => onChangeField({ weather: e.target.value as SpeedFieldContext['weather'] })}
          className="px-2 py-1 text-sm bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
        >
          <option value="">None</option>
          {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Terrain</label>
        <select
          value={field.terrain}
          onChange={e => onChangeField({ terrain: e.target.value as SpeedFieldContext['terrain'] })}
          className="px-2 py-1 text-sm bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
        >
          <option value="">None</option>
          {TERRAIN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Your Tailwind</label>
        <ToggleButton active={field.teamHasTailwind} onClick={() => onChangeField({ teamHasTailwind: !field.teamHasTailwind })}>
          {field.teamHasTailwind ? 'Active' : 'Off'}
        </ToggleButton>
      </div>
      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Threats' Tailwind</label>
        <ToggleButton active={field.threatHasTailwind} onClick={() => onChangeField({ threatHasTailwind: !field.threatHasTailwind })}>
          {field.threatHasTailwind ? 'Active' : 'Off'}
        </ToggleButton>
      </div>
      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Trick Room</label>
        <ToggleButton active={trickRoom} onClick={() => onChangeTrickRoom(!trickRoom)}>
          {trickRoom ? 'Active (slowest first)' : 'Off'}
        </ToggleButton>
      </div>
    </div>
  );
}
