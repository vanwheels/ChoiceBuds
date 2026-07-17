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
  installUpdate: () => void;
}

export function useUpdateCheck(): UseUpdateCheckReturn {
  const [status, setStatus] = useState<UpdateCheckStatus>('checking');
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null);
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);

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

        setLatestVersion(release.latestVersion);
        setReleaseUrl(release.releaseUrl);
        setStatus(isNewerVersion(CURRENT_APP_VERSION, release.latestVersion) ? 'update-available' : 'up-to-date');
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
    return window.electron.onUpdateStatus((update: { state: 'downloading' | 'ready-to-install'; version?: string; percent?: number }) => {
      if (update.version) setLatestVersion(update.version);
      if (update.state === 'downloading') {
        setStatus('downloading');
        if (typeof update.percent === 'number') setDownloadPercent(update.percent);
      } else {
        setStatus('ready-to-install');
      }
    });
  }, []);

  return {
    status,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion,
    releaseUrl,
    downloadPercent,
    installUpdate: () => window.electron.installUpdate(),
  };
}
