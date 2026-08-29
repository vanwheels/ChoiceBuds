/**
 * OverallRecordCard.tsx - Headline Win/Loss Record
 * Large summary card at the top of the Statistics page.
 */

import type { WinLossRecord } from '../../utils/battleStats';

interface OverallRecordCardProps {
  record: WinLossRecord;
  unitLabel?: string;
}

export default function OverallRecordCard({ record, unitLabel = 'battle' }: OverallRecordCardProps) {
  return (
    <div className="flex items-center justify-between p-6 rounded-lg bg-zinc-800 border border-zinc-700">
      <div>
        <div className="text-3xl font-bold text-zinc-100">
          {record.wins}-{record.losses}
        </div>
        <div className="text-xs text-zinc-400 mt-1">{record.total} {unitLabel}{record.total === 1 ? '' : 's'} logged</div>
      </div>
      <div className="text-right">
        <div className="text-3xl font-bold text-accent-gold">{Math.round(record.winRate * 100)}%</div>
        <div className="text-xs text-zinc-400 mt-1">Win rate</div>
      </div>
    </div>
  );
}
