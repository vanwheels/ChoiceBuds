import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSeasonDataCheck } from './useSeasonDataCheck';
import { getLatestSeason } from '../config/seasons';
import type { AppSettings } from '../types/pokemon';

const STALE_WARNING_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // mirrors the hook's own private constant

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    version: 1,
    defaultRegulation: 'Reg M-B',
    syncIdentifier: null,
    lastPushedAt: null,
    lastPulledAt: null,
    lastSeasonDataCheckedAt: null,
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

describe('useSeasonDataCheck', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes config/seasons.ts\'s latest configured season', () => {
    const updateSettings = vi.fn();
    const { result } = renderHook(() => useSeasonDataCheck(makeSettings(), updateSettings));
    expect(result.current.latestSeason).toEqual(getLatestSeason());
  });

  it('passes lastCheckedAt through from settings unchanged', () => {
    const updateSettings = vi.fn();
    const { result } = renderHook(() =>
      useSeasonDataCheck(makeSettings({ lastSeasonDataCheckedAt: 12345 }), updateSettings)
    );
    expect(result.current.lastCheckedAt).toBe(12345);
  });

  it('is not stale when mounted well before the latest season ends', () => {
    vi.useFakeTimers();
    vi.setSystemTime(getLatestSeason().start);
    const updateSettings = vi.fn();
    const { result } = renderHook(() => useSeasonDataCheck(makeSettings(), updateSettings));
    expect(result.current.isStale).toBe(false);
  });

  it('is stale once mounted within the warning window of the latest season ending', () => {
    vi.useFakeTimers();
    vi.setSystemTime(getLatestSeason().end - STALE_WARNING_WINDOW_MS);
    const updateSettings = vi.fn();
    const { result } = renderHook(() => useSeasonDataCheck(makeSettings(), updateSettings));
    expect(result.current.isStale).toBe(true);
  });

  it('is stale once the latest season has already ended', () => {
    vi.useFakeTimers();
    vi.setSystemTime(getLatestSeason().end + 1000);
    const updateSettings = vi.fn();
    const { result } = renderHook(() => useSeasonDataCheck(makeSettings(), updateSettings));
    expect(result.current.isStale).toBe(true);
  });

  it('markChecked persists the mount-time timestamp via updateSettings', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    const updateSettings = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useSeasonDataCheck(makeSettings(), updateSettings));

    await result.current.markChecked();

    expect(updateSettings).toHaveBeenCalledWith({ lastSeasonDataCheckedAt: 1_700_000_000_000 });
  });

  it('markChecked resolves to whatever updateSettings resolves to', async () => {
    const updateSettings = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useSeasonDataCheck(makeSettings(), updateSettings));
    await expect(result.current.markChecked()).resolves.toBe(false);
  });
});
