import { describe, it, expect } from 'vitest';
import { matchPublicProfilePath } from './publicProfileRoute';

describe('matchPublicProfilePath', () => {
  it('extracts the username from /u/<username>', () => {
    expect(matchPublicProfilePath('/u/ash_ketchum')).toBe('ash_ketchum');
  });

  it('tolerates a trailing slash', () => {
    expect(matchPublicProfilePath('/u/ash_ketchum/')).toBe('ash_ketchum');
  });

  it('decodes a URL-encoded username', () => {
    expect(matchPublicProfilePath('/u/ash%20ketchum')).toBe('ash ketchum');
  });

  it('returns null for the app root', () => {
    expect(matchPublicProfilePath('/')).toBeNull();
  });

  it('returns null for an unrelated path', () => {
    expect(matchPublicProfilePath('/download/')).toBeNull();
  });

  it('returns null for a nested path past the username segment', () => {
    expect(matchPublicProfilePath('/u/ash_ketchum/teams')).toBeNull();
  });

  it('returns null for /u/ with no username', () => {
    expect(matchPublicProfilePath('/u/')).toBeNull();
  });
});
