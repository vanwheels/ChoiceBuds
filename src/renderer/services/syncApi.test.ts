/**
 * syncApi.test.ts - covers fetchPublicProfile's response mapping (Public
 * Profiles: Base Route, see TODO.md). Mirrors github.test.ts's stubbed-
 * global-fetch approach - this module talks to the sync Worker directly,
 * not through window.electron.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPublicProfile } from './syncApi';

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

describe('fetchPublicProfile', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the display-case username when the account exists', async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, username: 'Ash_Ketchum' }),
    });

    expect(await fetchPublicProfile('ash_ketchum')).toEqual({ username: 'Ash_Ketchum' });
  });

  it('returns null when no account has that username (404)', async () => {
    mockFetchOnce({ ok: false, status: 404 });

    expect(await fetchPublicProfile('nobody')).toBeNull();
  });

  it('throws on any other non-ok response', async () => {
    mockFetchOnce({ ok: false, status: 500, json: async () => ({ error: 'Server error' }) });

    await expect(fetchPublicProfile('ash_ketchum')).rejects.toThrow('Server error');
  });
});
