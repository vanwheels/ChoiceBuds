import { describe, it, expect } from 'vitest';
import type { TourneyEvent } from '../config/tourneyEvents';
import { getUpcomingEvents, formatEventDateRange, formatEventDeadline } from './tourneyEvents';

function makeEvent(overrides: Partial<TourneyEvent>): TourneyEvent {
  return {
    id: 'test-event',
    name: 'Test Championships',
    tier: 'regional',
    city: 'Test City',
    country: 'Testland',
    startDate: '2026-01-01',
    endDate: '2026-01-02',
    ...overrides,
  };
}

describe('getUpcomingEvents', () => {
  const now = new Date('2026-10-17T12:00:00Z');

  it('drops events that ended before today', () => {
    const past = makeEvent({ id: 'past', startDate: '2026-10-01', endDate: '2026-10-02' });
    const upcoming = makeEvent({ id: 'future', startDate: '2026-10-20', endDate: '2026-10-21' });
    expect(getUpcomingEvents([past, upcoming], now)).toEqual([upcoming]);
  });

  it('keeps an event still in progress today', () => {
    const inProgress = makeEvent({
      id: 'in-progress',
      startDate: '2026-10-16',
      endDate: '2026-10-17',
    });
    expect(getUpcomingEvents([inProgress], now)).toEqual([inProgress]);
  });

  it('sorts soonest-first regardless of input order', () => {
    const later = makeEvent({ id: 'later', startDate: '2026-12-04', endDate: '2026-12-06' });
    const sooner = makeEvent({ id: 'sooner', startDate: '2026-10-24', endDate: '2026-10-25' });
    expect(getUpcomingEvents([later, sooner], now)).toEqual([sooner, later]);
  });
});

describe('formatEventDateRange', () => {
  it('formats a single-day event as one date', () => {
    expect(formatEventDateRange('2026-10-17', '2026-10-17')).toBe('Oct 17, 2026');
  });

  it('formats a same-month span without repeating the month', () => {
    expect(formatEventDateRange('2026-09-18', '2026-09-20')).toBe('Sep 18-20, 2026');
  });

  it('formats a cross-month span within the same year', () => {
    expect(formatEventDateRange('2026-09-26', '2026-10-04')).toBe('Sep 26 - Oct 4, 2026');
  });

  it('formats a cross-year span with both years shown', () => {
    expect(formatEventDateRange('2026-12-28', '2027-01-02')).toBe('Dec 28, 2026 - Jan 2, 2027');
  });
});

describe('formatEventDeadline', () => {
  it('formats a single ISO date', () => {
    expect(formatEventDeadline('2026-09-01')).toBe('Sep 1, 2026');
  });
});
