import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useUpdateCheck } from './useUpdateCheck';
import { fetchLatestRelease } from '../services/github';
import { CURRENT_APP_VERSION } from '../utils/appVersion';

vi.mock('../services/github', () => ({
  fetchLatestRelease: vi.fn(),
  // A simple !== stand-in is enough here - isNewerVersion's real
  // major.minor.patch comparison logic is github.ts's own concern, out of
  // scope for this hook's tests.
  isNewerVersion: vi.fn((current: string, latest: string) => current !== latest),
}));

const mockedFetchLatestRelease = vi.mocked(fetchLatestRelease);

describe('useUpdateCheck', () => {
  beforeEach(() => {
    mockedFetchLatestRelease.mockReset();
  });

  it('starts in the checking state, exposing the current app version', () => {
    mockedFetchLatestRelease.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useUpdateCheck());
    expect(result.current.status).toBe('checking');
    expect(result.current.currentVersion).toBe(CURRENT_APP_VERSION);
  });

  it('reports no-releases when the repo has no published release yet', async () => {
    mockedFetchLatestRelease.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useUpdateCheck());
    await waitFor(() => expect(result.current.status).toBe('no-releases'));
  });

  it('reports up-to-date and stores the release info when the latest release matches', async () => {
    mockedFetchLatestRelease.mockResolvedValueOnce({ version: CURRENT_APP_VERSION, releaseUrl: 'https://example.com/r', body: '', publishedAt: '2026-01-01T00:00:00Z' });
    const { result } = renderHook(() => useUpdateCheck());
    await waitFor(() => expect(result.current.status).toBe('up-to-date'));
    expect(result.current.latestVersion).toBe(CURRENT_APP_VERSION);
    expect(result.current.releaseUrl).toBe('https://example.com/r');
  });

  it('reports update-available for a newer release', async () => {
    mockedFetchLatestRelease.mockResolvedValueOnce({ version: '999.0.0', releaseUrl: 'https://example.com/r2', body: '', publishedAt: '2026-01-01T00:00:00Z' });
    const { result } = renderHook(() => useUpdateCheck());
    await waitFor(() => expect(result.current.status).toBe('update-available'));
  });

  it('reports error and logs when the check throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedFetchLatestRelease.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useUpdateCheck());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('reports downloading progress pushed from the main process, overriding the GitHub-API status', async () => {
    mockedFetchLatestRelease.mockResolvedValueOnce(null); // would otherwise settle on no-releases
    let statusCallback: ((s: { state: string; version?: string; percent?: number }) => void) | undefined;
    vi.mocked(window.electron.onUpdateStatus).mockImplementation(cb => {
      statusCallback = cb;
      return () => {};
    });
    const { result } = renderHook(() => useUpdateCheck());
    await waitFor(() => expect(statusCallback).toBeDefined());

    act(() => statusCallback!({ state: 'downloading', version: '1.2.3', percent: 42 }));

    expect(result.current.status).toBe('downloading');
    expect(result.current.downloadPercent).toBe(42);
    expect(result.current.latestVersion).toBe('1.2.3');
  });

  it('reports ready-to-install once the main process finishes downloading', async () => {
    mockedFetchLatestRelease.mockResolvedValueOnce(null);
    let statusCallback: ((s: { state: string; version?: string; percent?: number }) => void) | undefined;
    vi.mocked(window.electron.onUpdateStatus).mockImplementation(cb => {
      statusCallback = cb;
      return () => {};
    });
    const { result } = renderHook(() => useUpdateCheck());
    await waitFor(() => expect(statusCallback).toBeDefined());

    act(() => statusCallback!({ state: 'ready-to-install' }));

    expect(result.current.status).toBe('ready-to-install');
  });

  it('unsubscribes from the main-process status listener on unmount', async () => {
    mockedFetchLatestRelease.mockResolvedValueOnce(null);
    const unsubscribe = vi.fn();
    vi.mocked(window.electron.onUpdateStatus).mockReturnValue(unsubscribe);
    const { unmount } = renderHook(() => useUpdateCheck());
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('sets nativeCheckPending on checking-native and clears it on not-available, leaving status alone', async () => {
    mockedFetchLatestRelease.mockResolvedValueOnce({ version: '999.0.0', releaseUrl: 'https://example.com/r2', body: '', publishedAt: '2026-01-01T00:00:00Z' });
    let statusCallback: ((s: { state: string; version?: string; percent?: number }) => void) | undefined;
    vi.mocked(window.electron.onUpdateStatus).mockImplementation(cb => {
      statusCallback = cb;
      return () => {};
    });
    const { result } = renderHook(() => useUpdateCheck());
    await waitFor(() => expect(result.current.status).toBe('update-available'));

    act(() => statusCallback!({ state: 'checking-native' }));
    expect(result.current.nativeCheckPending).toBe(true);

    act(() => statusCallback!({ state: 'not-available' }));
    expect(result.current.nativeCheckPending).toBe(false);
    expect(result.current.status).toBe('update-available'); // GitHub-API status untouched
  });

  it('clears nativeCheckPending on error without touching status', async () => {
    mockedFetchLatestRelease.mockResolvedValueOnce(null);
    let statusCallback: ((s: { state: string; version?: string; percent?: number }) => void) | undefined;
    vi.mocked(window.electron.onUpdateStatus).mockImplementation(cb => {
      statusCallback = cb;
      return () => {};
    });
    const { result } = renderHook(() => useUpdateCheck());
    await waitFor(() => expect(result.current.status).toBe('no-releases'));

    act(() => statusCallback!({ state: 'checking-native' }));
    expect(result.current.nativeCheckPending).toBe(true);

    act(() => statusCallback!({ state: 'error' }));
    expect(result.current.nativeCheckPending).toBe(false);
    expect(result.current.status).toBe('no-releases');
  });

  it('clears nativeCheckPending when the native flow starts downloading', async () => {
    mockedFetchLatestRelease.mockResolvedValueOnce(null);
    let statusCallback: ((s: { state: string; version?: string; percent?: number }) => void) | undefined;
    vi.mocked(window.electron.onUpdateStatus).mockImplementation(cb => {
      statusCallback = cb;
      return () => {};
    });
    const { result } = renderHook(() => useUpdateCheck());
    await waitFor(() => expect(statusCallback).toBeDefined());

    act(() => statusCallback!({ state: 'checking-native' }));
    expect(result.current.nativeCheckPending).toBe(true);

    act(() => statusCallback!({ state: 'downloading', percent: 10 }));
    expect(result.current.nativeCheckPending).toBe(false);
    expect(result.current.status).toBe('downloading');
  });

  it('picks up a status missed by the push (e.g. checking-native sent before this hook subscribed) via the getUpdateStatus pull', async () => {
    mockedFetchLatestRelease.mockResolvedValueOnce({ version: '999.0.0', releaseUrl: 'https://example.com/r2', body: '', publishedAt: '2026-01-01T00:00:00Z' });
    vi.mocked(window.electron.onUpdateStatus).mockReturnValue(() => {});
    vi.mocked(window.electron.getUpdateStatus).mockResolvedValueOnce({ state: 'checking-native' });

    const { result } = renderHook(() => useUpdateCheck());
    await waitFor(() => expect(result.current.status).toBe('update-available'));
    await waitFor(() => expect(result.current.nativeCheckPending).toBe(true));
  });

  it('does not let a stale getUpdateStatus pull override a live push that already arrived', async () => {
    // Kept pending forever (same idiom as the very first test above) so the
    // unrelated GitHub-check effect's own setStatus call can't interfere -
    // this test is isolated to the push-vs-pull ordering guard specifically.
    mockedFetchLatestRelease.mockReturnValue(new Promise(() => {}));
    let statusCallback: ((s: { state: string; version?: string; percent?: number }) => void) | undefined;
    vi.mocked(window.electron.onUpdateStatus).mockImplementation(cb => {
      statusCallback = cb;
      // Fire the push synchronously on subscription, before the pull's own
      // promise below has a chance to resolve.
      cb({ state: 'ready-to-install', version: '1.2.3' });
      return () => {};
    });
    vi.mocked(window.electron.getUpdateStatus).mockResolvedValueOnce({ state: 'checking-native' });

    const { result } = renderHook(() => useUpdateCheck());
    await waitFor(() => expect(statusCallback).toBeDefined());
    expect(result.current.status).toBe('ready-to-install');

    // Give the pull's microtask a chance to run - it must not regress
    // nativeCheckPending back to true over the push's already-resolved state.
    await Promise.resolve();
    await Promise.resolve();
    expect(result.current.nativeCheckPending).toBe(false);
    expect(result.current.status).toBe('ready-to-install');
  });

  it('installUpdate() calls through to window.electron.installUpdate', () => {
    mockedFetchLatestRelease.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useUpdateCheck());
    result.current.installUpdate();
    expect(window.electron.installUpdate).toHaveBeenCalledTimes(1);
  });
});
