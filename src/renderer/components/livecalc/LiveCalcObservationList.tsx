/**
 * LiveCalcObservationList.tsx - Defender Observation Add/Remove List
 * One row per observed hit: which of the attacker's moves was used, the
 * damage it dealt as a percent of the defender's max HP (a health-bar read,
 * not exact HP - see docs/investigations/live-calc-stat-inference-scope.md),
 * and how many targets it actually hit that turn. The targets-hit toggle is
 * shown on every row rather than only spread-capable moves - the engine
 * (utils/liveCalcEngine.ts) only lets it affect a move that's actually
 * spread-capable, so it's harmless noise on a single-target move rather than
 * something this list needs to pre-filter.
 */

import type { LiveCalcObservationEntry } from '../../hooks/useLiveCalc';
import type { LiveCalcObservation } from '../../utils/liveCalcEngine';
import CalcAutocomplete from '../calc/CalcAutocomplete';

interface LiveCalcObservationListProps {
  observations: LiveCalcObservationEntry[];
  moveOptions: string[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<LiveCalcObservation>) => void;
  onRemove: (id: string) => void;
}

export default function LiveCalcObservationList({ observations, moveOptions, onAdd, onUpdate, onRemove }: LiveCalcObservationListProps) {
  return (
    <div className="flex-1 min-w-[280px] bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">Observations</h3>
        <button
          type="button"
          onClick={onAdd}
          className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors cursor-pointer bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
        >
          + Add
        </button>
      </div>

      {observations.length === 0 && (
        <p className="text-xs text-zinc-500">No observations yet - add one for each hit you've seen land.</p>
      )}

      {observations.map(obs => (
        <div key={obs.id} className="flex items-center gap-2">
          <div className="flex-1">
            <CalcAutocomplete
              value={obs.moveName}
              options={moveOptions}
              placeholder="Search moves..."
              onChange={(moveName) => onUpdate(obs.id, { moveName })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={obs.damagePercent}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                if (!Number.isNaN(parsed)) onUpdate(obs.id, { damagePercent: Math.max(0, Math.min(100, parsed)) });
              }}
              title="Damage dealt, as a percent of the defender's max HP"
              className="w-16 px-1 py-0.5 text-sm text-center bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
            />
          </div>
          <select
            value={obs.targetsHit}
            onChange={(e) => onUpdate(obs.id, { targetsHit: Number(e.target.value) as 1 | 2 })}
            title="How many targets this hit actually landed on (only matters for spread moves)"
            className="px-1 py-0.5 text-xs bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold cursor-pointer"
          >
            <option value={1}>1 target</option>
            <option value={2}>2 targets</option>
          </select>
          <button
            type="button"
            onClick={() => onRemove(obs.id)}
            title="Remove observation"
            className="px-2 py-0.5 text-xs font-bold rounded transition-colors cursor-pointer bg-zinc-800 text-zinc-400 hover:bg-red-900/60 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
