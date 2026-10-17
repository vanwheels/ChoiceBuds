import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, act } from '@testing-library/react';
import { emptyMergedPayload, makePokemon, makeTeam, setup } from './useSyncTestHelpers';

// Debounced/interval/online auto-sync triggers, split out of the former
// useSync.test.ts. See useSync.test.ts for status/signUp/logIn/logOut and
// useSync.syncNow.test.ts for syncNow itself - same fixtures
// (./useSyncTestHelpers), no behavior change.

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

  describe('auto-sync triggers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('syncs again after local data changes, once things settle (debounced)', async () => {
      const { rerender, teamsState } = setup({ syncUsername: 'ethan', syncToken: 'tok' });
      await vi.waitFor(() => expect(mockedPush).toHaveBeenCalledTimes(1)); // mount-triggered
      // Reflects the mount-triggered sync's own applySyncedState write (see
      // its mock above) and lets it consume the skip-next-mutation-sync flag,
      // so it's not mistaken later for the genuine edit this test simulates.
      rerender();

      mockedPush.mockClear();
      teamsState.teams = [makeTeam({ id: 'a-new-team' })]; // simulate a mutation changing the array reference
      rerender();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });

      expect(mockedPush).toHaveBeenCalledTimes(1);
    });

    it('fixes lingering "-Female"/"-Male" species text in the push and bumps updatedAt so it can win the Worker\'s merge', async () => {
      const { rerender, teamsState } = setup({ syncUsername: 'ethan', syncToken: 'tok' });
      await vi.waitFor(() => expect(mockedPush).toHaveBeenCalledTimes(1)); // mount-triggered
      rerender();

      mockedPush.mockClear();
      const staleTeam = makeTeam({
        id: 'stale',
        updatedAt: 1_000,
        pokemon: [makePokemon('Indeedee-Female')],
      });
      teamsState.teams = [staleTeam];
      rerender();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });

      expect(mockedPush).toHaveBeenCalledTimes(1);
      const pushedTeams = mockedPush.mock.calls[0][2].teams;
      expect(pushedTeams).toHaveLength(1);
      expect(pushedTeams[0].pokemon[0].showdownData.species).toBe('Indeedee-F');
      expect(pushedTeams[0].updatedAt).toBeGreaterThan(1_000);
      // The original (still-stale) team object passed in is untouched - the
      // fix only ever applies to the push payload's own copy.
      expect(staleTeam.pokemon[0].showdownData.species).toBe('Indeedee-Female');
    });

    it('does not re-sync off its own applySyncedState write (regression: this used to ping-pong forever)', async () => {
      const remoteTeam = makeTeam({ id: 'remote-team' });
      mockedPush.mockResolvedValue(emptyMergedPayload({ teams: [remoteTeam] }));

      const { rerender } = setup({ syncUsername: 'ethan', syncToken: 'tok' });
      await vi.waitFor(() => expect(mockedPush).toHaveBeenCalledTimes(1)); // mount-triggered
      // The mount sync's applySyncedState mock just overwrote teamsState.teams
      // with a fresh reference (remoteTeam) - render so the debounce effect
      // observes it.
      rerender();

      mockedPush.mockClear();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });

      // A real edit would have scheduled another push here; a reference
      // change that came from applying the sync's own result must not.
      expect(mockedPush).not.toHaveBeenCalled();
    });

    it('syncs again on an interval fallback', async () => {
      setup({ syncUsername: 'ethan', syncToken: 'tok' });
      await vi.waitFor(() => expect(mockedPush).toHaveBeenCalledTimes(1)); // mount-triggered

      mockedPush.mockClear();

      await act(async () => {
        // Also crosses the 5s mutation-debounce mark, which fires too (the
        // mount-triggered data-load itself counts as a "change") - that's
        // accepted redundancy, not what this test is isolating, so it
        // asserts "at least once" rather than an exact count.
        await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      });

      expect(mockedPush).toHaveBeenCalled();
    });

    it('syncs again when the browser comes back online', async () => {
      const { result } = setup({ syncUsername: 'ethan', syncToken: 'tok' });
      // Wait for the mount-triggered sync to fully settle (not just for
      // pushSyncData to have been *called*) - otherwise the in-flight guard
      // would make the 'online' trigger below share that still-pending run
      // instead of starting a new, separately-observable one.
      await vi.waitFor(() => expect(result.current.status).toBe('idle'));

      mockedPush.mockClear();

      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });

      expect(mockedPush).toHaveBeenCalledTimes(1);
    });
  });
});
