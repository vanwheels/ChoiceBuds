import { describe, it, expect } from 'vitest';
import { SEASONS, getSeasonForDate } from './seasons';

describe('SEASONS', () => {
  it('is contiguous: each season ends exactly where the next starts', () => {
    for (let i = 1; i < SEASONS.length; i++) {
      expect(SEASONS[i].start).toBe(SEASONS[i - 1].end);
    }
  });

  it('places M-7 (Oct 7 - Nov 4) and M-8 (Nov 4 - Dec 2) under Reg M-C', () => {
    expect(getSeasonForDate(Date.parse('2026-10-07'))?.id).toBe('M-7');
    expect(getSeasonForDate(Date.parse('2026-11-03T23:59:59Z'))?.id).toBe('M-7');
    expect(getSeasonForDate(Date.parse('2026-11-04'))?.id).toBe('M-8');
    expect(getSeasonForDate(Date.parse('2026-12-01T23:59:59Z'))?.id).toBe('M-8');
    expect(getSeasonForDate(Date.parse('2026-11-15'))?.regulation).toBe('Reg M-C');
  });

  it('has no season for dates past M-8 until Reg M-D rows are published', () => {
    expect(getSeasonForDate(Date.parse('2026-12-02'))).toBeUndefined();
  });
});
