import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSettings } from './useSettings';
import type { AppSettings } from '../types/pokemon';

describe('useSettings', () => {
  it('starts loading and settles on the built-in defaults when no settings.json exists', async () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.settings.defaultRegulation).toBe('Reg M-A');
    expect(result.current.settings.syncIdentifier).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('merges a persisted partial settings object over the defaults, so a pre-sync-fields file still loads valid values', async () => {
    vi.mocked(window.electron.readSettings).mockResolvedValueOnce({
      version: 1,
      defaultRegulation: 'Reg M-B',
      lastModified: 12345,
    } as unknown as AppSettings);

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings.defaultRegulation).toBe('Reg M-B');
    expect(result.current.settings.syncIdentifier).toBeNull(); // backfilled from defaults
    expect(result.current.settings.lastModified).toBe(12345); // real field preserved, not overwritten
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
      expect.objectContaining({ defaultRegulation: 'Reg M-B' })
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
    expect(result.current.settings.defaultRegulation).toBe('Reg M-A'); // unchanged
    expect(result.current.error).toBe('Failed to write settings');
  });

  it('updateSettings persists a multi-field partial update in one write, as used by the sync feature', async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateSettings({ syncIdentifier: 'trainer#1234', lastPushedAt: 999 });
    });

    expect(result.current.settings.syncIdentifier).toBe('trainer#1234');
    expect(result.current.settings.lastPushedAt).toBe(999);
    expect(window.electron.writeSettings).toHaveBeenCalledTimes(1);
  });
});
