/**
 * useSpriteCache Hook - Local Sprite Image Cache
 * Sprites are normally rendered straight from a remote URL
 * (raw.githubusercontent.com). This hook lets components resolve that same
 * URL to a locally-downloaded copy once one exists (userData/sprites/, via
 * the sprite:get-path/sprite:download IPC handlers in main.ts), so repeat
 * launches don't re-fetch images over the network. Resolved as data: URLs,
 * not file:// paths - the renderer loads from http://localhost:5173 in
 * development, and Chromium blocks file:// loads from an http: page.
 *
 * resolveSprite() always returns a renderable value immediately (the cached
 * data: URL if already known, otherwise the original remote URL unchanged -
 * the image never breaks) and, as a side effect, kicks off a background
 * check-then-download for that URL exactly once. useInitialSync uses
 * downloadSprite() directly for the bulk first-launch pass; everyday
 * rendering only ever needs resolveSprite().
 */

import { useCallback, useRef, useState } from 'react';

export interface UseSpriteCacheReturn {
  resolveSprite: (remoteUrl: string) => string;
  downloadSprite: (remoteUrl: string) => Promise<string | null>;
}

export function useSpriteCache(): UseSpriteCacheReturn {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const inFlight = useRef<Set<string>>(new Set());

  const downloadSprite = useCallback(async (remoteUrl: string): Promise<string | null> => {
    const localUrl = await window.electron.downloadSprite(remoteUrl);
    if (localUrl) setResolved(prev => (prev[remoteUrl] === localUrl ? prev : { ...prev, [remoteUrl]: localUrl }));
    return localUrl;
  }, []);

  const resolveSprite = useCallback((remoteUrl: string): string => {
    if (!remoteUrl) return remoteUrl;
    const cached = resolved[remoteUrl];
    if (cached) return cached;

    if (!inFlight.current.has(remoteUrl)) {
      inFlight.current.add(remoteUrl);
      window.electron.getSpritePath(remoteUrl)
        .then(localUrl => localUrl ?? downloadSprite(remoteUrl))
        .then(localUrl => {
          if (localUrl) setResolved(prev => ({ ...prev, [remoteUrl]: localUrl }));
        })
        .catch(() => { /* keep serving the remote URL - not fatal */ })
        .finally(() => { inFlight.current.delete(remoteUrl); });
    }

    return remoteUrl;
  }, [resolved, downloadSprite]);

  return { resolveSprite, downloadSprite };
}
