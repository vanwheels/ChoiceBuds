import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChampionsDataCheck } from './useChampionsDataCheck';
import { getLatestSeason } from '../config/seasons';
import { CHAMPIONS_DATA_CHECKS } from '../config/championsDataChecks';
import type { AppSettings } from '../types/pokemon';

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    version: 1,
    defaultRegulation: 'Reg M-B',
    syncIdentifier: null,
    lastPushedAt: null,
    lastPulledAt: null,
    lastSeasonDataCheckedAt: null,
    championsDataChecks: {},
    showAnimatedSprites: false,
    playerProfile: {
      playerName: '',
      ageDivision: '',
      trainerNameInGame: '',
      playerId: '',
      dateOfBirth: '',
      supportId: '',
      switchProfileName: '',
    },
    lastModified: Date.now(),
    ...overrides,
  };
}

describe('useChampionsDataCheck', () => {
  it('exposes config/seasons.ts\'s latest regulation', () => {
    const updateSettings = vi.fn();
    const { result } = renderHook(() => useChampionsDataCheck(makeSettings(), updateSettings));
    expect(result.current.latestRegulation).toBe(getLatestSeason().regulation);
  });

  it('lists one status entry per config/championsDataChecks.ts def', () => {
    const updateSettings = vi.fn();
    const { result } = renderHook(() => useChampionsDataCheck(makeSettings(), updateSettings));
    expect(result.current.checks.map(c => c.id)).toEqual(CHAMPIONS_DATA_CHECKS.map(d => d.id));
  });

  it('is not stale when the stored regulation matches the latest', () => {
    const latest = getLatestSeason().regulation;
    const updateSettings = vi.fn();
    const { result } = renderHook(() =>
      useChampionsDataCheck(
        makeSettings({ championsDataChecks: { moves: { regulation: latest, checkedAt: 1 } } }),
        updateSettings
      )
    );
    expect(result.current.checks.find(c => c.id === 'moves')?.isStale).toBe(false);
  });

  it('is stale when the stored regulation is behind the latest', () => {
    const updateSettings = vi.fn();
    const { result } = renderHook(() =>
      useChampionsDataCheck(
        makeSettings({ championsDataChecks: { moves: { regulation: 'Reg M-A', checkedAt: 1 } } }),
        updateSettings
      )
    );
    expect(result.current.checks.find(c => c.id === 'moves')?.isStale).toBe(true);
  });

  it('is stale when never checked', () => {
    const updateSettings = vi.fn();
    const { result } = renderHook(() => useChampionsDataCheck(makeSettings(), updateSettings));
    for (const check of result.current.checks) {
      expect(check.isStale).toBe(true);
      expect(check.regulation).toBeNull();
      expect(check.checkedAt).toBeNull();
    }
  });

  it('markChecked persists the current timestamp and latest regulation for just that id via updateSettings', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    const updateSettings = vi.fn().mockResolvedValue(true);
    const existing = { abilities: { regulation: 'Reg M-A', checkedAt: 1 } };
    const { result } = renderHook(() =>
      useChampionsDataCheck(makeSettings({ championsDataChecks: existing }), updateSettings)
    );

    await result.current.markChecked('moves');

    expect(updateSettings).toHaveBeenCalledWith({
      championsDataChecks: {
        abilities: { regulation: 'Reg M-A', checkedAt: 1 },
        moves: { regulation: getLatestSeason().regulation, checkedAt: 1_700_000_000_000 },
      },
    });
    vi.useRealTimers();
  });

  it('markChecked resolves to whatever updateSettings resolves to', async () => {
    const updateSettings = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useChampionsDataCheck(makeSettings(), updateSettings));
    await expect(result.current.markChecked('moves')).resolves.toBe(false);
  });
});
