/**
 * Sentinel "never expires" timestamp for cache entries that should persist
 * forever once synced (species, moves, items, abilities, learnsets) rather
 * than silently re-fetching on a TTL - see TODO.md's offline-support entry.
 * `Infinity` isn't JSON-serializable (round-trips as `null`), so this uses
 * the largest safe integer instead; every `expiresAt < Date.now()` check
 * already in the codebase keeps working unchanged against it.
 */
export const NEVER_EXPIRES = Number.MAX_SAFE_INTEGER;
