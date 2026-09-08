import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useReleaseNotes } from './useReleaseNotes';
import { fetchReleaseHistory, type GitHubRelease } from '../services/github';
import { CURRENT_APP_VERSION } from '../utils/appVersion';
import type { AppSettings } from '../types/pokemon';

vi.mock('../services/github', () => ({
  fetchReleaseHistory: vi.fn(),
}));

const mockedFetchReleaseHistory = vi.mocked(fetchReleaseHistory);

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
    lastSeenReleaseNotesVersion: null,
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

const CURRENT_RELEASE: GitHubRelease = {
  version: CURRENT_APP_VERSION,
  releaseUrl: 'https://example.com/current',
  body: '## Notes',
  publishedAt: '2026-09-01T00:00:00Z',
};

describe('useReleaseNotes', () => {
  beforeEach(() => {
    mockedFetchReleaseHistory.mockReset();
  });

  it('fresh install (never-recorded seen version): stays silent and marks the current version seen', async () => {
    mockedFetchReleaseHistory.mockResolvedValueOnce([CURRENT_RELEASE]);
    const updateSettings = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() => useReleaseNotes(makeSettings({ lastSeenReleaseNotesVersion: null }), false, updateSettings));

    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ lastSeenReleaseNotesVersion: CURRENT_APP_VERSION }));
    expect(result.current.showPopup).toBe(false);
  });

  it('does not run the seen-check while settings are still loading', async () => {
    mockedFetchReleaseHistory.mockResolvedValueOnce([CURRENT_RELEASE]);
    const updateSettings = vi.fn().mockResolvedValue(true);

    renderHook(() => useReleaseNotes(makeSettings({ lastSeenReleaseNotesVersion: null }), true, updateSettings));

    await waitFor(() => expect(mockedFetchReleaseHistory).toHaveBeenCalled());
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('shows the popup when the last-seen version is behind the running version', async () => {
    mockedFetchReleaseHistory.mockResolvedValueOnce([CURRENT_RELEASE]);
    const updateSettings = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() => useReleaseNotes(makeSettings({ lastSeenReleaseNotesVersion: '0.0.1' }), false, updateSettings));

    await waitFor(() => expect(result.current.showPopup).toBe(true));
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('stays silent when the last-seen version already matches the running version', async () => {
    mockedFetchReleaseHistory.mockResolvedValueOnce([CURRENT_RELEASE]);
    const updateSettings = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() => useReleaseNotes(makeSettings({ lastSeenReleaseNotesVersion: CURRENT_APP_VERSION }), false, updateSettings));

    await waitFor(() => expect(mockedFetchReleaseHistory).toHaveBeenCalled());
    expect(result.current.showPopup).toBe(false);
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('markAsSeen hides the popup and persists the running version', async () => {
    mockedFetchReleaseHistory.mockResolvedValueOnce([CURRENT_RELEASE]);
    const updateSettings = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() => useReleaseNotes(makeSettings({ lastSeenReleaseNotesVersion: '0.0.1' }), false, updateSettings));
    await waitFor(() => expect(result.current.showPopup).toBe(true));

    result.current.markAsSeen();

    await waitFor(() => expect(result.current.showPopup).toBe(false));
    expect(updateSettings).toHaveBeenCalledWith({ lastSeenReleaseNotesVersion: CURRENT_APP_VERSION });
  });

  it('exposes the running version\'s own history entry as currentReleaseNotes', async () => {
    const older: GitHubRelease = { ...CURRENT_RELEASE, version: '0.0.1' };
    mockedFetchReleaseHistory.mockResolvedValueOnce([CURRENT_RELEASE, older]);
    const updateSettings = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() => useReleaseNotes(makeSettings({ lastSeenReleaseNotesVersion: CURRENT_APP_VERSION }), false, updateSettings));

    await waitFor(() => expect(result.current.history).toHaveLength(2));
    expect(result.current.currentReleaseNotes).toEqual(CURRENT_RELEASE);
  });

  it('reports the fetch error and logs it, without blocking the seen-check', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedFetchReleaseHistory.mockRejectedValueOnce(new Error('network down'));
    const updateSettings = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(() => useReleaseNotes(makeSettings({ lastSeenReleaseNotesVersion: null }), false, updateSettings));

    await waitFor(() => expect(result.current.error).toBe('network down'));
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(updateSettings).toHaveBeenCalledWith({ lastSeenReleaseNotesVersion: CURRENT_APP_VERSION });
    expect(result.current.currentReleaseNotes).toBeNull();
    consoleErrorSpy.mockRestore();
  });
});
