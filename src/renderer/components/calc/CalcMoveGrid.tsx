/**
 * CalcMoveGrid.tsx - One Pokémon's 4-Move Damage Grid
 * Each row is a move slot: name autocomplete + crit toggle + (for
 * multi-hit moves) a hit-count picker + live damage %. Clicking a row
 * selects it as the detailed result shown in CalcResultPanel - mirrors the
 * real Champions calc's "select one to show detailed results" move
 * buttons. No per-row "Move 1"/"Move 2" label - kept compact since the
 * grid title already establishes what these rows are.
 */

import type { CalcMoveSlot, CalcMoveResultEntry } from '../../hooks/useDamageCalc';
import CalcAutocomplete from './CalcAutocomplete';

interface CalcMoveGridProps {
  title: string;
  moves: CalcMoveSlot[];
  results: CalcMoveResultEntry[];
  moveOptions: string[];
  selectedIndex: number | null;
  onChangeMove: (index: number, updates: Partial<CalcMoveSlot>) => void;
  onSelect: (index: number) => void;
}

export default function CalcMoveGrid({ title, moves, results, moveOptions, selectedIndex, onChangeMove, onSelect }: CalcMoveGridProps) {
  return (
    <div className="flex-1 min-w-[280px] bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-1">
      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">{title}</h3>
      {moves.map((slot, index) => {
        const result = results[index];
        const isSelected = selectedIndex === index;
        const [minHits, maxHits] = result?.multihitRange ?? [null, null];
        return (
          <div
            key={index}
            onClick={() => slot.name && onSelect(index)}
            className={`flex items-center gap-2 px-2 py-0.5 rounded border transition-colors ${
              isSelected ? 'border-blue-500 bg-blue-950/40' : 'border-zinc-800 hover:border-zinc-700'
            } ${slot.name ? 'cursor-pointer' : ''}`}
          >
            <div className="w-40 shrink-0" onClick={(e) => e.stopPropagation()}>
              <CalcAutocomplete
                value={slot.name}
                options={moveOptions}
                placeholder="Search moves..."
                onChange={(name) => onChangeMove(index, { name, hits: undefined })}
              />
            </div>
            {minHits !== null && maxHits !== null && (
              <select
                value={slot.hits ?? result?.effectiveHits ?? minHits}
                onChange={(e) => { e.stopPropagation(); onChangeMove(index, { hits: Number(e.target.value) }); }}
                onClick={(e) => e.stopPropagation()}
                title="Number of hits"
                className="px-1 py-0.5 text-xs bg-gray-800 border border-gray-600 rounded text-white outline-none focus:border-blue-500 cursor-pointer"
              >
                {Array.from({ length: maxHits - minHits + 1 }, (_, i) => minHits + i).map(n => (
                  <option key={n} value={n}>×{n}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChangeMove(index, { isCrit: !slot.isCrit }); }}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer shrink-0 ${
                slot.isCrit ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Crit
            </button>
            <span className="w-28 text-right text-xs font-semibold text-zinc-200 shrink-0">
              {result?.errorMessage ? '—' : result?.percent ?? ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
