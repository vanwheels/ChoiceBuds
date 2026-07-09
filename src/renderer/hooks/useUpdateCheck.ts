/**
 * useUpdateCheck Hook - App Version Update Notification
 * Runs the GitHub release check exactly once per launch (on mount) - no
 * polling, no retry. Instantiated once in App.tsx alongside the other
 * top-level hooks and passed down to SettingsPage for display.
 */

import { useState, useEffect } from 'react';
import { fetchLatestRelease, isNewerVersion } from '../services/github';
import { CURRENT_APP_VERSION } from '../utils/appVersion';

export type UpdateCheckStatus = 'checking' | 'up-to-date' | 'update-available' | 'no-releases' | 'error';

export interface UseUpdateCheckReturn {
  status: UpdateCheckStatus;
  currentVersion: string;
  latestVersion: string | null;
  releaseUrl: string | null;
}

export function useUpdateCheck(): UseUpdateCheckReturn {
  const [status, setStatus] = useState<UpdateCheckStatus>('checking');
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null);

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

  return {
    status,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion,
    releaseUrl,
  };
}
