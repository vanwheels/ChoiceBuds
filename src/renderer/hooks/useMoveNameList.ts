/**
 * useMoveNameList Hook - Full Move Name List for Autocomplete
 * Powers the Battle Logger's opponent-move freeform input (see
 * MoveLogPopover.tsx) - fetched once lazily and cached module-level for the
 * rest of the session, same shape as useMegaSprite.ts. Not persisted to
 * disk (cheap, always fresh) - this is a suggestion list, not per-move
 * metadata, so it doesn't belong in the game-data-cache.json.
 *
 * Names are prettified for display (hyphen -> space, each word
 * capitalized) - this loses a little precision for moves whose real name
 * has a literal hyphen (e.g. "U-turn" renders as "U Turn"), but whatever's
 * picked still round-trips correctly through normalizeNameForAPI when
 * fetched (both a space and a hyphen become the same `-` in the slug), so
 * it always resolves to the right move.
 */

import { useState, useEffect } from 'react';
import { fetchAllMoveNames } from '../services/pokeapiService';

function formatMoveName(slug: string): string {
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

let cache: string[] | null = null;
let inflight: Promise<string[]> | null = null;

async function loadMoveNames(): Promise<string[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetchAllMoveNames()
      .then(names => {
        cache = names.map(formatMoveName);
        return cache;
      })
      .catch(() => []);
  }
  return inflight;
}

export function useMoveNameList(): string[] {
  const [names, setNames] = useState<string[]>(cache ?? []);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    loadMoveNames().then(result => { if (!cancelled) setNames(result); });
    return () => { cancelled = true; };
  }, []);

  return names;
}
