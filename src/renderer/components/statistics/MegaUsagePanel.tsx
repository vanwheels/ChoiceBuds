/**
 * MegaUsagePanel.tsx - Mega Evolution Usage Comparison
 * Two-row StatBar comparison: win rate in battles where a Mega was used
 * vs. battles where one wasn't.
 */

import type { WinLossRecord } from '../../utils/battleStats';
import StatBar from './StatBar';

interface MegaUsagePanelProps {
  withMega: WinLossRecord;
  withoutMega: WinLossRecord;
}

export default function MegaUsagePanel({ withMega, withoutMega }: MegaUsagePanelProps) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg bg-gray-800 border border-gray-700">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Mega Evolution Usage</h3>
      {withMega.total === 0 && withoutMega.total === 0 ? (
        <p className="text-sm text-gray-500">No completed battles yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <StatBar label="Mega used" wins={withMega.wins} losses={withMega.losses} winRate={withMega.winRate} />
          <StatBar label="No Mega used" wins={withoutMega.wins} losses={withoutMega.losses} winRate={withoutMega.winRate} />
        </div>
      )}
    </div>
  );
}
