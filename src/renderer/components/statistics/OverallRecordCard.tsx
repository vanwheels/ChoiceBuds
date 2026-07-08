/**
 * OverallRecordCard.tsx - Headline Win/Loss Record
 * Large summary card at the top of the Statistics page.
 */

import type { WinLossRecord } from '../../utils/battleStats';

interface OverallRecordCardProps {
  record: WinLossRecord;
}

export default function OverallRecordCard({ record }: OverallRecordCardProps) {
  return (
    <div className="flex items-center justify-between p-6 rounded-lg bg-gray-800 border border-gray-700">
      <div>
        <div className="text-3xl font-bold text-gray-100">
          {record.wins}-{record.losses}
        </div>
        <div className="text-xs text-gray-400 mt-1">{record.total} battle{record.total === 1 ? '' : 's'} logged</div>
      </div>
      <div className="text-right">
        <div className="text-3xl font-bold text-blue-400">{Math.round(record.winRate * 100)}%</div>
        <div className="text-xs text-gray-400 mt-1">Win rate</div>
      </div>
    </div>
  );
}
