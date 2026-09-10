/**
 * useDebouncedWrite - shared trailing-edge debounce for a write-through
 * persistence effect. Extracted so useGameData.ts and useDatabase.ts can
 * share one implementation instead of duplicating the same setTimeout/
 * cleanup dance - see docs/investigations/app-lag-investigation.md for why
 * this exists: both hooks were persisting their entire cache object to
 * disk on every single mutation, which serializes into a long burst of
 * full-file writes whenever many mutations land close together (e.g.
 * useUsageSync.ts's TTL-expiry wave).
 *
 * Standard debounce-via-effect-cleanup idiom: every `value` change cancels
 * the previous pending write and reschedules, so a tight burst of state
 * updates collapses into one write per quiet window instead of one per
 * mutation.
 */

import { useEffect } from 'react';

export const CACHE_WRITE_DEBOUNCE_MS = 500;

export function useDebouncedWrite<T>(
  value: T | null,
  ready: boolean,
  writeFn: (value: T) => Promise<unknown>,
  errorMessage: string,
  delayMs: number = CACHE_WRITE_DEBOUNCE_MS
): void {
  useEffect(() => {
    if (!ready || value === null) return;
    const timeoutId = setTimeout(() => {
      writeFn(value).catch((err: unknown) => console.error(errorMessage, err));
    }, delayMs);
    return () => clearTimeout(timeoutId);
    // writeFn (window.electron.* bridge methods) is a stable reference from
    // the preload contextBridge and errorMessage is a literal at each call
    // site - only value/ready/delayMs changing should reschedule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, value, delayMs]);
}
