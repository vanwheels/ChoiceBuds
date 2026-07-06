/**
 * EVStatCell.tsx - Single EV Stat Editor Cell
 * Only the currently-active cell (isActive) shows the hold-to-repeat +/-
 * buttons and typable input; every other cell stays a compact label+value
 * button. This keeps the 3-column grid from ever needing more than one
 * cell's worth of extra width, so it can't overflow the stats box/card on
 * resize - see StatsColumn.tsx for how `isActive` is chosen.
 */

import { useHoldRepeat } from '../hooks/useHoldRepeat';

interface EVStatCellProps {
  label: string;
  value: number;
  isEditing: boolean;
  isActive: boolean;
  exceedsMax: boolean;
  canIncrement: boolean;
  onActivate: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onDirectInput: (value: number) => void;
}

const valueClassName = (exceedsMax: boolean, editableBorder: boolean) =>
  `text-sm font-mono font-bold rounded border ${
    exceedsMax ? 'border-red-500 text-red-400 bg-red-950/20' : editableBorder ? 'border-gray-600 bg-gray-900 text-gray-100' : 'border-transparent text-gray-100'
  }`;

export default function EVStatCell({
  label,
  value,
  isEditing,
  isActive,
  exceedsMax,
  canIncrement,
  onActivate,
  onIncrement,
  onDecrement,
  onDirectInput,
}: EVStatCellProps) {
  const incRepeat = useHoldRepeat(onIncrement);
  const decRepeat = useHoldRepeat(onDecrement);

  if (!isEditing) {
    return (
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-bold text-gray-400 uppercase">{label}</span>
        <span className={`${valueClassName(exceedsMax, false)} px-1.5 py-0.5`}>{value}</span>
      </div>
    );
  }

  if (!isActive) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="flex flex-col items-center gap-0.5 rounded px-1 py-0.5 hover:bg-gray-700/60 transition-colors cursor-pointer"
      >
        <span className="text-[10px] font-bold text-gray-400 uppercase">{label}</span>
        <span className={`${valueClassName(exceedsMax, false)} px-1.5 py-0.5`}>{value}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-bold text-gray-400 uppercase">{label}</span>
      <div className="flex items-center gap-0.5 min-w-0">
        <button
          {...decRepeat}
          disabled={value <= 0}
          className="w-5 h-5 text-xs font-bold rounded border shrink-0"
          style={{ backgroundColor: value <= 0 ? '#1f2937' : '#374151', color: value <= 0 ? '#6b7280' : '#f3f4f6', borderColor: '#4b5563', cursor: value <= 0 ? 'not-allowed' : 'pointer' }}
        >
          −
        </button>
        <input
          type="number"
          value={value}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onDirectInput(Number(e.target.value))}
          className={`${valueClassName(exceedsMax, true)} w-9 text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        />
        <button
          {...incRepeat}
          disabled={!canIncrement}
          className="w-5 h-5 text-xs font-bold rounded border shrink-0"
          style={{ backgroundColor: !canIncrement ? '#1f2937' : '#374151', color: !canIncrement ? '#6b7280' : '#f3f4f6', borderColor: '#4b5563', cursor: !canIncrement ? 'not-allowed' : 'pointer' }}
        >
          +
        </button>
      </div>
    </div>
  );
}
