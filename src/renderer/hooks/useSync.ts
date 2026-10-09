/**
 * useSync Hook - Cross-Device Sync Orchestration
 * Automatic background sync against the Worker's per-record merge endpoint
 * (see worker/src/index.ts, services/syncApi.ts) - a single `syncNow()` both
 * pushes this device's local state and applies back whatever the Worker's
 * merge decided is authoritative, so there's no more separate directional
 * push/pull or manual conflict resolution (real per-record merge removes the
 * "you might clobber the other side" risk that justified that). See
 * TODO.md's Sync Data Model leg and docs/investigations/web-version-scope.md.
 *
 * Lives in App.tsx (not a per-tab component) specifically so the auto-sync
 * triggers below run from launch regardless of whether the user ever opens
 * Settings - see App.tsx's own comment at its useSync() call site.
 *
 * Accounts are real username/password (see worker/src/index.ts) - this
 * device authenticates with an opaque bearer token issued at signup/login,
 * never the password itself.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { UseSettingsReturn } from './useSettings';
import type { UseTeamsReturn } from './useTeams';
import type { UseBattlesReturn } from './useBattles';
import type { UseSavedPokemonReturn } from './useSavedPokemon';
import { signup, login, pushSyncData } from '../services/syncApi';
import type { SyncPayload } from '../types/pokemon';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{2,32}$/;
const MIN_PASSWORD_LENGTH = 8;

// How long to wait after the last local mutation before syncing, so a burst
// of edits (e.g. importing a full team) collapses into one sync instead of
// one per keystroke/field.
const AUTO_SYNC_DEBOUNCE_MS = 5_000;
// Fallback poll so a device that isn't actively editing still picks up
// another device's changes.
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export type SyncStatus = 'signed-out' | 'idle' | 'syncing' | 'error';
export type SyncResult = { ok: true } | { ok: false; message: string };

export interface UseSyncReturn {
  syncUsername: string | null;
  lastSyncedAt: number | null;
  status: SyncStatus;
  error: string | null;
  signUp: (username: string, password: string, email?: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  logIn: (username: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  logOut: () => Promise<void>;
  /** Pushes local state and applies back the Worker's merged result - safe to call anytime, and safe to call concurrently (shares one in-flight run). */
  syncNow: () => Promise<SyncResult>;
}

