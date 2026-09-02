import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSync } from './useSync';
import type { UseSettingsReturn } from './useSettings';
import type { UseTeamsReturn } from './useTeams';
import type { UseBattlesReturn } from './useBattles';
import type { AppSettings, Team } from '../types/pokemon';

vi.mock('../services/syncApi', () => ({
  pushSyncData: vi.fn(),
  pullSyncData: vi.fn(),
}));

import { pushSyncData, pullSyncData } from '../services/syncApi';

const mockedPush = vi.mocked(pushSyncData);
const mockedPull = vi.mocked(pullSyncData);

const PLAYER_PROFILE = {
  playerName: '', ageDivision: '' as const, trainerNameInGame: '', playerId: '',
  dateOfBirth: '', supportId: '', switchProfileName: '',
};

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    version: 1,
    defaultRegulation: 'Reg M-A',
    syncIdentifier: null,
    lastPushedAt: null,
    lastPulledAt: null,
    lastSeasonDataCheckedAt: null,
    championsDataChecks: {},
    showAnimatedSprites: false,
    playerProfile: PLAYER_PROFILE,
    lastModified: Date.now(),
    ...overrides,
  };
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return { id: 'team-1', name: 'Test Team', format: 'Reg M-B', pokemon: [], createdAt: Date.now(), updatedAt: Date.now(), ...overrides };
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

  const refreshTeams = vi.fn().mockResolvedValue(undefined);
  const teamsState: UseTeamsReturn = {
    teams: [makeTeam()],
    isLoading: false,
    error: null,
    expandedCardIds: new Set(),
    addTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
    reorderTeam: vi.fn(),
    toggleCardExpansion: vi.fn(),
    expandCard: vi.fn(),
    collapseCard: vi.fn(),
    collapseAllCards: vi.fn(),
    refreshTeams,
    getTeamById: vi.fn(),
  };

  const refreshBattles = vi.fn().mockResolvedValue(undefined);
  const battlesState: UseBattlesReturn = {
    battles: [],
    isLoading: false,
    error: null,
    addBattle: vi.fn(),
    updateBattle: vi.fn(),
    deleteBattle: vi.fn(),
    refreshBattles,
    getBattleById: vi.fn(),
  };

  const { result } = renderHook(() => useSync(settingsState, teamsState, battlesState));
  return { result, updateSettings, refreshTeams, refreshBattles, teamsState, battlesState };
}

