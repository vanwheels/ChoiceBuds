import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import { useSync } from './useSync';
import type { UseSettingsReturn } from './useSettings';
import type { UseTeamsReturn } from './useTeams';
import type { UseBattlesReturn } from './useBattles';
import type { UseSavedPokemonReturn } from './useSavedPokemon';
import type { AppSettings, SavedPokemonEntry, SyncPayload, Team } from '../types/pokemon';

vi.mock('../services/syncApi', () => ({
  signup: vi.fn(),
  login: vi.fn(),
  pushSyncData: vi.fn(),
}));

import { signup, login, pushSyncData } from '../services/syncApi';

const mockedSignup = vi.mocked(signup);
const mockedLogin = vi.mocked(login);
const mockedPush = vi.mocked(pushSyncData);

const PLAYER_PROFILE = {
  playerName: '', ageDivision: '' as const, trainerNameInGame: '', playerId: '',
  dateOfBirth: '', supportId: '', switchProfileName: '', updatedAt: 0,
};

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    version: 1,
    defaultRegulation: 'Reg M-A',
    teamsFilter: 'All',
    syncUsername: null,
    syncToken: null,
    lastSyncedAt: null,
    showAnimatedSprites: false,
    boxSortMode: 'alphabetical',
    boxCustomOrderSeeded: false,
    lastSeenReleaseNotesVersion: null,
    playerProfile: PLAYER_PROFILE,
    lastModified: Date.now(),
    ...overrides,
  };
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return { id: 'team-1', name: 'Test Team', format: 'Reg M-B', pokemon: [], createdAt: Date.now(), updatedAt: Date.now(), ...overrides };
}

function emptyMergedPayload(overrides: Partial<SyncPayload> = {}): SyncPayload {
  return {
    teams: [], teamTombstones: [],
    battles: [], battleTombstones: [],
    savedPokemon: [], savedPokemonTombstones: [],
    savedAt: Date.now(),
    ...overrides,
  };
}

function setup(settingsOverrides: Partial<AppSettings> = {}) {
  const settings = makeSettings(settingsOverrides);
  const updateSettings = vi.fn().mockResolvedValue(true);
  const settingsState: UseSettingsReturn = {
    settings,
    isLoading: false,
    error: null,
    setDefaultRegulation: vi.fn().mockResolvedValue(true),
    updateSettings,
  };

  const teamsState: UseTeamsReturn = {
    teams: [makeTeam()],
    isLoading: false,
    error: null,
    expandedCardIds: new Set(),
    tombstones: [],
    addTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
    setTeamOrder: vi.fn(),
    toggleCardExpansion: vi.fn(),
    expandCard: vi.fn(),
    collapseCard: vi.fn(),
    collapseAllCards: vi.fn(),
    refreshTeams: vi.fn().mockResolvedValue(undefined),
    getTeamById: vi.fn(),
    // Mirrors the real useTeams.ts::applySyncedState, which unconditionally
    // overwrites `teams` with the server's (always-fresh-reference) result -
    // that reference change is exactly what the skip-next-mutation-sync
    // mechanism under test exists to not mistake for a local edit.
    applySyncedState: vi.fn(async (records: Team[]) => { teamsState.teams = records; return true; }),
  };

  const battlesState: UseBattlesReturn = {
    battles: [],
    isLoading: false,
    error: null,
    tombstones: [],
    addBattle: vi.fn(),
    updateBattle: vi.fn(),
    deleteBattle: vi.fn(),
    refreshBattles: vi.fn().mockResolvedValue(undefined),
    getBattleById: vi.fn(),
    applySyncedState: vi.fn(async (records) => { battlesState.battles = records; return true; }),
  };

  const savedPokemonState: UseSavedPokemonReturn = {
    savedPokemon: [] as SavedPokemonEntry[],
    isLoading: false,
    error: null,
    expandedCardIds: new Set(),
    toggleCardExpansion: vi.fn(),
    addSavedPokemonBatch: vi.fn(),
    renameSavedPokemon: vi.fn(),
    toggleSavedPokemonFavorite: vi.fn(),
    duplicateSavedPokemon: vi.fn(),
    setSavedPokemonOrder: vi.fn(),
    updateSavedPokemon: vi.fn(),
    deleteSavedPokemon: vi.fn(),
    refreshSavedPokemon: vi.fn().mockResolvedValue(undefined),
    getSavedSetsForSpecies: vi.fn().mockReturnValue([]),
    tombstones: [],
    applySyncedState: vi.fn(async (records) => { savedPokemonState.savedPokemon = records; return true; }),
  };

  const { result, rerender } = renderHook(() => useSync(settingsState, teamsState, battlesState, savedPokemonState));
  return { result, rerender, updateSettings, teamsState, battlesState, savedPokemonState };
}

