/**
 * StatusConditionPopover.tsx - Manual Status-Condition Setter
 * 6 status buttons + "None" to clear. Opens from a Battlefield slot's
 * "Status" corner button, modeled directly on StatStagePopover.tsx - the
 * set/clear/logging logic lives in useBattleLogActions.ts::setStatusCondition,
 * this is purely presentational.
 */

import type { StatusCondition } from '../../types/pokemon';
import { useDismissable } from '../../hooks/useDismissable';
import { STATUS_ORDER, STATUS_LABELS, STATUS_COLORS } from '../../config/statusConditions';

interface StatusConditionPopoverProps {
  current: StatusCondition | null;
  onPick: (status: StatusCondition | null) => void;
  onClose: () => void;
}

export default function StatusConditionPopover({ current, onPick, onClose }: StatusConditionPopoverProps) {
  const ref = useDismissable<HTMLDivElement>(onClose);

  return (
    <div ref={ref} className="absolute z-20 top-full mt-1 left-1/2 -translate-x-1/2 w-32 p-2 rounded-lg bg-gray-800 border-2 border-blue-500 shadow-lg flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Status</span>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-red-400 cursor-pointer text-xs">×</button>
      </div>
      {STATUS_ORDER.map(status => (
        <button
          key={status}
          type="button"
          onClick={() => onPick(status)}
          className={`text-left px-2 py-1 text-[11px] rounded cursor-pointer transition-colors ${
            current === status ? STATUS_COLORS[status] : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {STATUS_LABELS[status]}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPick(null)}
        disabled={!current}
        className="text-left px-2 py-1 text-[11px] rounded bg-gray-900 text-gray-500 hover:text-red-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
      >
        {current === 'sleep' ? 'Wake Up' : 'None'}
      </button>
    </div>
  );
}
