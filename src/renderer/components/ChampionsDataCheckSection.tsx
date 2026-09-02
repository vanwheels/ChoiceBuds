/**
 * ChampionsDataCheckSection.tsx - Manual-Refresh Reminder for Champions
 * Balance Tables
 * One shared section covering all three tracked hand-authored files
 * (championsMoveOverrides.ts/championsAbilityOverrides.ts/
 * championsMovepoolChanges.ts) - mirrors SeasonDataCheckSection.tsx's visual
 * language, but keyed per-file since each can go stale independently.
 */

import type { UseChampionsDataCheckReturn } from '../hooks/useChampionsDataCheck';

interface ChampionsDataCheckSectionProps {
  championsDataCheckState: UseChampionsDataCheckReturn;
}

export default function ChampionsDataCheckSection({ championsDataCheckState }: ChampionsDataCheckSectionProps) {
  const { latestRegulation, checks, markChecked } = championsDataCheckState;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Champions Balance Data</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Champions' balance-patch corrections are hand-maintained, not fetched live - each is
        verified against a regulation and goes stale once a newer regulation lands.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {checks.map(check => (
          <div key={check.id} className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-zinc-300">
                <span className="font-semibold">{check.label}</span>
                {' '}- last verified against {check.regulation ?? 'nothing yet'}
              </p>
              {check.isStale && (
                <p className="mt-0.5 text-[11px] text-yellow-400">
                  Latest tracked regulation is {latestRegulation} - re-audit {check.filePath}.
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {check.checkedAt ? `Last checked: ${new Date(check.checkedAt).toLocaleString()}` : 'Never checked'}
              </p>
            </div>
            <button
              onClick={() => markChecked(check.id)}
              className="px-2 py-1 text-[11px] font-bold rounded bg-accent-gold text-zinc-900 hover:bg-accent-gold-deep transition-colors cursor-pointer shrink-0"
            >
              Mark as Checked
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
