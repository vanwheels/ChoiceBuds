/**
 * useSync Hook - Cross-Device Sync Orchestration
 * Manual, one-directional-at-a-time Push/Pull against the Worker in
 * services/syncApi.ts - deliberately not continuous background sync (no
 * backend arbitrating real conflicts). See TODO.md's cross-device sync
 * design note for the full rationale.
 */

import { useState, useCallback, useEffect } from 'react';
import type { UseSettingsReturn } from './useSettings';
import type { UseTeamsReturn } from './useTeams';
import type { UseBattlesReturn } from './useBattles';
import { pushSyncData, pullSyncData } from '../services/syncApi';
import type { SyncPayload, TeamsDatabase, BattlesDatabase } from '../types/pokemon';

const IDENTIFIER_PATTERN = /^[a-zA-Z0-9_]{2,32}#\d{4}$/;

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
  syncIdentifier: string | null;
  lastPushedAt: number | null;
  lastPulledAt: number | null;
  isBusy: boolean;
  error: string | null;
  status: SyncStatus;
  createIdentifier: (username: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  pairExistingIdentifier: (identifier: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  forgetIdentifier: () => Promise<void>;
  push: (opts?: { force?: boolean }) => Promise<PushResult>;
  pull: (opts?: { force?: boolean }) => Promise<PullResult>;
}

function generateDiscriminator(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 10000).padStart(4, '0');
}

/** Only the discriminator is retried on collision - usernames are shared by design (many people can be "ethan"). */
const MAX_DISCRIMINATOR_ATTEMPTS = 5;

export function useSync(
  settingsState: UseSettingsReturn,
  teamsState: UseTeamsReturn,
  battlesState: UseBattlesReturn
): UseSyncReturn {
  const { settings, updateSettings } = settingsState;
  const { syncIdentifier, lastPushedAt, lastPulledAt } = settings;

  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>('unknown');

  /**
   * Best-effort status refresh: one local disk read (for "do I have
   * unpushed local edits") plus one remote peek fetch (for "does the
   * remote have data I haven't pulled") - not a poll loop, only run on
   * mount and right after an identifier is set up or a push/pull completes.
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

    if (!syncIdentifier) {
      setStatus('never-synced');
      return;
    }

    if (effectivePushedAt === null && effectivePulledAt === null) {
      setStatus('never-synced');
      return;
    }

    try {
      const [teamsDb, battlesDb, remote] = await Promise.all([
        window.electron.readTeamsDatabase() as Promise<TeamsDatabase | null>,
        window.electron.readBattlesDatabase() as Promise<BattlesDatabase | null>,
        pullSyncData(syncIdentifier).catch(() => null),
      ]);

      const localModifiedAt = Math.max(teamsDb?.lastModified ?? 0, battlesDb?.lastModified ?? 0);

      if (remote && remote.savedAt > (effectivePulledAt ?? 0)) {
        setStatus('unpulled-changes');
      } else if (localModifiedAt > (effectivePushedAt ?? 0)) {
        setStatus('unpushed-changes');
      } else {
        setStatus('up-to-date');
      }
    } catch {
      setStatus('unknown');
    }
  }, [syncIdentifier, lastPushedAt, lastPulledAt]);

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncIdentifier]);

  const createIdentifier = useCallback(async (username: string) => {
    const sanitized = username.trim().replace(/#.*$/, '');
    if (!/^[a-zA-Z0-9_]{2,32}$/.test(sanitized)) {
      return { ok: false as const, message: 'Username must be 2-32 letters, numbers, or underscores' };
    }

    // Usernames aren't unique on their own (many people can be "ethan") -
    // only the full username#XXXX combination needs to be free. The Worker
    // has no separate "taken identifiers" registry, so "does this exact
    // identifier already have data pushed to it" (a plain GET) is the only
    // available signal - re-roll just the discriminator on a collision.
    let identifier: string | null = null;
    for (let attempt = 0; attempt < MAX_DISCRIMINATOR_ATTEMPTS; attempt++) {
      const candidate = `${sanitized}#${generateDiscriminator()}`;
      try {
        const existing = await pullSyncData(candidate);
        if (!existing) {
          identifier = candidate;
          break;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not verify identifier availability';
        return { ok: false as const, message };
      }
    }

    if (!identifier) {
      return { ok: false as const, message: 'Could not find a free identifier for that username - try a different username' };
    }

    const success = await updateSettings({ syncIdentifier: identifier, lastPushedAt: null, lastPulledAt: null });
    if (!success) {
      return { ok: false as const, message: 'Failed to save sync identifier' };
    }
    return { ok: true as const };
  }, [updateSettings]);

  const pairExistingIdentifier = useCallback(async (identifier: string) => {
    const trimmed = identifier.trim();
    if (!IDENTIFIER_PATTERN.test(trimmed)) {
      return { ok: false as const, message: 'Expected the exact "username#XXXX" identifier from your other device' };
    }

    const success = await updateSettings({ syncIdentifier: trimmed, lastPushedAt: null, lastPulledAt: null });
    if (!success) {
      return { ok: false as const, message: 'Failed to save sync identifier' };
    }
    return { ok: true as const };
  }, [updateSettings]);

  const forgetIdentifier = useCallback(async (): Promise<void> => {
    await updateSettings({ syncIdentifier: null, lastPushedAt: null, lastPulledAt: null });
    setStatus('never-synced');
  }, [updateSettings]);

  const push = useCallback(async (opts?: { force?: boolean }): Promise<PushResult> => {
    if (!syncIdentifier) {
      return { ok: false, reason: 'error', message: 'No sync identifier set up yet' };
    }

    setIsBusy(true);
    setError(null);

    try {
      if (!opts?.force) {
        const remote = await pullSyncData(syncIdentifier);
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

      await pushSyncData(syncIdentifier, payload);
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
  }, [syncIdentifier, lastPushedAt, lastPulledAt, teamsState.teams, battlesState.battles, updateSettings, refreshStatus]);

  const pull = useCallback(async (opts?: { force?: boolean }): Promise<PullResult> => {
    if (!syncIdentifier) {
      return { ok: false, reason: 'error', message: 'No sync identifier set up yet' };
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

      const remote = await pullSyncData(syncIdentifier);
      if (!remote) {
        return { ok: false, reason: 'error', message: 'No data found for this identifier yet' };
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
  }, [syncIdentifier, lastPushedAt, teamsState, battlesState, updateSettings, refreshStatus]);

  return {
    syncIdentifier,
    lastPushedAt,
    lastPulledAt,
    isBusy,
    error,
    status,
    createIdentifier,
    pairExistingIdentifier,
    forgetIdentifier,
    push,
    pull,
  };
}
