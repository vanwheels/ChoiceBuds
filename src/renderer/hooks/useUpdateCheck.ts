/**
 * useUpdateCheck Hook - App Version Update Notification
 * Runs the GitHub release check exactly once per launch (on mount) - no
 * polling, no retry. Instantiated once in App.tsx alongside the other
 * top-level hooks and passed down to SettingsPage for display.
 *
 * Also subscribes to the main process's electron-updater status (Windows
 * packaged builds only - see main.ts's registerAutoUpdater). When that
 * reports real download progress or a downloaded-and-ready update, it takes
 * priority over the plain GitHub-API status below, since it means an actual
 * in-app install is available rather than just a link-out. Every other
 * platform/build (dev mode, the portable exe, macOS before it's signed)
 * never receives that IPC status at all, so it always falls back to the
 * GitHub-API check's own 'update-available' + link-out behavior.
 *
 * `nativeCheckPending` additionally gates that link-out fallback against a
 * UI race: the GitHub-API check is a single small HTTPS call that often
 * resolves before the native `autoUpdater` has had a chance to report back,
 * so without this a user could click "View Release" and be sent to the
 * browser moments before the native flow would have offered a working
 * in-app install instead. It goes true on 'checking-native' (sent right
 * before main.ts kicks off checkForUpdates()) and back to false once the
 * native check resolves - 'downloading'/'ready-to-install' (a real update
 * found) or 'not-available'/'error' (nothing for the UI to wait on).
 * Non-Windows-packaged builds never receive 'checking-native' at all, so it
 * simply stays false for them forever - zero behavior change there.
 *
 * 'checking-native' is pushed from main.ts essentially at window-creation
 * time - before this app's own JS has loaded, let alone before this hook's
 * effect below has run - so a plain push-only subscription misses it every
 * time (confirmed live: `window:electron.onUpdateStatus`'s listener simply
 * isn't attached yet when the push fires, and Electron's webContents.send()
 * has no queue for a not-yet-attached listener). The fix is pull-then-
 * subscribe: subscribe to future pushes first, then separately pull
 * whatever status main.ts already has via `getUpdateStatus()` and apply it
 * only if a live push hasn't already superseded it - see the effect below.
 */

import { useState, useEffect } from 'react';
import { fetchLatestRelease, isNewerVersion } from '../services/github';
import { CURRENT_APP_VERSION } from '../utils/appVersion';

export type UpdateCheckStatus =
  | 'checking'
  | 'up-to-date'
  | 'update-available'
  | 'no-releases'
  | 'error'
  | 'downloading'
  | 'ready-to-install';

export interface UseUpdateCheckReturn {
  status: UpdateCheckStatus;
  currentVersion: string;
  latestVersion: string | null;
  releaseUrl: string | null;
  downloadPercent: number | null;
  nativeCheckPending: boolean;
  installUpdate: () => void;
}

export function useUpdateCheck(): UseUpdateCheckReturn {
  const [status, setStatus] = useState<UpdateCheckStatus>('checking');
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null);
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);
  const [nativeCheckPending, setNativeCheckPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const release = await fetchLatestRelease();

        if (cancelled) return;

        if (!release) {
          setStatus('no-releases');
          return;
        }

        setLatestVersion(release.version);
        setReleaseUrl(release.releaseUrl);
        setStatus(isNewerVersion(CURRENT_APP_VERSION, release.version) ? 'update-available' : 'up-to-date');
      } catch (err) {
        if (!cancelled) {
          console.error('Error checking for updates:', err);
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const applyUpdate = (update: { state: 'checking-native' | 'downloading' | 'ready-to-install' | 'not-available' | 'error'; version?: string; percent?: number }): void => {
      if (update.version) setLatestVersion(update.version);

      switch (update.state) {
        case 'checking-native':
          setNativeCheckPending(true);
          break;
        case 'downloading':
          setNativeCheckPending(false);
          setStatus('downloading');
          if (typeof update.percent === 'number') setDownloadPercent(update.percent);
          break;
        case 'ready-to-install':
          setNativeCheckPending(false);
          setStatus('ready-to-install');
          break;
        case 'not-available':
        case 'error':
          // Only clears the pending flag - the GitHub-API check above
          // already resolved `status` on its own, and the native path
          // found nothing (or failed) to override it with.
          setNativeCheckPending(false);
          break;
      }
    };

    // Subscribe first, so a push that arrives during the pull's own
    // round-trip below is never missed. `livePushSeen` then guards the pull
    // from re-applying a stale snapshot over whatever a live push already
    // set - main.ts's statuses only move forward (checking-native -> one
    // terminal state), so an out-of-date pull can only ever be behind, never
    // ahead, of a push that beat it.
    let livePushSeen = false;
    const unsubscribe = window.electron.onUpdateStatus((update) => {
      livePushSeen = true;
      applyUpdate(update);
    });

    window.electron.getUpdateStatus().then((status) => {
      if (!livePushSeen && status) applyUpdate(status);
    });

    return unsubscribe;
  }, []);

  return {
    status,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion,
    releaseUrl,
    downloadPercent,
    nativeCheckPending,
    installUpdate: () => window.electron.installUpdate(),
  };
}
