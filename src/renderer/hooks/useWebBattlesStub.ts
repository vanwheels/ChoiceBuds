/**
 * useWebBattlesStub Hook - Placeholder Battles State for Web's useSync Call
 * useSync() takes a UseBattlesReturn (see useSync.ts) because battles are one
 * of the three synced collections, but Battle Logger has no web UI yet and
 * useBattles.ts itself isn't ported to the storage adapter (see AppWeb.tsx's
 * header comment) - there's nothing on web to read battles from or write them
 * to. This stub always reports zero battles/tombstones so a web push never
 * sends a tombstone that could delete a desktop user's real battle data (the
 * Worker's merge is safe against an empty incoming array either way - see
 * worker/src/merge.ts - but sending nothing is clearer than relying on that),
 * and applySyncedState no-ops rather than persisting anywhere, since a
 * pulled-down battle has nowhere to live on this platform yet.
 */

import { useCallback } from 'react';
import type { Battle } from '../types/pokemon';
import type { UseBattlesReturn } from './useBattles';

export function useWebBattlesStub(): UseBattlesReturn {
  const notSupported = useCallback(async () => false, []);
  const applySyncedState = useCallback(async (_records: Battle[]) => true, []);
  const getBattleById = useCallback((_battleId: string) => undefined, []);
  const refreshBattles = useCallback(async () => {}, []);

  return {
    battles: [],
    isLoading: false,
    error: null,
    tombstones: [],
    addBattle: notSupported,
    updateBattle: notSupported,
    deleteBattle: notSupported,
    refreshBattles,
    getBattleById,
    applySyncedState,
  };
}
