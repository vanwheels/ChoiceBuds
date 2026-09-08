/**
 * github.test.ts - covers fetchLatestRelease/fetchReleaseHistory's response
 * mapping and isNewerVersion's comparison logic. No existing precedent in
 * this codebase for mocking global fetch directly (every other network
 * service test mocks window.electron instead) - stubbing globalThis.fetch
 * per-test is the simplest fit here since this module talks to
 * api.github.com directly, not through the IPC bridge.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchLatestRelease, fetchReleaseHistory, isNewerVersion } from './github';

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

const RAW_RELEASE = {
  tag_name: 'v1.2.3',
  html_url: 'https://github.com/vanwheels/ChoiceBuds/releases/tag/v1.2.3',
  body: '## Added\n- Thing',
  published_at: '2026-07-01T00:00:00Z',
};

describe('fetchLatestRelease', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps a published release, stripping the tag_name leading "v"', async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => RAW_RELEASE });

    const release = await fetchLatestRelease();

    expect(release).toEqual({
      version: '1.2.3',
      releaseUrl: RAW_RELEASE.html_url,
      body: RAW_RELEASE.body,
      publishedAt: RAW_RELEASE.published_at,
    });
  });

  it('returns null when the repo has no published releases (404)', async () => {
    mockFetchOnce({ ok: false, status: 404 });

    const release = await fetchLatestRelease();

    expect(release).toBeNull();
  });

  it('throws on any other non-ok response', async () => {
    mockFetchOnce({ ok: false, status: 500 });

    await expect(fetchLatestRelease()).rejects.toThrow('GitHub release check failed (500)');
  });

  it('defaults body to an empty string when the release has none', async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ({ ...RAW_RELEASE, body: null }) });

    const release = await fetchLatestRelease();

    expect(release?.body).toBe('');
  });
});

describe('fetchReleaseHistory', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps every entry in the list response', async () => {
    const second = { ...RAW_RELEASE, tag_name: 'v1.2.2', html_url: 'https://example.com/r2' };
    mockFetchOnce({ ok: true, status: 200, json: async () => [RAW_RELEASE, second] });

    const history = await fetchReleaseHistory();

    expect(history).toEqual([
      { version: '1.2.3', releaseUrl: RAW_RELEASE.html_url, body: RAW_RELEASE.body, publishedAt: RAW_RELEASE.published_at },
      { version: '1.2.2', releaseUrl: second.html_url, body: second.body, publishedAt: second.published_at },
    ]);
  });

  it('returns [] when the repo has no published releases', async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => [] });

    expect(await fetchReleaseHistory()).toEqual([]);
  });

  it('throws on a non-ok response', async () => {
    mockFetchOnce({ ok: false, status: 500 });

    await expect(fetchReleaseHistory()).rejects.toThrow('GitHub release history fetch failed (500)');
  });
});

describe('isNewerVersion', () => {
  it('reports true when latest has a higher patch/minor/major', () => {
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(true);
    expect(isNewerVersion('1.0.0', '1.1.0')).toBe(true);
    expect(isNewerVersion('1.0.0', '2.0.0')).toBe(true);
  });

  it('reports false when equal or latest is behind', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(false);
  });

  it('treats missing trailing segments as 0', () => {
    expect(isNewerVersion('1.0', '1.0.1')).toBe(true);
    expect(isNewerVersion('1.0.0', '1.0')).toBe(false);
  });
});
