/**
 * github.ts - Update-Check + Release-Notes Fetch Against GitHub Releases
 * Read-only, once-per-launch check of this repo's latest published Release
 * against the running app version - see CLAUDE.md's external-fetch policy
 * for why this is the first automatic (non-user-triggered) external call
 * this app makes, unlike pokeapi.ts/pokepaste.ts's on-demand/user-initiated
 * fetches.
 *
 * fetchReleaseHistory() (added for the Release Notes Popup, see
 * docs/investigations/release-notes-popup-scope.md) reuses this same
 * GitHubRelease shape for the full published-release list, not just the
 * single latest one - both hooks/useUpdateCheck.ts and hooks/useReleaseNotes.ts
 * consume it.
 */

const REPO = 'vanwheels/ChoiceBuds';

export interface GitHubRelease {
  version: string;
  releaseUrl: string;
  body: string;
  publishedAt: string;
}

/** Raw shape of one entry from GitHub's /releases and /releases/latest endpoints - only the fields this app reads. */
interface RawGitHubRelease {
  tag_name: string;
  html_url: string;
  body: string | null;
  published_at: string;
}

function toGitHubRelease(data: RawGitHubRelease): GitHubRelease {
  return {
    version: data.tag_name.replace(/^v/, ''),
    releaseUrl: data.html_url,
    body: data.body ?? '',
    publishedAt: data.published_at,
  };
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
  return toGitHubRelease(data);
}

/**
 * Full published-release history, newest first (GitHub's own list-endpoint
 * order) - used by the Settings page's full history section and to find the
 * running version's own notes for the startup popup. Unauthenticated
 * /releases only returns published releases, never drafts, so no extra
 * filtering is needed for the draft-release workflow described in the root
 * CLAUDE.md. Returns [] rather than throwing when the repo has no published
 * releases yet, matching fetchLatestRelease()'s null-not-error handling.
 */
export async function fetchReleaseHistory(): Promise<GitHubRelease[]> {
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases`);

  if (!response.ok) {
    throw new Error(`GitHub release history fetch failed (${response.status})`);
  }

  const data = (await response.json()) as RawGitHubRelease[];
  return data.map(toGitHubRelease);
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
