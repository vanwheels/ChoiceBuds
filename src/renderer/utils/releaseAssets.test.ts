import { describe, expect, it } from 'vitest';
import { getMacDownload, getWindowsDownload } from './releaseAssets';
import type { GitHubReleaseAsset } from '../services/github';

// Mirrors the real asset list electron-builder attaches to a release (see
// package.json's build config) - including the blockmap/yml files that
// should never be picked.
const assets: GitHubReleaseAsset[] = [
  { name: 'ChoiceBuds-0.12.1-universal-mac.zip', downloadUrl: 'https://example.com/mac.zip' },
  {
    name: 'ChoiceBuds-0.12.1-universal-mac.zip.blockmap',
    downloadUrl: 'https://example.com/mac.zip.blockmap',
  },
  { name: 'ChoiceBuds-0.12.1-universal.dmg', downloadUrl: 'https://example.com/mac.dmg' },
  {
    name: 'ChoiceBuds-0.12.1-universal.dmg.blockmap',
    downloadUrl: 'https://example.com/mac.dmg.blockmap',
  },
  { name: 'ChoiceBuds-0.12.1.exe', downloadUrl: 'https://example.com/portable.exe' },
  { name: 'ChoiceBuds-Setup-0.12.1.exe', downloadUrl: 'https://example.com/setup.exe' },
  {
    name: 'ChoiceBuds-Setup-0.12.1.exe.blockmap',
    downloadUrl: 'https://example.com/setup.exe.blockmap',
  },
  { name: 'latest-mac.yml', downloadUrl: 'https://example.com/latest-mac.yml' },
  { name: 'latest.yml', downloadUrl: 'https://example.com/latest.yml' },
];

describe('getWindowsDownload', () => {
  it('picks the NSIS installer as the installer and the portable build as the alternate', () => {
    expect(getWindowsDownload(assets)).toEqual({
      installer: {
        name: 'ChoiceBuds-Setup-0.12.1.exe',
        downloadUrl: 'https://example.com/setup.exe',
      },
      alternate: { name: 'ChoiceBuds-0.12.1.exe', downloadUrl: 'https://example.com/portable.exe' },
    });
  });

  it('returns nulls when no Windows assets are present', () => {
    expect(getWindowsDownload([])).toEqual({ installer: null, alternate: null });
  });
});

describe('getMacDownload', () => {
  it('picks the dmg as the installer and the zip as the alternate', () => {
    expect(getMacDownload(assets)).toEqual({
      installer: {
        name: 'ChoiceBuds-0.12.1-universal.dmg',
        downloadUrl: 'https://example.com/mac.dmg',
      },
      alternate: {
        name: 'ChoiceBuds-0.12.1-universal-mac.zip',
        downloadUrl: 'https://example.com/mac.zip',
      },
    });
  });

  it('returns nulls when no macOS assets are present', () => {
    expect(getMacDownload([])).toEqual({ installer: null, alternate: null });
  });
});
