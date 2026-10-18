import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSettings } from './useSettings';
import type { AppSettings } from '../types/pokemon';
import { getLatestSeason } from '../config/seasons';

describe('useSettings', () => {
  it('starts loading and settles on the built-in defaults when no settings.json exists', async () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.settings.defaultRegulation).toBe(getLatestSeason().regulation);
    expect(result.current.settings.syncUsername).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('merges a persisted partial settings object over the defaults, so a pre-sync-fields file still loads valid values', async () => {
    vi.mocked(window.electron.readSettings).mockResolvedValueOnce({
      schemaVersion: 1,
      defaultRegulation: 'Reg M-B',
      lastModified: 12345,
    } as unknown as AppSettings);

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings.defaultRegulation).toBe('Reg M-B');
    expect(result.current.settings.syncUsername).toBeNull(); // backfilled from defaults
    expect(result.current.settings.lastModified).toBe(12345); // real field preserved, not overwritten
  });

  it('backfills schemaVersion for a settings file persisted before the field existed', async () => {
    vi.mocked(window.electron.readSettings).mockResolvedValueOnce({
      defaultRegulation: 'Reg M-B',
      lastModified: 12345,
    } as unknown as AppSettings);

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings.schemaVersion).toBe(1);
    expect(result.current.settings.defaultRegulation).toBe('Reg M-B');
  });

  it('migrates a persisted "Reg M-A" default (the old hardcoded fallback) to the current regulation, and persists the correction', async () => {
    vi.mocked(window.electron.readSettings).mockResolvedValueOnce({
      schemaVersion: 1,
      defaultRegulation: 'Reg M-A',
      lastModified: 12345,
    } as unknown as AppSettings);

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings.defaultRegulation).toBe(getLatestSeason().regulation);
    await waitFor(() =>
      expect(window.electron.writeSettings).toHaveBeenCalledWith(
        expect.objectContaining({ defaultRegulation: getLatestSeason().regulation }),
      ),
    );
  });

  it('backfills a missing playerProfile.updatedAt for a file persisted before that field existed, and persists the correction', async () => {
    vi.mocked(window.electron.readSettings).mockResolvedValueOnce({
      schemaVersion: 1,
      defaultRegulation: 'Reg M-B',
      lastModified: 12345,
      playerProfile: {
        playerName: 'Ethan Harris',
        ageDivision: 'Masters',
        trainerNameInGame: 'vanny',
        playerId: '679296539001',
        dateOfBirth: '1999-03-10',
        supportId: 'ALS79BWXKHFDR468',
        switchProfileName: 'vanny',
        // updatedAt deliberately omitted, matching a pre-field settings.json
      },
    } as unknown as AppSettings);

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings.playerProfile.playerName).toBe('Ethan Harris');
    expect(typeof result.current.settings.playerProfile.updatedAt).toBe('number');
    expect(result.current.settings.playerProfile.updatedAt).toBeGreaterThan(0);
    await waitFor(() =>
      expect(window.electron.writeSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          playerProfile: expect.objectContaining({ playerName: 'Ethan Harris' }),
        }),
      ),
    );
  });

  it('backfills a missing favoritePokemon.updatedAt for a file persisted before that field existed, and persists the correction', async () => {
    vi.mocked(window.electron.readSettings).mockResolvedValueOnce({
      schemaVersion: 1,
      defaultRegulation: 'Reg M-B',
      lastModified: 12345,
      favoritePokemon: {
        species: 'Mew',
        spriteUrl: 'https://example.com/mew.png',
        shinySpriteUrl: 'https://example.com/mew-shiny.png',
        shiny: true,
        isPublic: true,
        // updatedAt deliberately omitted
      },
    } as unknown as AppSettings);

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings.favoritePokemon.species).toBe('Mew');
    expect(typeof result.current.settings.favoritePokemon.updatedAt).toBe('number');
    expect(result.current.settings.favoritePokemon.updatedAt).toBeGreaterThan(0);
    await waitFor(() =>
      expect(window.electron.writeSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          favoritePokemon: expect.objectContaining({ species: 'Mew' }),
        }),
      ),
    );
  });

  it('reports an error and stops loading when reading settings throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(window.electron.readSettings).mockRejectedValueOnce(new Error('disk error'));

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('disk error');
    consoleErrorSpy.mockRestore();
  });

  it('setDefaultRegulation persists the change and updates state on success', async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.setDefaultRegulation('Reg M-B');
    });

    expect(success).toBe(true);
    expect(result.current.settings.defaultRegulation).toBe('Reg M-B');
    expect(window.electron.writeSettings).toHaveBeenCalledWith(
      expect.objectContaining({ defaultRegulation: 'Reg M-B' }),
    );
  });

  it('setDefaultRegulation leaves state untouched and reports an error when the write fails', async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    vi.mocked(window.electron.writeSettings).mockResolvedValueOnce(false);

    let success = true;
    await act(async () => {
      success = await result.current.setDefaultRegulation('Reg M-B');
    });

    expect(success).toBe(false);
    expect(result.current.settings.defaultRegulation).toBe(getLatestSeason().regulation); // unchanged
    expect(result.current.error).toBe('Failed to write settings');
  });

  it('serializes concurrent setDefaultRegulation/updateSettings calls so a slower write landing later never drops an earlier one', async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // First call's own write resolves *after* the second call's, same as a
    // real IndexedDB/Electron write landing out of issue-order - without
    // serializing+rebasing on the latest ref, the second call's stale base
    // (read before the first call's update applied) would overwrite it.
    vi.mocked(window.electron.writeSettings)
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(true), 20)))
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(true), 5)));

    await act(async () => {
      const firstCall = result.current.setDefaultRegulation('Reg M-B');
      const secondCall = result.current.updateSettings({ syncUsername: 'trainer' });
      await Promise.all([firstCall, secondCall]);
    });

    expect(result.current.settings.defaultRegulation).toBe('Reg M-B');
    expect(result.current.settings.syncUsername).toBe('trainer');
  });

  it('updateSettings persists a multi-field partial update in one write, as used by the sync feature', async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateSettings({ syncUsername: 'trainer', lastSyncedAt: 999 });
    });

    expect(result.current.settings.syncUsername).toBe('trainer');
    expect(result.current.settings.lastSyncedAt).toBe(999);
    expect(window.electron.writeSettings).toHaveBeenCalledTimes(1);
  });
});
