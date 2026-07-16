/**
 * SeasonDataCheckSection.tsx - Manual-Refresh Reminder for Season Data
 * Surfaces the hand-maintained config/seasons.ts table's freshness - this
 * can't self-update (no-live-scrape policy), so the best the app can do is
 * remind a human to go check Bulbapedia/Serebii and edit the file by hand.
 */

import type { UseSeasonDataCheckReturn } from '../hooks/useSeasonDataCheck';

interface SeasonDataCheckSectionProps {
  seasonDataCheckState: UseSeasonDataCheckReturn;
}

export default function SeasonDataCheckSection({ seasonDataCheckState }: SeasonDataCheckSectionProps) {
  const { latestSeason, isStale, lastCheckedAt, markChecked } = seasonDataCheckState;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h2 className="text-sm font-semibold text-gray-200">Season Data</h2>
      <p className="mt-1 text-xs text-gray-400">
        Ranked season dates are hand-maintained from Bulbapedia/Serebii, not fetched live.
      </p>

      <div className="mt-3">
        {/* seasons.ts stores dates as UTC midnight - format in UTC or it renders a day early in negative-offset timezones. */}
        <p className="text-xs text-gray-300">
          Latest tracked season: <span className="font-semibold">{latestSeason.label}</span> ({latestSeason.regulation}),
          {' '}ends {new Date(latestSeason.end).toLocaleDateString(undefined, { timeZone: 'UTC' })}
        </p>
        {isStale && (
          <p className="mt-1 text-xs text-yellow-400">
            That's coming up soon or has already passed - check Bulbapedia/Serebii for a newer season and add it to config/seasons.ts.
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={markChecked}
          className="px-2 py-1 text-[11px] font-bold rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
        >
          Mark as Checked
        </button>
        <p className="text-[11px] text-gray-500">
          {lastCheckedAt ? `Last checked: ${new Date(lastCheckedAt).toLocaleString()}` : 'Never checked'}
        </p>
      </div>
    </div>
  );
}
