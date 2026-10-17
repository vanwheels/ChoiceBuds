/**
 * DownloadPage.tsx - Web Download/Landing Page
 * Mounted at choicebuds.vannyproductions.com/download/ (web/download/
 * main.tsx), separate from the signed-out Teams/Box web app at the domain
 * root (AppWeb.tsx) - the two are independent entry points sharing only
 * this component tree and the Tailwind theme (index.css), not any app state
 * or hooks. Fetches the latest GitHub Release the same way the desktop
 * app's update checker does (services/github.ts) and picks an
 * OS-appropriate installer via utils/detectPlatform.ts +
 * utils/releaseAssets.ts. GitHub Releases stays the actual file host; this
 * page never re-hosts or proxies the installers themselves.
 */

import { useEffect, useState } from 'react';
import {
  fetchLatestRelease,
  type GitHubRelease,
  type GitHubReleaseAsset,
} from '../services/github';
import { detectPlatform, type DetectedPlatform } from '../utils/detectPlatform';
import { getMacDownload, getWindowsDownload, type PlatformDownload } from '../utils/releaseAssets';

const PLATFORM_LABEL: Record<DetectedPlatform, string> = {
  windows: 'Windows',
  mac: 'macOS',
};

function getPlatformDownload(platform: DetectedPlatform, release: GitHubRelease): PlatformDownload {
  return platform === 'mac' ? getMacDownload(release.assets) : getWindowsDownload(release.assets);
}

function AssetLink({ asset, children }: { asset: GitHubReleaseAsset; children: React.ReactNode }) {
  return (
    <a
      href={asset.downloadUrl}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-gold px-6 py-3 text-base font-bold text-zinc-900 transition-colors hover:bg-accent-gold-deep"
    >
      {children}
    </a>
  );
}

export default function DownloadPage() {
  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [platform] = useState<DetectedPlatform>(() => detectPlatform(navigator.userAgent));

  useEffect(() => {
    fetchLatestRelease()
      .then((latest) => {
        if (!latest) {
          setLoadError(true);
          return;
        }
        setRelease(latest);
      })
      .catch(() => setLoadError(true));
  }, []);

  const otherPlatform: DetectedPlatform = platform === 'mac' ? 'windows' : 'mac';
  const detected = release ? getPlatformDownload(platform, release) : null;
  const other = release ? getPlatformDownload(otherPlatform, release) : null;

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-900 px-6 py-16 text-zinc-100">
      <img src="/mascot.png" alt="" className="h-20 w-20" />
      <h1 className="mt-6 text-3xl font-bold">ChoiceBuds</h1>
      <p className="mt-2 max-w-md text-center text-sm text-zinc-400">
        Import and manage Pokémon VGC teams from Showdown/Pokepaste export text. Free desktop app
        for Windows and macOS.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3">
        {loadError && (
          <p className="text-sm text-red-400">
            Couldn&apos;t reach GitHub to find the latest release.{' '}
            <a
              href="https://github.com/vanwheels/ChoiceBuds/releases/latest"
              className="underline hover:text-red-300"
            >
              View releases on GitHub
            </a>{' '}
            instead.
          </p>
        )}

        {!loadError && !release && (
          <p className="text-sm text-zinc-500">Checking for the latest release…</p>
        )}

        {detected?.installer && (
          <>
            <AssetLink asset={detected.installer}>
              Download for {PLATFORM_LABEL[platform]} ({release!.version})
            </AssetLink>
            {detected.alternate && (
              <a
                href={detected.alternate.downloadUrl}
                className="text-xs text-zinc-500 underline hover:text-zinc-300"
              >
                {platform === 'windows' ? 'Prefer the portable build?' : 'Prefer the .zip?'}
              </a>
            )}
          </>
        )}

        {release && !detected?.installer && (
          <p className="text-sm text-amber-400">
            No {PLATFORM_LABEL[platform]} build found in the latest release.
          </p>
        )}

        {other?.installer && (
          <a
            href={other.installer.downloadUrl}
            className="mt-4 text-sm text-zinc-400 underline hover:text-zinc-200"
          >
            Download for {PLATFORM_LABEL[otherPlatform]} instead
          </a>
        )}

        <a
          href="https://github.com/vanwheels/ChoiceBuds/releases"
          className="mt-1 text-xs text-zinc-600 underline hover:text-zinc-400"
        >
          All releases on GitHub
        </a>
      </div>

      <p className="mt-16 max-w-md text-center text-xs text-zinc-600">
        Don&apos;t want to install anything?{' '}
        <a href="/" className="underline hover:text-zinc-400">
          Try ChoiceBuds in your browser
        </a>{' '}
        instead - no download, no account required.
      </p>
    </div>
  );
}
