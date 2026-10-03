/**
 * EVStatCell.tsx - Single EV Stat Editor Cell
 * Only the currently-active cell (isActive) shows the hold-to-repeat +/-
 * buttons and typable input; every other cell stays a compact label+value
 * button. The active editor (~80px) is wider than a grid column at narrow
 * card widths (~42px in a 6-column TeamCard grid), so it floats over its row
 * (absolutely positioned, anchored by `column` so it never leaves the stats
 * box) instead of widening its column and pushing neighbours out of the box.
 * An invisible copy of the value keeps the cell's in-flow height unchanged.
 * See StatsColumn.tsx for how `isActive` is chosen.
 */

import { useHoldRepeat } from '../hooks/useHoldRepeat';
import { getStatLabelColor } from '../config/pokemonTheme';

interface EVStatCellProps {
  label: string;
  value: number;
  isActive: boolean;
  /** Grid column (0-2) - picks which edge the floating editor anchors to. */
  column: number;
  exceedsMax: boolean;
  canIncrement: boolean;
  onActivate: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onDirectInput: (value: number) => void;
}

const EDITOR_ANCHOR = ['left-0', 'left-1/2 -translate-x-1/2', 'right-0'];

const valueClassName = (exceedsMax: boolean, editableBorder: boolean) =>
  `text-sm font-mono font-bold rounded border ${
    exceedsMax ? 'border-red-500 text-red-400 bg-red-950/20' : editableBorder ? 'border-zinc-600 bg-zinc-900 text-zinc-100' : 'border-transparent text-zinc-100'
  }`;

// Permanently editable (Always-On Editing Leg 1, see TODO.md) - no more
// isEditing gate; every cell is always at least the clickable
// label+value button below, activating into the hold-to-repeat editor on click.
export default function EVStatCell({
  label,
  value,
  isActive,
  column,
  exceedsMax,
  canIncrement,
  onActivate,
  onIncrement,
  onDecrement,
  onDirectInput,
}: EVStatCellProps) {
  const incRepeat = useHoldRepeat(onIncrement);
  const decRepeat = useHoldRepeat(onDecrement);

  if (!isActive) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="flex flex-col items-center gap-0.5 rounded px-1 py-0.5 hover:bg-zinc-700/60 transition-colors cursor-pointer"
      >
        <span className={`text-[10px] font-bold uppercase ${getStatLabelColor(label)}`}>{label}</span>
        <span className={`${valueClassName(exceedsMax, false)} px-1.5 py-0.5`}>{value}</span>
      </button>
    );
  }

  return (
    <div className="relative flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-bold text-zinc-400 uppercase">{label}</span>
      <span aria-hidden className={`${valueClassName(false, false)} px-1.5 py-0.5 invisible`}>{value}</span>
      <div className={`absolute bottom-0 z-10 flex items-center gap-0.5 rounded bg-zinc-800 ${EDITOR_ANCHOR[column] ?? EDITOR_ANCHOR[1]}`}>
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
