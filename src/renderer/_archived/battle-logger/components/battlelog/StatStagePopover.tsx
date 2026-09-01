/**
 * StatStagePopover.tsx - Manual Stat-Stage Adjuster
 * 5 rows (Atk/Def/SpA/SpD/Spe), each a -/value/+ control. Opens from a
 * Battlefield slot's "Stats" corner button - the -6..6 clamping and
 * logging happen in useBattleLogActions.ts::adjustStatStage, this is
 * purely presentational.
 */

import type { StatKey, StatStages } from '../../types/pokemon';
import { useDismissable } from '../../hooks/useDismissable';
import { STAT_ORDER, STAT_LABELS } from '../../config/statStages';

interface StatStagePopoverProps {
  stages: StatStages;
  onAdjust: (stat: StatKey, delta: number) => void;
  onClose: () => void;
}

export default function StatStagePopover({ stages, onAdjust, onClose }: StatStagePopoverProps) {
  const ref = useDismissable<HTMLDivElement>(onClose);

  return (
    <div ref={ref} className="absolute z-20 top-full mt-1 left-1/2 -translate-x-1/2 w-36 p-2 rounded-lg bg-zinc-800 border-2 border-accent-gold shadow-lg flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Stat Stages</span>
        <button type="button" onClick={onClose} className="text-zinc-500 hover:text-red-400 cursor-pointer text-xs">×</button>
      </div>
      {STAT_ORDER.map(stat => {
        const value = stages[stat] ?? 0;
        return (
          <div key={stat} className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-zinc-300 w-7">{STAT_LABELS[stat]}</span>
            <button
              type="button"
              onClick={() => onAdjust(stat, -1)}
              disabled={value <= -6}
              className="w-5 h-5 flex items-center justify-center rounded bg-zinc-900 text-zinc-300 hover:text-red-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              -
            </button>
            <span className={`text-[11px] w-6 text-center font-semibold ${value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
              {value > 0 ? `+${value}` : value}
            </span>
            <button
              type="button"
              onClick={() => onAdjust(stat, 1)}
              disabled={value >= 6}
              className="w-5 h-5 flex items-center justify-center rounded bg-zinc-900 text-zinc-300 hover:text-green-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        );
      })}
    </div>
  );
}
