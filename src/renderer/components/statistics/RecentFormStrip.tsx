/**
 * RecentFormStrip.tsx - Chronological Form Guide
 * A row of colored chips (oldest to newest, left to right) showing the
 * last N completed battle results at a glance. Reuses the win=green/
 * loss=red convention already established in PastBattlesList.tsx.
 */

import type { Battle } from '../../types/pokemon';

interface RecentFormStripProps {
  form: { id: string; result: Battle['result'] }[];
}

const CHIP_STYLES: Record<Battle['result'], string> = {
  win: 'bg-green-600 text-white',
  loss: 'bg-red-600 text-white',
  'in-progress': 'bg-yellow-600 text-white',
};

export default function RecentFormStrip({ form }: RecentFormStripProps) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-gray-800 border border-gray-700">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Recent Form</h3>
      {form.length === 0 ? (
        <p className="text-sm text-gray-500">No completed battles yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {form.map(entry => (
            <span
              key={entry.id}
              title={entry.result}
              className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold ${CHIP_STYLES[entry.result]}`}
            >
              {entry.result === 'win' ? 'W' : 'L'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
