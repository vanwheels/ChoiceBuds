/**
 * CalcMoveGrid.tsx - One Pokémon's 4-Move Damage Grid
 * Each row is a move slot: name autocomplete + crit checkbox + live damage
 * %. Clicking a row selects it as the detailed result shown in
 * CalcResultPanel - mirrors the real Champions calc's "select one to show
 * detailed results" move buttons.
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
    <div className="flex-1 min-w-[280px] bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-2">
      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">{title}</h3>
      {moves.map((slot, index) => {
        const result = results[index];
        const isSelected = selectedIndex === index;
        return (
          <div
            key={index}
            onClick={() => slot.name && onSelect(index)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-colors ${
              isSelected ? 'border-blue-500 bg-blue-950/40' : 'border-zinc-800 hover:border-zinc-700'
            } ${slot.name ? 'cursor-pointer' : ''}`}
          >
            <div className="flex-1" onClick={(e) => e.stopPropagation()}>
              <CalcAutocomplete
                label={`Move ${index + 1}`}
                value={slot.name}
                options={moveOptions}
                placeholder="Search moves..."
                onChange={(name) => onChangeMove(index, { name })}
              />
            </div>
            <label
              className="flex items-center gap-1 text-[10px] text-zinc-400 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={slot.isCrit}
                onChange={(e) => onChangeMove(index, { isCrit: e.target.checked })}
                className="cursor-pointer"
              />
              Crit
            </label>
            <span className="w-28 text-right text-xs font-semibold text-zinc-200 shrink-0">
              {result?.errorMessage ? '—' : result?.percent ?? ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
