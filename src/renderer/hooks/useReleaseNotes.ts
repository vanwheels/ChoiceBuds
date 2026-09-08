/**
 * useReleaseNotes Hook - Release Notes Startup Popup + Settings History
 * Fetches the repo's full published-release history once per launch (no
 * polling, no retry - same shape as useUpdateCheck.ts) and decides whether
 * the startup popup should show: it shows once per version bump, comparing
 * the running app version against the last version the user has actually
 * seen the popup for (settings.lastSeenReleaseNotesVersion).
 *
 * Fresh-install-skip: a null lastSeenReleaseNotesVersion means "never
 * recorded," which is indistinguishable from a genuine fresh install, so it
 * silently marks the current version seen with no popup rather than treating
 * every past release as unseen - see
 * docs/investigations/release-notes-popup-scope.md.
 *
 * That seen-check is gated on isSettingsLoading rather than running
 * unconditionally on mount: useSettings.ts's settings prop reads the
 * DEFAULT_SETTINGS placeholder (lastSeenReleaseNotesVersion: null) until its
 * own disk read resolves, which is indistinguishable from a real fresh
 * install - checking before that read finishes would risk treating every
 * launch as a fresh install if the disk read hasn't resolved yet.
 *
 * The seen-check itself uses React's "adjust state during render" pattern
 * (https://react.dev/learn/you-might-not-need-an-effect#adjusting-state-based-on-props)
 * instead of a `useEffect` + ref guard: `showPopup` is fully derived from
 * settings/isSettingsLoading, so setting it directly in the render body
 * (gated by the `hasResolvedSeenState` flag, itself adjusted the same way)
 * satisfies `react-hooks/set-state-in-effect` without the awkwardness of
 * splitting a one-shot derivation into a separate effect-safe copy (see
 * docs/investigations/set-state-in-effect-lint-fix.md for that split's shape
 * elsewhere in this codebase - not a fit here since this isn't a data
 * fetch). Persisting the fresh-install-skip to disk *is* a genuine side
 * effect (an IPC write via updateSettings), so that one stays in its own
 * effect below - it contains no setState call, so the rule doesn't flag it.
 */

import { useState, useEffect } from 'react';
import { fetchReleaseHistory, type GitHubRelease } from '../services/github';
import { CURRENT_APP_VERSION } from '../utils/appVersion';
import type { AppSettings } from '../types/pokemon';

export interface UseReleaseNotesReturn {
  history: GitHubRelease[];
  isLoading: boolean;
  error: string | null;
  showPopup: boolean;
  currentReleaseNotes: GitHubRelease | null;
  markAsSeen: () => void;
}

export function useReleaseNotes(
  settings: AppSettings,
  isSettingsLoading: boolean,
  updateSettings: (partial: Partial<Omit<AppSettings, 'version' | 'lastModified'>>) => Promise<boolean>
): UseReleaseNotesReturn {
  const [history, setHistory] = useState<GitHubRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [hasResolvedSeenState, setHasResolvedSeenState] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const releases = await fetchReleaseHistory();
        if (!cancelled) setHistory(releases);
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching release notes:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch release notes');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // See header comment: derived directly during render rather than in an
  // effect, evaluated at most once per mount via the hasResolvedSeenState gate.
  if (!hasResolvedSeenState && !isSettingsLoading) {
    setHasResolvedSeenState(true);
    if (settings.lastSeenReleaseNotesVersion !== null && settings.lastSeenReleaseNotesVersion !== CURRENT_APP_VERSION) {
      setShowPopup(true);
    }
  }

  // Fresh-install-skip: the one genuine side effect here (an IPC write), so
  // it stays in its own effect rather than the render-time adjustment above.
  useEffect(() => {
    if (hasResolvedSeenState && settings.lastSeenReleaseNotesVersion === null) {
      updateSettings({ lastSeenReleaseNotesVersion: CURRENT_APP_VERSION });
    }
  }, [hasResolvedSeenState, settings.lastSeenReleaseNotesVersion, updateSettings]);

  const markAsSeen = () => {
    setShowPopup(false);
    updateSettings({ lastSeenReleaseNotesVersion: CURRENT_APP_VERSION });
  };

  return {
    history,
    isLoading,
    error,
    showPopup,
    currentReleaseNotes: history.find(r => r.version === CURRENT_APP_VERSION) ?? null,
    markAsSeen,
  };
}
