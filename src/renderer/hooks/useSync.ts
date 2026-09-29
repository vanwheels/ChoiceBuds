/**
 * useSync Hook - Cross-Device Sync Orchestration
 * Manual, one-directional-at-a-time Push/Pull against the Worker in
 * services/syncApi.ts - deliberately not continuous background sync (no
 * backend arbitrating real conflicts). See TODO.md's cross-device sync
 * design note for the full rationale.
 *
 * Accounts are real username/password (see worker/src/index.ts) - this
 * device authenticates with an opaque bearer token issued at signup/login,
 * never the password itself.
 */

import { useState, useCallback, useEffect } from 'react';
import type { UseSettingsReturn } from './useSettings';
import type { UseTeamsReturn } from './useTeams';
import type { UseBattlesReturn } from './useBattles';
import { signup, login, pushSyncData, pullSyncData } from '../services/syncApi';
import type { SyncPayload, TeamsDatabase, BattlesDatabase } from '../types/pokemon';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{2,32}$/;
const MIN_PASSWORD_LENGTH = 8;

export type SyncStatus = 'never-synced' | 'up-to-date' | 'unpushed-changes' | 'unpulled-changes' | 'unknown';

export type PushResult =
  | { ok: true }
  | { ok: false; reason: 'needs-pull-first'; remoteSavedAt: number }
  | { ok: false; reason: 'error'; message: string };

export type PullResult =
  | { ok: true }
  | { ok: false; reason: 'needs-push-first'; localModifiedAt: number }
  | { ok: false; reason: 'error'; message: string };

export interface UseSyncReturn {
  syncUsername: string | null;
  lastPushedAt: number | null;
  lastPulledAt: number | null;
  isBusy: boolean;
  error: string | null;
  status: SyncStatus;
  signUp: (username: string, password: string, email?: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  logIn: (username: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  logOut: () => Promise<void>;
  push: (opts?: { force?: boolean }) => Promise<PushResult>;
  pull: (opts?: { force?: boolean }) => Promise<PullResult>;
}

/**
 * Pure status computation, no setState - lets both the mount effect and
 * refreshStatus() call the same logic without either tripping
 * react-hooks/set-state-in-effect (which flags an effect calling a
 * component-scope function that itself calls setState, even indirectly).
 * See docs/investigations/set-state-in-effect-lint-fix.md.
 */
async function computeSyncStatus({
  syncUsername,
  syncToken,
  effectivePushedAt,
  effectivePulledAt,
}: {
  syncUsername: string | null;
  syncToken: string | null;
  effectivePushedAt: number | null;
  effectivePulledAt: number | null;
}): Promise<SyncStatus> {
  if (!syncUsername || !syncToken) {
    return 'never-synced';
  }

  if (effectivePushedAt === null && effectivePulledAt === null) {
    return 'never-synced';
  }

  try {
    const [teamsDb, battlesDb, remote] = await Promise.all([
      window.electron.readTeamsDatabase() as Promise<TeamsDatabase | null>,
      window.electron.readBattlesDatabase() as Promise<BattlesDatabase | null>,
      pullSyncData(syncUsername, syncToken).catch(() => null),
    ]);

    const localModifiedAt = Math.max(teamsDb?.lastModified ?? 0, battlesDb?.lastModified ?? 0);

    if (remote && remote.savedAt > (effectivePulledAt ?? 0)) {
      return 'unpulled-changes';
    }
    if (localModifiedAt > (effectivePushedAt ?? 0)) {
      return 'unpushed-changes';
    }
    return 'up-to-date';
  } catch {
    return 'unknown';
  }
}

export function useSync(
  settingsState: UseSettingsReturn,
  teamsState: UseTeamsReturn,
  battlesState: UseBattlesReturn
): UseSyncReturn {
  const { settings, updateSettings } = settingsState;
  const { syncUsername, syncToken, lastPushedAt, lastPulledAt } = settings;

  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>('unknown');

  /**
   * Best-effort status refresh: one local disk read (for "do I have
   * unpushed local edits") plus one remote peek fetch (for "does the
   * remote have data I haven't pulled") - not a poll loop, only run on
   * mount and right after login/signup or a push/pull completes.
   */
  const refreshStatus = useCallback(async (overrides?: {
    lastPushedAt?: number | null;
    lastPulledAt?: number | null;
  }): Promise<void> => {
    // Accepts fresh values explicitly rather than only reading the closed-
    // over settings.lastPushedAt/lastPulledAt - callers in push()/pull()
    // invoke this in the same async call as their own updateSettings(), and
    // that state update isn't visible in this closure until the next
    // render, so relying solely on the closure would show stale status
    // (e.g. "Never synced" right after a successful first Push).
    const effectivePushedAt = overrides?.lastPushedAt !== undefined ? overrides.lastPushedAt : lastPushedAt;
    const effectivePulledAt = overrides?.lastPulledAt !== undefined ? overrides.lastPulledAt : lastPulledAt;
    const result = await computeSyncStatus({ syncUsername, syncToken, effectivePushedAt, effectivePulledAt });
    setStatus(result);
  }, [syncUsername, syncToken, lastPushedAt, lastPulledAt]);

  // Mount-only refresh, inlined (rather than calling refreshStatus by
  // reference) to match React's accepted fetch-in-effect shape - an effect
  // calling out to a named function that (transitively) calls setState
  // trips react-hooks/set-state-in-effect even when computeSyncStatus
  // itself never does. The ignore-flag guard also closes a real (if
  // unconfirmed) gap the old code had: a fast unmount before this resolves
  // could otherwise warn-log a setState-after-unmount.
  useEffect(() => {
    let ignore = false;
    (async () => {
      const result = await computeSyncStatus({
        syncUsername,
        syncToken,
        effectivePushedAt: lastPushedAt,
        effectivePulledAt: lastPulledAt,
      });
      if (!ignore) {
        setStatus(result);
      }
    })();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncUsername, syncToken]);

  const signUp = useCallback(async (username: string, password: string, email?: string) => {
    const trimmedUsername = username.trim();
    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      return { ok: false as const, message: 'Username must be 2-32 letters, numbers, or underscores' };
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return { ok: false as const, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
    }

    let token: string;
    try {
      ({ token } = await signup(trimmedUsername, password, email));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      return { ok: false as const, message };
    }

    const success = await updateSettings({ syncUsername: trimmedUsername, syncToken: token, lastPushedAt: null, lastPulledAt: null });
    if (!success) {
      return { ok: false as const, message: 'Failed to save sync credentials' };
    }
    return { ok: true as const };
  }, [updateSettings]);

  const logIn = useCallback(async (username: string, password: string) => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      return { ok: false as const, message: 'Username and password are required' };
    }

    let token: string;
    try {
      ({ token } = await login(trimmedUsername, password));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Log in failed';
      return { ok: false as const, message };
    }

    const success = await updateSettings({ syncUsername: trimmedUsername, syncToken: token, lastPushedAt: null, lastPulledAt: null });
    if (!success) {
      return { ok: false as const, message: 'Failed to save sync credentials' };
    }
    return { ok: true as const };
  }, [updateSettings]);