describe('useSync', () => {
  beforeEach(() => {
    mockedPush.mockReset().mockResolvedValue(undefined);
    mockedPull.mockReset().mockResolvedValue(null);
  });

  describe('status', () => {
    it('is never-synced with no identifier configured', async () => {
      const { result } = setup();
      await waitFor(() => expect(result.current.status).toBe('never-synced'));
    });

    it('is never-synced when an identifier exists but nothing has ever been pushed or pulled', async () => {
      const { result } = setup({ syncIdentifier: 'ethan#1234' });
      await waitFor(() => expect(result.current.status).toBe('never-synced'));
      expect(mockedPull).not.toHaveBeenCalled(); // both-null short-circuits before any network call
    });

    it('is up-to-date when local storage and the remote both match what was last pushed/pulled', async () => {
      const now = Date.now();
      vi.mocked(window.electron.readTeamsDatabase).mockResolvedValue({ version: 1, teams: [], lastModified: now - 5000 });
      vi.mocked(window.electron.readBattlesDatabase).mockResolvedValue({ version: 1, battles: [], lastModified: now - 5000 });
      mockedPull.mockResolvedValue({ teams: [], battles: [], savedAt: now - 5000 });

      const { result } = setup({ syncIdentifier: 'ethan#1234', lastPushedAt: now, lastPulledAt: now });
      await waitFor(() => expect(result.current.status).toBe('up-to-date'));
    });

    it('is unpulled-changes when the remote was saved after the last local pull', async () => {
      const now = Date.now();
      mockedPull.mockResolvedValue({ teams: [], battles: [], savedAt: now + 10_000 });

      const { result } = setup({ syncIdentifier: 'ethan#1234', lastPushedAt: now, lastPulledAt: now });
      await waitFor(() => expect(result.current.status).toBe('unpulled-changes'));
    });

    it('is unpushed-changes when local data changed after the last push', async () => {
      const now = Date.now();
      vi.mocked(window.electron.readTeamsDatabase).mockResolvedValue({ version: 1, teams: [], lastModified: now + 10_000 });

      const { result } = setup({ syncIdentifier: 'ethan#1234', lastPushedAt: now, lastPulledAt: now });
      await waitFor(() => expect(result.current.status).toBe('unpushed-changes'));
    });

    it('falls back to unknown without throwing when the status refresh errors', async () => {
      vi.mocked(window.electron.readTeamsDatabase).mockRejectedValue(new Error('disk error'));
      const now = Date.now();

      const { result } = setup({ syncIdentifier: 'ethan#1234', lastPushedAt: now, lastPulledAt: now });
      await waitFor(() => expect(window.electron.readTeamsDatabase).toHaveBeenCalled());
      await waitFor(() => expect(result.current.status).toBe('unknown'));
      expect(result.current.error).toBeNull(); // status-refresh failures are silent, not surfaced as the sync error
    });
  });

  describe('createIdentifier', () => {
    it('rejects a malformed username without touching the network', async () => {
      const { result } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.createIdentifier('a');
      });

      expect(outcome).toEqual({ ok: false, message: expect.stringContaining('2-32 letters') });
      expect(mockedPull).not.toHaveBeenCalled();
    });

    it('sanitizes a pasted "name#XXXX" down to the username and pairs a free discriminator', async () => {
      mockedPull.mockResolvedValue(null); // no existing data under any candidate - always available
      const { result, updateSettings } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.createIdentifier('ethan#9999');
      });

      expect(outcome).toEqual({ ok: true });
      expect(mockedPull).toHaveBeenCalledWith(expect.stringMatching(/^ethan#\d{4}$/));
      expect(updateSettings).toHaveBeenCalledWith({
        syncIdentifier: expect.stringMatching(/^ethan#\d{4}$/),
        lastPushedAt: null,
        lastPulledAt: null,
      });
    });

    it('re-rolls just the discriminator when the first candidate collides', async () => {
      mockedPull
        .mockResolvedValueOnce({ teams: [], battles: [], savedAt: 1 }) // first candidate taken
        .mockResolvedValueOnce(null); // second candidate free
      const { result, updateSettings } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.createIdentifier('ethan');
      });

      expect(outcome).toEqual({ ok: true });
      expect(mockedPull).toHaveBeenCalledTimes(2);
      const [firstCandidate] = mockedPull.mock.calls[0];
      const [secondCandidate] = mockedPull.mock.calls[1];
      expect(secondCandidate).not.toBe(firstCandidate);
      expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ syncIdentifier: secondCandidate }));
    });

    it('gives up after exhausting every discriminator attempt', async () => {
      mockedPull.mockResolvedValue({ teams: [], battles: [], savedAt: 1 }); // every candidate always taken
      const { result, updateSettings } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.createIdentifier('ethan');
      });

      expect(outcome).toEqual({ ok: false, message: expect.stringContaining('Could not find a free identifier') });
      expect(mockedPull).toHaveBeenCalledTimes(5); // MAX_DISCRIMINATOR_ATTEMPTS
      expect(updateSettings).not.toHaveBeenCalled();
    });

    it('surfaces the error message when checking availability throws', async () => {
      mockedPull.mockRejectedValueOnce(new Error('sync server unreachable'));
      const { result, updateSettings } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.createIdentifier('ethan');
      });

      expect(outcome).toEqual({ ok: false, message: 'sync server unreachable' });
      expect(updateSettings).not.toHaveBeenCalled();
    });

    it('reports failure without changing status when persisting the new identifier fails', async () => {
      mockedPull.mockResolvedValue(null);
      const { result, updateSettings } = setup();
      updateSettings.mockResolvedValueOnce(false);

      let outcome;
      await act(async () => {
        outcome = await result.current.createIdentifier('ethan');
      });

      expect(outcome).toEqual({ ok: false, message: 'Failed to save sync identifier' });
    });
  });

  describe('pairExistingIdentifier', () => {
    it('rejects an identifier not shaped like "username#XXXX"', async () => {
      const { result, updateSettings } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.pairExistingIdentifier('not-an-identifier');
      });

      expect(outcome).toEqual({ ok: false, message: expect.stringContaining('exact "username#XXXX"') });
      expect(updateSettings).not.toHaveBeenCalled();
    });

    it('trims and persists a validly-shaped identifier', async () => {
      const { result, updateSettings } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.pairExistingIdentifier('  ethan#1234  ');
      });

      expect(outcome).toEqual({ ok: true });
      expect(updateSettings).toHaveBeenCalledWith({ syncIdentifier: 'ethan#1234', lastPushedAt: null, lastPulledAt: null });
    });

    it('reports failure when persisting the paired identifier fails', async () => {
      const { result, updateSettings } = setup();
      updateSettings.mockResolvedValueOnce(false);

      let outcome;
      await act(async () => {
        outcome = await result.current.pairExistingIdentifier('ethan#1234');
      });

      expect(outcome).toEqual({ ok: false, message: 'Failed to save sync identifier' });
    });
  });

  describe('forgetIdentifier', () => {
    it('clears the identifier/timestamps and resets status to never-synced', async () => {
      const { result, updateSettings } = setup({ syncIdentifier: 'ethan#1234', lastPushedAt: Date.now(), lastPulledAt: Date.now() });
      await waitFor(() => expect(result.current.status).not.toBe('unknown')); // let the mount-time status refresh settle first

      await act(async () => {
        await result.current.forgetIdentifier();
      });

      expect(updateSettings).toHaveBeenCalledWith({ syncIdentifier: null, lastPushedAt: null, lastPulledAt: null });
      expect(result.current.status).toBe('never-synced');
    });
  });

  describe('push', () => {
    it('errors immediately when no identifier is set up', async () => {
      const { result } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.push();
      });

      expect(outcome).toEqual({ ok: false, reason: 'error', message: 'No sync identifier set up yet' });
      expect(mockedPush).not.toHaveBeenCalled();
    });

    it('refuses to push when the remote has data this device has not seen', async () => {
      const now = Date.now();
      mockedPull.mockResolvedValue({ teams: [], battles: [], savedAt: now + 10_000 });
      const { result } = setup({ syncIdentifier: 'ethan#1234', lastPushedAt: now, lastPulledAt: now });

      let outcome;
      await act(async () => {
        outcome = await result.current.push();
      });

      expect(outcome).toEqual({ ok: false, reason: 'needs-pull-first', remoteSavedAt: now + 10_000 });
      expect(mockedPush).not.toHaveBeenCalled();
    });

    it('force skips the remote-freshness check entirely', async () => {
      // Configured as if the remote is always newer, so a non-force push
      // would be refused with needs-pull-first (proven by the test above) -
      // force must succeed anyway, proving the check itself was never applied.
      mockedPull.mockResolvedValue({ teams: [], battles: [], savedAt: Date.now() + 999_999 });
      const { result, updateSettings } = setup({ syncIdentifier: 'ethan#1234' });

      let outcome;
      await act(async () => {
        outcome = await result.current.push({ force: true });
      });

      expect(outcome).toEqual({ ok: true });
      expect(mockedPush).toHaveBeenCalledTimes(1);
      expect(updateSettings).toHaveBeenCalledWith({ lastPushedAt: expect.any(Number) });
    });

    it('pushes the current teams/battles snapshot and records lastPushedAt', async () => {
      const { result, updateSettings, teamsState, battlesState } = setup({ syncIdentifier: 'ethan#1234' });

      let outcome;
      await act(async () => {
        outcome = await result.current.push();
      });

      expect(outcome).toEqual({ ok: true });
      expect(mockedPush).toHaveBeenCalledWith('ethan#1234', {
        teams: teamsState.teams,
        battles: battlesState.battles,
        savedAt: expect.any(Number),
      });
      expect(updateSettings).toHaveBeenCalledWith({ lastPushedAt: expect.any(Number) });
    });

    it('sets the error state and returns reason error when the push itself fails', async () => {
      mockedPush.mockRejectedValueOnce(new Error('push exploded'));
      const { result } = setup({ syncIdentifier: 'ethan#1234' });

      let outcome;
      await act(async () => {
        outcome = await result.current.push();
      });

      expect(outcome).toEqual({ ok: false, reason: 'error', message: 'push exploded' });
      expect(result.current.error).toBe('push exploded');
      expect(result.current.isBusy).toBe(false);
    });
  });

  describe('pull', () => {
    it('errors immediately when no identifier is set up', async () => {
      const { result } = setup();

      let outcome;
      await act(async () => {
        outcome = await result.current.pull();
      });

      expect(outcome).toEqual({ ok: false, reason: 'error', message: 'No sync identifier set up yet' });
    });

    it('refuses to pull when local data has changed since the last push', async () => {
      vi.mocked(window.electron.readTeamsDatabase).mockResolvedValue({ version: 1, teams: [], lastModified: 5000 });
      const { result } = setup({ syncIdentifier: 'ethan#1234', lastPushedAt: 1000 });

      let outcome;
      await act(async () => {
        outcome = await result.current.pull();
      });

      expect(outcome).toEqual({ ok: false, reason: 'needs-push-first', localModifiedAt: 5000 });
      expect(window.electron.writeTeamsDatabase).not.toHaveBeenCalled();
    });

    it('reports an error when the identifier has no data pushed yet', async () => {
      mockedPull.mockResolvedValueOnce(null);
      const { result } = setup({ syncIdentifier: 'ethan#1234' });

      let outcome;
      await act(async () => {
        outcome = await result.current.pull();
      });

      expect(outcome).toEqual({ ok: false, reason: 'error', message: 'No data found for this identifier yet' });
    });

    it('writes down the remote payload, refreshes teams/battles, and records lastPulledAt', async () => {
      const remoteTeam = makeTeam({ id: 'remote-team' });
      mockedPull.mockResolvedValueOnce({ teams: [remoteTeam], battles: [], savedAt: 42_000 });
      const { result, updateSettings, refreshTeams, refreshBattles } = setup({ syncIdentifier: 'ethan#1234' });

      let outcome;
      await act(async () => {
        outcome = await result.current.pull();
      });

      expect(outcome).toEqual({ ok: true });
      expect(window.electron.writeTeamsDatabase).toHaveBeenCalledWith(expect.objectContaining({ teams: [remoteTeam] }));
      expect(window.electron.writeBattlesDatabase).toHaveBeenCalledWith(expect.objectContaining({ battles: [] }));
      expect(refreshTeams).toHaveBeenCalled();
      expect(refreshBattles).toHaveBeenCalled();
      expect(updateSettings).toHaveBeenCalledWith({ lastPulledAt: 42_000 });
    });

    it('sets the error state and returns reason error when the pull itself fails', async () => {
      mockedPull.mockRejectedValueOnce(new Error('pull exploded'));
      const { result } = setup({ syncIdentifier: 'ethan#1234' });

      let outcome;
      await act(async () => {
        outcome = await result.current.pull();
      });

      expect(outcome).toEqual({ ok: false, reason: 'error', message: 'pull exploded' });
      expect(result.current.error).toBe('pull exploded');
      expect(result.current.isBusy).toBe(false);
    });
  });
});
