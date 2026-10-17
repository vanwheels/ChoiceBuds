/**
 * releaseAssets.ts - Picks Installer Assets Off a GitHubRelease
 * Matches the real electron-builder artifact names (see package.json's
 * `build.nsis`/`build.portable`/`build.mac` config): the NSIS installer
 * (`ChoiceBuds-Setup-<version>.exe`) and portable build
 * (`ChoiceBuds-<version>.exe`) share the same extension and only differ by
 * the "Setup" substring, so order matters - the portable matcher must
 * exclude "Setup" explicitly rather than just checking the extension.
 */

import type { GitHubReleaseAsset } from '../services/github';

export interface PlatformDownload {
  /** The recommended download for this OS - NSIS installer on Windows, the .dmg on macOS. */
  installer: GitHubReleaseAsset | null;
  /** The alternate build - portable .exe on Windows, the .zip on macOS. */
  alternate: GitHubReleaseAsset | null;
}

export function getWindowsDownload(assets: GitHubReleaseAsset[]): PlatformDownload {
  return {
    installer:
      assets.find((asset) => asset.name.endsWith('.exe') && asset.name.includes('Setup')) ?? null,
    alternate:
      assets.find((asset) => asset.name.endsWith('.exe') && !asset.name.includes('Setup')) ?? null,
  };
}

export function getMacDownload(assets: GitHubReleaseAsset[]): PlatformDownload {
  return {
    installer: assets.find((asset) => asset.name.endsWith('.dmg')) ?? null,
    alternate: assets.find((asset) => asset.name.endsWith('.zip')) ?? null,
  };
}
