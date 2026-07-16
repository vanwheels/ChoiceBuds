/**
 * seasons.ts - Ranked Battles Season Date Ranges
 *
 * Sub-divisions within a Regulation (Reg M-A/M-B) that Champions' ranked
 * ladder rotates through. A battle's season is derived purely from its
 * existing `Battle.date` timestamp against this table - no season field is
 * persisted anywhere.
 *
 * DATA SOURCE: hand-checked against Bulbapedia ("Ranked Battles Seasons in
 * Pokémon Champions") and Serebii (rankedbattle/regulationm-a.shtml,
 * regulationm-b.shtml) on 2026-07-08 - see TODO.md's season-level-breakdowns
 * entry and the reg_mb_season_timeline memory note for full citations.
 */

export interface SeasonDef {
  id: string;
  label: string;
  regulation: 'Reg M-A' | 'Reg M-B';
  start: number; // unix ms, inclusive
  end: number; // unix ms, exclusive (= next season's start)
}

export const SEASONS: SeasonDef[] = [
  { id: 'M-1', label: 'M-1', regulation: 'Reg M-A', start: Date.parse('2026-04-08'), end: Date.parse('2026-05-13') },
  { id: 'M-2', label: 'M-2', regulation: 'Reg M-A', start: Date.parse('2026-05-13'), end: Date.parse('2026-06-17') },
  { id: 'M-3', label: 'M-3', regulation: 'Reg M-B', start: Date.parse('2026-06-17'), end: Date.parse('2026-07-08') },
  { id: 'M-4', label: 'M-4', regulation: 'Reg M-B', start: Date.parse('2026-07-08'), end: Date.parse('2026-08-05') },
  // M-5's dates aren't published yet as of 2026-07-13 - inferred from the
  // prior seasons' pattern only. Re-confirm against Bulbapedia/Serebii before
  // ~2026-08-05 and update this row (plus add M-6+) once real dates land.
  { id: 'M-5', label: 'M-5', regulation: 'Reg M-B', start: Date.parse('2026-08-05'), end: Date.parse('2026-09-02') },
];

export function getSeasonForDate(timestamp: number): SeasonDef | undefined {
  return SEASONS.find(s => timestamp >= s.start && timestamp < s.end);
}

/**
 * The most recently-added row - used by the Settings page's manual-refresh
 * reminder to warn once this table needs extending (its end date is
 * imminent/passed), since this table can never auto-extend itself per the
 * no-live-scrape policy.
 */
export function getLatestSeason(): SeasonDef {
  return SEASONS[SEASONS.length - 1];
}
