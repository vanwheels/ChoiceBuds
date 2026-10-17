import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, waitFor, act } from '@testing-library/react';
import { emptyMergedPayload, setup } from './useSyncTestHelpers';

// Account lifecycle (status/signUp/logIn/logOut). syncNow lives in
// useSync.syncNow.test.ts and the debounced/interval/online triggers live in
// useSync.autoSync.test.ts - split out of one 514-line file, same fixtures
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

      expect(outcome).toEqual({
        ok: false,
        message: expect.stringContaining('at least 8 characters'),
      });
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

      expect(updateSettings).toHaveBeenCalledWith({
        syncUsername: null,
        syncToken: null,
        lastSyncedAt: null,
      });
      expect(result.current.status).toBe('signed-out');
    });
  });
});
