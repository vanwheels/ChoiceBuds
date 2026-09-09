/**
 * seasons.ts - Ranked Battles Season Date Ranges
 *
 * Sub-divisions within a Regulation (Reg M-A/M-B/M-C) that Champions' ranked
 * ladder rotates through. A battle's season is derived purely from its
 * existing `Battle.date` timestamp against this table - no season field is
 * persisted anywhere.
 *
 * DATA SOURCE: hand-checked against Bulbapedia ("Ranked Battles Seasons in
 * Pokémon Champions") and Serebii (rankedbattle/regulationm-a.shtml,
 * regulationm-b.shtml) on 2026-07-08 - see TODO.md's season-level-breakdowns
 * entry and the reg_mb_season_timeline memory note for full citations.
 *
 * M-5 re-verified 2026-09-09 against Bulbapedia's same page, now updated
 * with a real end date (previously an inferred placeholder, 2026-09-02) -
 * confirmed end is "September 9, 2026 01:59 UTC", truncated to the date-only
 * granularity every other row already uses.
 *
 * M-6 added 2026-09-09 (~12hrs after M-5's re-verification above, re-checked
 * per Vanny's prompt that data tends to settle in the hours after a patch):
 * Serebii's dedicated `seasonm-6.shtml`/`regulationm-c.shtml` pages now
 * publish "September 9th 2026 - October 7th 2026" - Bulbapedia's season-list
 * page still ends at M-5 with no M-6 row yet, so this entry is Serebii-only
 * for now (no UTC time-of-day given by Serebii, consistent with the
 * date-only granularity already used here). M-7+ still not addable: neither
 * source has individual rows past M-6 yet, only the regulation-level overall
 * range (September 9 - December 2, 2026). Re-check both sources for M-7+ as
 * they land; don't infer dates the way M-5 briefly was above.
 */

export interface SeasonDef {
  id: string;
  label: string;
  regulation: 'Reg M-A' | 'Reg M-B' | 'Reg M-C';
  start: number; // unix ms, inclusive
  end: number; // unix ms, exclusive (= next season's start)
}

export const SEASONS: SeasonDef[] = [
  { id: 'M-1', label: 'M-1', regulation: 'Reg M-A', start: Date.parse('2026-04-08'), end: Date.parse('2026-05-13') },
  { id: 'M-2', label: 'M-2', regulation: 'Reg M-A', start: Date.parse('2026-05-13'), end: Date.parse('2026-06-17') },
  { id: 'M-3', label: 'M-3', regulation: 'Reg M-B', start: Date.parse('2026-06-17'), end: Date.parse('2026-07-08') },
  { id: 'M-4', label: 'M-4', regulation: 'Reg M-B', start: Date.parse('2026-07-08'), end: Date.parse('2026-08-05') },
  { id: 'M-5', label: 'M-5', regulation: 'Reg M-B', start: Date.parse('2026-08-05'), end: Date.parse('2026-09-09') },
  { id: 'M-6', label: 'M-6', regulation: 'Reg M-C', start: Date.parse('2026-09-09'), end: Date.parse('2026-10-07') },
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
