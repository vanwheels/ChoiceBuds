/**
 * publicProfileRoute.ts - Public Profile URL Matching
 * Pure path-matching for the `/u/<username>` public profile route (Public
 * Profiles: Base Route, see TODO.md) - split out of web/main.tsx so the
 * match logic is unit-testable without mounting React. Only recognizes the
 * literal path segment; username validity (charset/length) is the sync
 * Worker's job (crypto.ts's isValidUsername) since this just needs to know
 * whether to render PublicProfilePage at all.
 */

export function matchPublicProfilePath(pathname: string): string | null {
  const match = pathname.match(/^\/u\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}
