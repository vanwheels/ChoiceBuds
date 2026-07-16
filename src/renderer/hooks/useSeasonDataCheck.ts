/**
 * useSeasonDataCheck Hook - Manual-Refresh Reminder for config/seasons.ts
 * Season/regulation dates can't be fetched live (no-scrape policy, see
 * CLAUDE.md) - this only computes whether the hand-maintained table looks
 * stale and tracks when a human last verified it, mirroring the
 * lastPushedAt/lastPulledAt timestamp pattern on AppSettings (SyncSection).
 */

import { useMemo, useState } from 'react';
import type { AppSettings } from '../types/pokemon';
import { type SeasonDef, getLatestSeason } from '../config/seasons';

// Warn once the latest tracked season is within two weeks of ending (or has
// already ended) - gives enough lead time to research and add the next row
// before battles start falling outside every known season.
const STALE_WARNING_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export interface UseSeasonDataCheckReturn {
  latestSeason: SeasonDef;
  isStale: boolean;
  lastCheckedAt: number | null;
  markChecked: () => Promise<boolean>;
}

export function useSeasonDataCheck(
  settings: AppSettings,
  updateSettings: (partial: Partial<Omit<AppSettings, 'version' | 'lastModified'>>) => Promise<boolean>
): UseSeasonDataCheckReturn {
  const latestSeason = useMemo(() => getLatestSeason(), []);
  // Date.now() can't be called directly during render (react-hooks/purity) -
  // a useState lazy initializer is the sanctioned escape hatch, since it
  // only runs once on mount rather than on every render. "Stale" only needs
  // to be right within the warning window's day-scale granularity, so
  // pinning it to mount time rather than live wall-clock time is fine here.
  const [mountedAt] = useState(() => Date.now());
  const isStale = mountedAt >= latestSeason.end - STALE_WARNING_WINDOW_MS;

  const markChecked = (): Promise<boolean> => updateSettings({ lastSeasonDataCheckedAt: Date.now() });

  return {
    latestSeason,
    isStale,
    lastCheckedAt: settings.lastSeasonDataCheckedAt,
    markChecked,
  };
}