  const logOut = useCallback(async (): Promise<void> => {
    // Client-side only, same as before: this device's token simply stops
    // being used locally. Other signed-in devices are unaffected, and there's
    // no server-side revoke endpoint in this leg.
    await updateSettings({ syncUsername: null, syncToken: null, lastPushedAt: null, lastPulledAt: null });
    setStatus('never-synced');
  }, [updateSettings]);

  const push = useCallback(async (opts?: { force?: boolean }): Promise<PushResult> => {
    if (!syncUsername || !syncToken) {
      return { ok: false, reason: 'error', message: 'Not signed in to sync yet' };
    }

    setIsBusy(true);
    setError(null);

    try {
      if (!opts?.force) {
        const remote = await pullSyncData(syncUsername, syncToken);
        // Compared against whichever of lastPushedAt/lastPulledAt is more
        // recent, not lastPulledAt alone - this device's own earlier Push
        // already means it has "seen" that data, so pushing again from the
        // same device must not permanently block itself just because it
        // never separately Pulled what it already pushed.
        const lastKnownRemoteAt = Math.max(lastPushedAt ?? 0, lastPulledAt ?? 0);
        if (remote && remote.savedAt > lastKnownRemoteAt) {
          return { ok: false, reason: 'needs-pull-first', remoteSavedAt: remote.savedAt };
        }
      }

      const payload: SyncPayload = {
        teams: teamsState.teams,
        battles: battlesState.battles,
        savedAt: Date.now(),
      };

      await pushSyncData(syncUsername, syncToken, payload);
      await updateSettings({ lastPushedAt: payload.savedAt });
      await refreshStatus({ lastPushedAt: payload.savedAt });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Push failed';
      setError(message);
      return { ok: false, reason: 'error', message };
    } finally {
      setIsBusy(false);
    }
  }, [syncUsername, syncToken, lastPushedAt, lastPulledAt, teamsState.teams, battlesState.battles, updateSettings, refreshStatus]);

  const pull = useCallback(async (opts?: { force?: boolean }): Promise<PullResult> => {
    if (!syncUsername || !syncToken) {
      return { ok: false, reason: 'error', message: 'Not signed in to sync yet' };
    }

    setIsBusy(true);
    setError(null);

    try {
      if (!opts?.force) {
        const [teamsDb, battlesDb] = await Promise.all([
          window.electron.readTeamsDatabase() as Promise<TeamsDatabase | null>,
          window.electron.readBattlesDatabase() as Promise<BattlesDatabase | null>,
        ]);
        const localModifiedAt = Math.max(teamsDb?.lastModified ?? 0, battlesDb?.lastModified ?? 0);
        if (localModifiedAt > (lastPushedAt ?? 0)) {
          return { ok: false, reason: 'needs-push-first', localModifiedAt };
        }
      }

      const remote = await pullSyncData(syncUsername, syncToken);
      if (!remote) {
        return { ok: false, reason: 'error', message: 'No data found for this account yet' };
      }

      const teamsDb: TeamsDatabase = { version: 1, teams: remote.teams, lastModified: Date.now() };
      const battlesDb: BattlesDatabase = { version: 1, battles: remote.battles, lastModified: Date.now() };
      await window.electron.writeTeamsDatabase(teamsDb);
      await window.electron.writeBattlesDatabase(battlesDb);
      await teamsState.refreshTeams();
      await battlesState.refreshBattles();

      await updateSettings({ lastPulledAt: remote.savedAt });
      await refreshStatus({ lastPulledAt: remote.savedAt });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pull failed';
      setError(message);
      return { ok: false, reason: 'error', message };
    } finally {
      setIsBusy(false);
    }
  }, [syncUsername, syncToken, lastPushedAt, teamsState, battlesState, updateSettings, refreshStatus]);

  return {
    syncUsername,
    lastPushedAt,
    lastPulledAt,
    isBusy,
    error,
    status,
    signUp,
    logIn,
    logOut,
    push,
    pull,
  };
}
