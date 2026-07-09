/**
 * github.ts - Update-Check Against GitHub Releases
 * Read-only, once-per-launch check of this repo's latest published Release
 * against the running app version - see CLAUDE.md's external-fetch policy
 * for why this is the first automatic (non-user-triggered) external call
 * this app makes, unlike pokeapi.ts/pokepaste.ts's on-demand/user-initiated
 * fetches.
 */

const REPO = 'vanwheels/ChoiceBuds';

export interface GitHubRelease {
  latestVersion: string;
  releaseUrl: string;
}

/** Returns null if the repo has no published Releases yet - not an error. */
export async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`GitHub release check failed (${response.status})`);
  }

  const data = await response.json();
  return {
    latestVersion: String(data.tag_name).replace(/^v/, ''),
    releaseUrl: data.html_url,
  };
}

/** Plain major.minor.patch numeric comparison - no semver dependency needed for this app's own version scheme. */
export function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  const length = Math.max(currentParts.length, latestParts.length);

  for (let i = 0; i < length; i++) {
    const currentValue = currentParts[i] ?? 0;
    const latestValue = latestParts[i] ?? 0;
    if (latestValue > currentValue) return true;
    if (latestValue < currentValue) return false;
  }

  return false;
}