export function useSync(
  settingsState: UseSettingsReturn,
  teamsState: UseTeamsReturn,
  battlesState: UseBattlesReturn,
  savedPokemonState: UseSavedPokemonReturn
): UseSyncReturn {
  const { settings, updateSettings } = settingsState;
  const { syncUsername, syncToken, lastSyncedAt, playerProfile } = settings;

  const [internalStatus, setStatus] = useState<SyncStatus>(() => (settings.syncUsername ? 'idle' : 'signed-out'));
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<SyncResult> | null>(null);
  // Remembers the exact teams/battles/savedPokemon array references a sync
  // just wrote back via applySyncedState below (those hooks store `records`
  // - the parsed server-response arrays - as-is, so this is a precise
  // reference, not a guess). The debounced-mutation effect compares its own
  // dependency array against this on every run and skips scheduling a sync
  // when they match, which is what tells "the Worker's own merged result
  // just landed" apart from "a real local edit happened."
  //
  // This replaces a prior one-shot boolean skip flag that assumed all three
  // applySyncedState calls below always land in a single React commit. They
  // don't: each hook's applySyncedState goes through its own enqueueMutation
  // queue and its own storage-adapter write (separate IndexedDB/Electron-IPC
  // calls with independent latency), so their state updates routinely commit
  // across two or three separate renders. The boolean only ever suppressed
  // the first of those renders - the second/third re-triggered the debounced
  // effect for real, scheduling a phantom sync 5s later with no actual local
  // change behind it. That phantom sync's own response then did the same
  // thing again, and closely-spaced automatic pushes like this were enough
  // to occasionally trip the Worker's 3-second per-account write throttle
  // (429 "Writing too frequently") even for a single signed-in device/tab -
  // reported live 2026-10-09 alongside the original team-notes sync report.
  const lastSyncedRef = useRef<{ teams: SyncPayload['teams']; battles: SyncPayload['battles']; savedPokemon: SyncPayload['savedPokemon'] } | null>(null);

  // Derived rather than effect-driven: being signed out always overrides
  // whatever syncNow last set (e.g. a stale 'error' from before logOut), and
  // there's no external system to synchronize here that an effect would be
  // needed for.
  const status: SyncStatus = (!syncUsername || !syncToken) ? 'signed-out' : internalStatus;

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

    const success = await updateSettings({ syncUsername: trimmedUsername, syncToken: token, lastSyncedAt: null });
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

    const success = await updateSettings({ syncUsername: trimmedUsername, syncToken: token, lastSyncedAt: null });
    if (!success) {
      return { ok: false as const, message: 'Failed to save sync credentials' };
    }
    return { ok: true as const };
  }, [updateSettings]);

  const logOut = useCallback(async (): Promise<void> => {
    // Client-side only, same as before: this device's token simply stops
    // being used locally. Other signed-in devices are unaffected, and there's
    // no server-side revoke endpoint in this leg.
    await updateSettings({ syncUsername: null, syncToken: null, lastSyncedAt: null });
    setStatus('signed-out');
    setError(null);
  }, [updateSettings]);

  const syncNow = useCallback((): Promise<SyncResult> => {
    if (!syncUsername || !syncToken) {
      return Promise.resolve({ ok: false, message: 'Not signed in to sync yet' });
    }
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const run = (async (): Promise<SyncResult> => {
      setStatus('syncing');
      setError(null);

      try {
        const payload: SyncPayload = {
          teams: teamsState.teams,
          teamTombstones: teamsState.tombstones,
          battles: battlesState.battles,
          battleTombstones: battlesState.tombstones,
          savedPokemon: savedPokemonState.savedPokemon,
          savedPokemonTombstones: savedPokemonState.tombstones,
          playerProfile,
          savedAt: Date.now(),
        };

        const merged = await pushSyncData(syncUsername, syncToken, payload);

        lastSyncedRef.current = { teams: merged.teams, battles: merged.battles, savedPokemon: merged.savedPokemon };
        await Promise.all([
          teamsState.applySyncedState(merged.teams),
          battlesState.applySyncedState(merged.battles),
          savedPokemonState.applySyncedState(merged.savedPokemon),
        ]);

        // merged.playerProfile is missing when the account's Worker hasn't
        // been redeployed with profile-sync support yet (see SyncPayload's
        // comment) - leave the local profile alone rather than treating a
        // field the old Worker never echoed back as "deleted."
        await updateSettings({
          lastSyncedAt: merged.savedAt,
          ...(merged.playerProfile ? { playerProfile: merged.playerProfile } : {}),
        });
        setStatus('idle');
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sync failed';
        setError(message);
        setStatus('error');
        return { ok: false, message };
      } finally {
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = run;
    return run;
    // Depends on the whole teamsState/battlesState/savedPokemonState objects
    // (recreated every render of their owning hooks) rather than individual
    // fields, so this recreates on every render - fine, since every trigger
    // effect below reads it through syncNowRef instead of depending on it
    // directly.
  }, [syncUsername, syncToken, updateSettings, teamsState, battlesState, savedPokemonState, playerProfile]);

  // Always-current ref so the trigger effects below (keyed only on
  // syncUsername/syncToken, not on syncNow's own frequently-churning
  // dependency list) never call a stale closure.
  const syncNowRef = useRef(syncNow);
  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);

  // Immediate sync on sign-in/mount, and on reconnect.
  useEffect(() => {
    if (!syncUsername || !syncToken) return;
    syncNowRef.current();

    const handleOnline = () => { syncNowRef.current(); };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncUsername, syncToken]);

  // Fallback poll - picks up another device's changes even when this one
  // isn't actively editing.
  useEffect(() => {
    if (!syncUsername || !syncToken) return;
    const intervalId = setInterval(() => { syncNowRef.current(); }, AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [syncUsername, syncToken]);

  // Debounced on local mutation - deliberately depends on the raw
  // teams/battles/savedPokemon array references (stable unless a real
  // mutation happened) rather than a wrapped object, so the timer only
  // resets on an actual change, not on every render of this hook.
  useEffect(() => {
    if (!syncUsername || !syncToken) return;
    const last = lastSyncedRef.current;
    if (last && last.teams === teamsState.teams && last.battles === battlesState.battles && last.savedPokemon === savedPokemonState.savedPokemon) {
      return;
    }
    const timeoutId = setTimeout(() => { syncNowRef.current(); }, AUTO_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
    // Deliberately excludes playerProfile: unlike teams/battles/savedPokemon,
    // an edit there isn't debounce-triggered - it still reaches the Worker
    // via the next mount sync, the 5-minute fallback poll, or whichever of
    // these three collections' own debounced sync fires next. Not worth a
    // second debounce effect/skip-ref pair for a field that changes rarely.
  }, [syncUsername, syncToken, teamsState.teams, battlesState.battles, savedPokemonState.savedPokemon]);

  return {
    syncUsername,
    lastSyncedAt,
    status,
    error,
    signUp,
    logIn,
    logOut,
    syncNow,
  };
}
