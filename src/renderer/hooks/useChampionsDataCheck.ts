/**
 * useChampionsDataCheck Hook - Manual-Refresh Reminder for Champions Balance
 * Tables
 * Mirrors useSeasonDataCheck.ts's "last verified" tracking, but the
 * staleness signal differs: Champions only patches balance at a Regulation
 * boundary (M-A -> M-B -> M-C), not season-to-season within a regulation, so
 * a tracked file is stale once the latest regulation in config/seasons.ts
 * has changed since it was last verified - not a date window.
 */

import { useMemo } from 'react';
import type { AppSettings, ChampionsDataCheckId } from '../types/pokemon';
import { getLatestSeason } from '../config/seasons';
import { CHAMPIONS_DATA_CHECKS } from '../config/championsDataChecks';

export interface ChampionsDataCheckStatus {
  id: ChampionsDataCheckId;
  label: string;
  filePath: string;
  regulation: string | null; // regulation this file was last verified against, null if never checked
  checkedAt: number | null;
  isStale: boolean;
}

export interface UseChampionsDataCheckReturn {
  latestRegulation: string;
  checks: ChampionsDataCheckStatus[];
  markChecked: (id: ChampionsDataCheckId) => Promise<boolean>;
}

export function useChampionsDataCheck(
  settings: AppSettings,
  updateSettings: (partial: Partial<Omit<AppSettings, 'version' | 'lastModified'>>) => Promise<boolean>
): UseChampionsDataCheckReturn {
  const latestRegulation = useMemo(() => getLatestSeason().regulation, []);

  const checks = CHAMPIONS_DATA_CHECKS.map(def => {
    const stored = settings.championsDataChecks[def.id] ?? null;
    return {
      id: def.id,
      label: def.label,
      filePath: def.filePath,
      regulation: stored?.regulation ?? null,
      checkedAt: stored?.checkedAt ?? null,
      isStale: stored?.regulation !== latestRegulation,
    };
  });

  const markChecked = (id: ChampionsDataCheckId): Promise<boolean> =>
    updateSettings({
      championsDataChecks: {
        ...settings.championsDataChecks,
        [id]: { regulation: latestRegulation, checkedAt: Date.now() },
      },
    });

  return {
    latestRegulation,
    checks,
    markChecked,
  };
}
