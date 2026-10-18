/**
 * tourneyEvents.ts - Tourney Tab Date Logic
 * Pure functions over config/tourneyEvents.ts's static schedule - kept out
 * of TourneyPage.tsx so the "what's upcoming" and date-formatting rules are
 * unit-testable without React. Every date field on TourneyEvent is an ISO
 * 'YYYY-MM-DD' calendar day with no time component, so these treat all
 * dates as UTC-midnight throughout (parseISODate/`now`'s own UTC slice) to
 * avoid a local-timezone shift reclassifying an event as past/upcoming or
 * printing the wrong day - the same UTC-as-calendar-day treatment
 * config/seasons.ts already uses for its own ISO date strings.
 */

import type { TourneyEvent } from '../config/tourneyEvents';

function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

const MONTH_DAY_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const MONTH_ONLY_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const MONTH_DAY_YEAR_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Events whose last day hasn't passed yet (inclusive - an event still in
 * progress today still counts as upcoming), sorted soonest-first.
 */
export function getUpcomingEvents(events: TourneyEvent[], now: Date = new Date()): TourneyEvent[] {
  const todayISO = now.toISOString().slice(0, 10);
  return events
    .filter((event) => event.endDate >= todayISO)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/**
 * "Sep 18-20, 2026" for a same-month span, "Sep 26 - Oct 4, 2026" across
 * months, "Dec 28, 2026 - Jan 2, 2027" across years, or a single date for a
 * one-day event.
 */
export function formatEventDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    return MONTH_DAY_YEAR_FORMAT.format(parseISODate(startDate));
  }

  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    return `${MONTH_ONLY_FORMAT.format(start)} ${start.getUTCDate()}-${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  }
  if (sameYear) {
    return `${MONTH_DAY_FORMAT.format(start)} - ${MONTH_DAY_YEAR_FORMAT.format(end)}`;
  }
  return `${MONTH_DAY_YEAR_FORMAT.format(start)} - ${MONTH_DAY_YEAR_FORMAT.format(end)}`;
}

export function formatEventDeadline(deadline: string): string {
  return MONTH_DAY_YEAR_FORMAT.format(parseISODate(deadline));
}