describe('useSync', () => {
  beforeEach(() => {
    mockedSignup.mockReset();
    mockedLogin.mockReset();
    mockedPush.mockReset().mockResolvedValue(emptyMergedPayload());
  });

  // Not configured globally (see vitest.config.ts/setupElectronMock.ts) - most
  // hooks don't need it, but useSync's effects register a global 'online'
  // listener and an interval, which would otherwise leak across tests and
  // keep firing from every previously-rendered (but never unmounted) hook
  // instance in this file.
  afterEach(() => {
    cleanup();
  });

  describe('status', () => {
    it('is signed-out with no account signed in', () => {
      const { result } = setup();
      expect(result.current.status).toBe('signed-out');
    });

    it('auto-syncs on mount when already signed in, landing on idle', async () => {
      const { result } = setup({ syncUsername: 'ethan', syncToken: 'tok' });
      await waitFor(() => expect(mockedPush).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(result.current.status).toBe('idle'));
    });
  });

  describe('signUp', () => {
    it('rejects a malformed username without touching the network', async () => {
      const { result } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.signUp('a', 'password123');
      });

      expect(outcome).toEqual({ ok: false, message: expect.stringContaining('2-32 letters') });
      expect(mockedSignup).not.toHaveBeenCalled();
    });

    it('rejects a too-short password without touching the network', async () => {
      const { result } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.signUp('ethan', 'short');
      });

      expect(outcome).toEqual({ ok: false, message: expect.stringContaining('at least 8 characters') });
      expect(mockedSignup).not.toHaveBeenCalled();
    });

    it('signs up and persists the returned token', async () => {
      mockedSignup.mockResolvedValue({ token: 'new-token' });
      const { result, updateSettings } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.signUp('ethan', 'password123', 'ethan@example.com');
      });

      expect(outcome).toEqual({ ok: true });
      expect(mockedSignup).toHaveBeenCalledWith('ethan', 'password123', 'ethan@example.com');
      expect(updateSettings).toHaveBeenCalledWith({
        syncUsername: 'ethan',
        syncToken: 'new-token',
        lastSyncedAt: null,
      });
    });

    it('surfaces the server error when signup fails (e.g. username taken)', async () => {
      mockedSignup.mockRejectedValueOnce(new Error('Username is already taken'));
      const { result, updateSettings } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.signUp('ethan', 'password123');
      });

      expect(outcome).toEqual({ ok: false, message: 'Username is already taken' });
      expect(updateSettings).not.toHaveBeenCalled();
    });

    it('reports failure when persisting the new credentials fails', async () => {
      mockedSignup.mockResolvedValue({ token: 'new-token' });
      const { result, updateSettings } = setup();
      updateSettings.mockResolvedValueOnce(false);

      let outcome;
      await act(async () => {
        outcome = await result.current.signUp('ethan', 'password123');
      });

      expect(outcome).toEqual({ ok: false, message: 'Failed to save sync credentials' });
    });
  });

  describe('logIn', () => {
    it('rejects an empty username or password without touching the network', async () => {
      const { result, updateSettings } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.logIn('', '');
      });

      expect(outcome).toEqual({ ok: false, message: expect.stringContaining('required') });
      expect(mockedLogin).not.toHaveBeenCalled();
      expect(updateSettings).not.toHaveBeenCalled();
    });

    it('trims the username and persists the returned token', async () => {
      mockedLogin.mockResolvedValue({ token: 'device-2-token' });
      const { result, updateSettings } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.logIn('  ethan  ', 'password123');
      });

      expect(outcome).toEqual({ ok: true });
      expect(mockedLogin).toHaveBeenCalledWith('ethan', 'password123');
      expect(updateSettings).toHaveBeenCalledWith({
        syncUsername: 'ethan',
        syncToken: 'device-2-token',
        lastSyncedAt: null,
      });
    });

    it('surfaces the server error when login fails', async () => {
      mockedLogin.mockRejectedValueOnce(new Error('Invalid username or password'));
      const { result, updateSettings } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.logIn('ethan', 'wrong-password');
      });

      expect(outcome).toEqual({ ok: false, message: 'Invalid username or password' });
      expect(updateSettings).not.toHaveBeenCalled();
    });
  });

  describe('logOut', () => {
    it('clears the account/token/timestamp and resets status to signed-out', async () => {
      const { result, updateSettings } = setup({ syncUsername: 'ethan', syncToken: 'tok' });
      await waitFor(() => expect(result.current.status).toBe('idle')); // let the mount-time auto-sync settle first

      await act(async () => {
        await result.current.logOut();
      });

      expect(updateSettings).toHaveBeenCalledWith({ syncUsername: null, syncToken: null, lastSyncedAt: null });
      expect(result.current.status).toBe('signed-out');
    });
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

      const { result, updateSettings, teamsState, battlesState, savedPokemonState } = setup({ syncUsername: 'ethan', syncToken: 'tok' });
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
      expect(teamsState.applySyncedState).toHaveBeenLastCalledWith([remoteTeam]);
      expect(battlesState.applySyncedState).toHaveBeenLastCalledWith([]);
      expect(savedPokemonState.applySyncedState).toHaveBeenLastCalledWith([]);
      expect(updateSettings).toHaveBeenLastCalledWith({ lastSyncedAt: 42_000 });
    });

    it('applies the merged playerProfile back when the Worker returns one', async () => {
      const remoteProfile = { ...PLAYER_PROFILE, playerName: 'Remote Name', updatedAt: 99_000 };
      mockedPush.mockResolvedValue(emptyMergedPayload({ playerProfile: remoteProfile, savedAt: 42_000 }));

      const { result, updateSettings } = setup({ syncUsername: 'ethan', syncToken: 'tok' });
      await waitFor(() => expect(mockedPush).toHaveBeenCalledTimes(1)); // mount-triggered auto-sync

      await act(async () => {
        await result.current.syncNow();
      });

      expect(updateSettings).toHaveBeenLastCalledWith({ lastSyncedAt: 42_000, playerProfile: remoteProfile });
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
      mockedPush.mockReturnValue(new Promise(resolve => { resolvePush = resolve; }));

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
