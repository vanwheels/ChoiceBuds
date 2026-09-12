/**
 * LiveCalcMoveRangeGrid.tsx - Live Calc's Range-Aware Move Grid
 * (Live Calc Page Layout & Function Rework - Leg 3, Layout & Live Range Grid
 * Rework). Same 4-move-slot shape as the Calc tab's CalcMoveGrid, but each
 * row shows a min-max % SPAN across the opponent's still-narrowing stat/
 * candidate space (utils/liveCalcEngine.ts's computeYourMoveRanges/
 * computeTheirMoveRanges) rather than one fixed Result for one fully-known
 * defender - CalcMoveGrid's Result type assumes a single concrete matchup,
 * which doesn't fit here, hence a dedicated variant rather than reusing it.
 *
 * Deliberately missing two things CalcMoveGrid has: no move-select/detail-
 * panel wiring - Live Calc's own LiveCalcResultPanel already shows the
 * narrowed-inference detail below the grids, and there's no per-move
 * "explain this one result" breakdown to click into since no single
 * defender build exists to explain a range across many candidates. No hit-
 * count picker either - multi-hit moves aren't modeled by the inference
 * engine yet (see liveCalcEngine.ts's own header) and show as an error/dash
 * row instead via `entry.errorMessage`.
 */

import type { CalcMoveSlot } from '../../hooks/useDamageCalc';
import type { LiveCalcMoveRangeEntry } from '../../utils/liveCalcEngine';
import CalcAutocomplete from '../calc/CalcAutocomplete';

interface LiveCalcMoveRangeGridProps {
  title: string;
  moves: CalcMoveSlot[];
  ranges: LiveCalcMoveRangeEntry[];
  moveOptions: string[];
  onChangeMove: (index: number, updates: Partial<CalcMoveSlot>) => void;
}

export default function LiveCalcMoveRangeGrid({ title, moves, ranges, moveOptions, onChangeMove }: LiveCalcMoveRangeGridProps) {
  return (
    <div className="flex-1 min-w-[280px] bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-1">
      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">{title}</h3>
      {moves.map((slot, index) => {
        const entry = ranges[index];
        return (
          <div key={index} className="flex items-center gap-2 px-2 py-0.5 rounded border border-zinc-800">
            <div className="w-40 shrink-0">
              <CalcAutocomplete
                value={slot.name}
                options={moveOptions}
                placeholder="Search moves..."
                onChange={(name) => onChangeMove(index, { name })}
              />
            </div>
            <button
              type="button"
              onClick={() => onChangeMove(index, { isCrit: !slot.isCrit })}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer shrink-0 ${
                slot.isCrit ? 'bg-accent-gold text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Crit
            </button>
            <span
              className="flex-1 text-right text-xs font-semibold text-zinc-200 truncate"
              title={entry?.errorMessage ?? undefined}
            >
              {entry?.errorMessage ? '—' : entry?.percent ?? ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
