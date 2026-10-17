import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, waitFor, act } from '@testing-library/react';
import type { SyncPayload } from '../types/pokemon';
import { PLAYER_PROFILE, emptyMergedPayload, makeTeam, setup } from './useSyncTestHelpers';

// syncNow, split out of the former useSync.test.ts. See useSync.test.ts for
// status/signUp/logIn/logOut and useSync.autoSync.test.ts for the debounced/
// interval/online triggers - same fixtures (./useSyncTestHelpers), no
// behavior change.

vi.mock('../services/syncApi', () => ({
  signup: vi.fn(),
  login: vi.fn(),
  pushSyncData: vi.fn(),
}));

import { signup, login, pushSyncData } from '../services/syncApi';

const mockedSignup = vi.mocked(signup);
const mockedLogin = vi.mocked(login);
const mockedPush = vi.mocked(pushSyncData);

describe('useSync', () => {
  beforeEach(() => {
    mockedSignup.mockReset();
    mockedLogin.mockReset();
    mockedPush.mockReset().mockResolvedValue(emptyMergedPayload());
  });

  // See useSync.test.ts for why this is needed (leaked 'online' listener/
  // interval across never-unmounted hook instances in the same file).
  afterEach(() => {
    cleanup();
  });

  describe('syncNow', () => {
    it('errors immediately when not signed in', async () => {
      const { result } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.syncNow();
      });

      expect(outcome).toEqual({ ok: false, message: 'Not signed in to sync yet' });
      expect(mockedPush).not.toHaveBeenCalled();
    });

    it('pushes the current teams/battles/savedPokemon + tombstones snapshot and applies the merged result back', async () => {
      const remoteTeam = makeTeam({ id: 'remote-team' });
      const merged = emptyMergedPayload({ teams: [remoteTeam], savedAt: 42_000 });
      mockedPush.mockResolvedValue(merged);

      const { result, updateSettings, teamsState, battlesState, savedPokemonState } = setup({
        syncUsername: 'ethan',
        syncToken: 'tok',
      });
      await waitFor(() => expect(mockedPush).toHaveBeenCalledTimes(1)); // mount-triggered auto-sync

      let outcome;
      await act(async () => {
        outcome = await result.current.syncNow();
      });

      expect(outcome).toEqual({ ok: true });
      expect(mockedPush).toHaveBeenLastCalledWith('ethan', 'tok', {
        teams: teamsState.teams,
        teamTombstones: teamsState.tombstones,
        battles: battlesState.battles,
        battleTombstones: battlesState.tombstones,
        savedPokemon: savedPokemonState.savedPokemon,
        savedPokemonTombstones: savedPokemonState.tombstones,
        playerProfile: PLAYER_PROFILE,
        savedAt: expect.any(Number),
      });
      expect(teamsState.applySyncedState).toHaveBeenLastCalledWith([remoteTeam], []);
      expect(battlesState.applySyncedState).toHaveBeenLastCalledWith([]);
      expect(savedPokemonState.applySyncedState).toHaveBeenLastCalledWith([]);
      expect(updateSettings).toHaveBeenLastCalledWith({ lastSyncedAt: 42_000 });
    });

    it('applies the merged playerProfile back when the Worker returns one', async () => {
      const remoteProfile = { ...PLAYER_PROFILE, playerName: 'Remote Name', updatedAt: 99_000 };
      mockedPush.mockResolvedValue(
        emptyMergedPayload({ playerProfile: remoteProfile, savedAt: 42_000 }),
      );

      const { result, updateSettings } = setup({ syncUsername: 'ethan', syncToken: 'tok' });
      await waitFor(() => expect(mockedPush).toHaveBeenCalledTimes(1)); // mount-triggered auto-sync

      await act(async () => {
        await result.current.syncNow();
      });

      expect(updateSettings).toHaveBeenLastCalledWith({
        lastSyncedAt: 42_000,
        playerProfile: remoteProfile,
      });
    });

    it('leaves the local playerProfile untouched when the Worker omits it (un-redeployed account)', async () => {
      mockedPush.mockResolvedValue(emptyMergedPayload({ savedAt: 42_000 })); // no playerProfile key, same as an old Worker's response
      const { result, updateSettings } = setup({ syncUsername: 'ethan', syncToken: 'tok' });
      await waitFor(() => expect(mockedPush).toHaveBeenCalledTimes(1)); // mount-triggered auto-sync

      await act(async () => {
        await result.current.syncNow();
      });

      expect(updateSettings).toHaveBeenLastCalledWith({ lastSyncedAt: 42_000 });
    });

    it('sets the error state and status when the push itself fails', async () => {
      mockedPush.mockResolvedValueOnce(emptyMergedPayload()); // mount-triggered auto-sync succeeds first
      const { result } = setup({ syncUsername: 'ethan', syncToken: 'tok' });
      await waitFor(() => expect(result.current.status).toBe('idle'));

      mockedPush.mockRejectedValueOnce(new Error('sync exploded'));

      let outcome;
      await act(async () => {
        outcome = await result.current.syncNow();
      });

      expect(outcome).toEqual({ ok: false, message: 'sync exploded' });
      expect(result.current.error).toBe('sync exploded');
      expect(result.current.status).toBe('error');
    });

    it('shares one in-flight run across concurrent callers instead of double-pushing', async () => {
      let resolvePush: (payload: SyncPayload) => void;
      mockedPush.mockReturnValue(
        new Promise((resolve) => {
          resolvePush = resolve;
        }),
      );

      const { result } = setup({ syncUsername: 'ethan', syncToken: 'tok' });
      await waitFor(() => expect(mockedPush).toHaveBeenCalledTimes(1)); // the pending mount-triggered call

      let outcomeA: unknown;
      let outcomeB: unknown;
      const callPromise = act(async () => {
        const [a, b] = await Promise.all([result.current.syncNow(), result.current.syncNow()]);
        outcomeA = a;
        outcomeB = b;
      });

      resolvePush!(emptyMergedPayload());
      await callPromise;

      expect(mockedPush).toHaveBeenCalledTimes(1); // still just the mount-triggered call - both syncNow() calls shared it
      expect(outcomeA).toEqual({ ok: true });
      expect(outcomeB).toEqual({ ok: true });
    });
  });
});
