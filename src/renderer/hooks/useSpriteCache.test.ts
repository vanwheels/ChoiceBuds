import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSpriteCache } from './useSpriteCache';

// window.electron is stubbed fresh before every test by
// src/renderer/test/setupElectronMock.ts (getSpritePath/downloadSprite both
// resolve null by default - i.e. "nothing cached locally yet").

describe('useSpriteCache', () => {
  it('returns an empty string unchanged, with no lookup, for an empty remoteUrl', () => {
    const { result } = renderHook(() => useSpriteCache());
    expect(result.current.resolveSprite('')).toBe('');
    expect(window.electron.getSpritePath).not.toHaveBeenCalled();
  });

  it('returns the remote URL immediately while the local lookup is still pending', () => {
    const { result } = renderHook(() => useSpriteCache());
    const remote = 'https://example.com/sprite.png';
    expect(result.current.resolveSprite(remote)).toBe(remote);
    expect(window.electron.getSpritePath).toHaveBeenCalledWith(remote);
  });

  it('resolves to the locally-cached path once getSpritePath finds one', async () => {
    vi.mocked(window.electron.getSpritePath).mockResolvedValueOnce('data:image/png;base64,cached');
    const { result } = renderHook(() => useSpriteCache());
    const remote = 'https://example.com/found.png';
    result.current.resolveSprite(remote);

    await waitFor(() => expect(result.current.resolveSprite(remote)).toBe('data:image/png;base64,cached'));
  });

  it('falls back to downloadSprite when getSpritePath finds nothing cached', async () => {
    vi.mocked(window.electron.getSpritePath).mockResolvedValueOnce(null);
    vi.mocked(window.electron.downloadSprite).mockResolvedValueOnce('data:image/png;base64,downloaded');
    const { result } = renderHook(() => useSpriteCache());
    const remote = 'https://example.com/missing.png';
    result.current.resolveSprite(remote);

    await waitFor(() => expect(window.electron.downloadSprite).toHaveBeenCalledWith(remote));
    await waitFor(() => expect(result.current.resolveSprite(remote)).toBe('data:image/png;base64,downloaded'));
  });

  it('only checks a given URL once even if resolveSprite is called again before it resolves', () => {
    vi.mocked(window.electron.getSpritePath).mockReturnValueOnce(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useSpriteCache());
    const remote = 'https://example.com/dedupe.png';
    result.current.resolveSprite(remote);
    result.current.resolveSprite(remote);
    expect(window.electron.getSpritePath).toHaveBeenCalledTimes(1);
  });

  it('keeps serving the remote URL if the local lookup rejects', async () => {
    vi.mocked(window.electron.getSpritePath).mockRejectedValueOnce(new Error('ipc down'));
    const { result } = renderHook(() => useSpriteCache());
    const remote = 'https://example.com/broken.png';
    expect(result.current.resolveSprite(remote)).toBe(remote);

    await waitFor(() => expect(window.electron.getSpritePath).toHaveBeenCalled());
    expect(result.current.resolveSprite(remote)).toBe(remote);
  });

  it('resolves a URL again (a fresh lookup) once the prior rejected lookup has settled', async () => {
    vi.mocked(window.electron.getSpritePath).mockRejectedValueOnce(new Error('ipc down'));
    const { result } = renderHook(() => useSpriteCache());
    const remote = 'https://example.com/retry.png';
    result.current.resolveSprite(remote);
    await waitFor(() => expect(window.electron.getSpritePath).toHaveBeenCalledTimes(1));

    vi.mocked(window.electron.getSpritePath).mockResolvedValueOnce('data:image/png;base64,retried');
    result.current.resolveSprite(remote);
    await waitFor(() => expect(window.electron.getSpritePath).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.resolveSprite(remote)).toBe('data:image/png;base64,retried'));
  });

  it('downloadSprite resolves to and stores the local URL directly', async () => {
    vi.mocked(window.electron.downloadSprite).mockResolvedValueOnce('data:image/png;base64,direct');
    const { result } = renderHook(() => useSpriteCache());

    let local: string | null = null;
    await act(async () => {
      local = await result.current.downloadSprite('https://example.com/direct.png');
    });

    expect(local).toBe('data:image/png;base64,direct');
  });

  it('downloadSprite resolves to null without updating state when it fails', async () => {
    vi.mocked(window.electron.downloadSprite).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useSpriteCache());

    let local: string | null = 'sentinel';
    await act(async () => {
      local = await result.current.downloadSprite('https://example.com/direct-fail.png');
    });

    expect(local).toBeNull();
  });
});
