/**
 * LiveCalcTurnOrderList.tsx - Defender Turn-Order Observation Add/Remove List
 * One row per observed turn: which of the attacker's moves was used (its
 * priority is what the engine actually reads - see
 * utils/liveCalcSpeedEngine.ts's header), which side acted first, and the
 * defender's own asserted Speed stage for that turn (-6..+6, default 0 -
 * same numeric shape/clamping as CalcStatRows.tsx's boost inputs, since it's
 * a known/fixed input the engine applies directly rather than a scanned
 * unknown). A separate list alongside LiveCalcObservationList's damage% rows
 * rather than merged into it - different shape (no damage% field, an order
 * toggle instead of a targets-hit one) and narrows a different stat (Speed
 * vs. Def/SpD), so keeping them as two lists avoids one row type growing
 * conditional fields for the other's inputs.
 */

import type { LiveCalcTurnOrderObservationEntry } from '../../hooks/useLiveCalc';
import type { LiveCalcTurnOrderObservation } from '../../utils/liveCalcSpeedEngine';
import CalcAutocomplete from '../calc/CalcAutocomplete';

interface LiveCalcTurnOrderListProps {
  observations: LiveCalcTurnOrderObservationEntry[];
  moveOptions: string[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<LiveCalcTurnOrderObservation>) => void;
  onRemove: (id: string) => void;
}

export default function LiveCalcTurnOrderList({ observations, moveOptions, onAdd, onUpdate, onRemove }: LiveCalcTurnOrderListProps) {
  return (
    <div className="flex-1 min-w-[280px] bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">Turn Order</h3>
        <button
          type="button"
          onClick={onAdd}
          className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors cursor-pointer bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
        >
          + Add
        </button>
      </div>

      {observations.length === 0 && (
        <p className="text-xs text-zinc-500">No observations yet - add one for each turn you saw the move order for.</p>
      )}

      {observations.map(obs => (
        <div key={obs.id} className="flex items-center gap-2">
          <div className="flex-1">
            <CalcAutocomplete
              value={obs.moveName}
              options={moveOptions}
              placeholder="Your move that turn..."
              onChange={(moveName) => onUpdate(obs.id, { moveName })}
            />
          </div>
          <select
            value={obs.wentFirst}
            onChange={(e) => onUpdate(obs.id, { wentFirst: e.target.value as 'attacker' | 'defender' })}
            title="Which side acted first this turn"
            className="px-1 py-0.5 text-xs bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold cursor-pointer"
          >
            <option value="attacker">You went first</option>
            <option value="defender">Defender went first</option>
          </select>
          <input
            type="number"
            min={-6}
            max={6}
            value={obs.defenderSpeedStage}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (!Number.isNaN(parsed)) onUpdate(obs.id, { defenderSpeedStage: Math.max(-6, Math.min(6, parsed)) });
            }}
            title="Defender's Speed stage this turn (-6 to +6)"
            className="w-10 shrink-0 px-1 py-0.5 text-xs text-center bg-zinc-900 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
          />
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
