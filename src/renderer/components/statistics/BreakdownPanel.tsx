/**
 * BreakdownPanel.tsx - Generic Win/Loss Breakdown List
 * Renders a titled panel of StatBar rows - reused for both the
 * per-format and per-team breakdowns on the Statistics page.
 */

import type { LabeledRecord } from '../../utils/battleStats';
import StatBar from './StatBar';

interface BreakdownPanelProps {
  title: string;
  records: LabeledRecord[];
  emptyMessage: string;
}

export default function BreakdownPanel({ title, records, emptyMessage }: BreakdownPanelProps) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg bg-gray-800 border border-gray-700">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">{title}</h3>
      {records.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {records.map(record => (
            <StatBar key={record.label} label={record.label} wins={record.wins} losses={record.losses} winRate={record.winRate} />
          ))}
        </div>
      )}
    </div>
  );
}
