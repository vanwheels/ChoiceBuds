/**
 * GameDataResetSection.tsx - Manual Cache-Reset Escape Hatch
 * Cached species/move/item/ability/learnset data never auto-expires or
 * re-validates once synced (see utils/cacheExpiry.ts) - this is the
 * intentional trade-off for full offline capability, but it means a user
 * who suspects something's wrong (a stale/incorrect PokeAPI value) needs a
 * manual way out instead of waiting on a TTL. Wiping both caches re-arms
 * useInitialSync's sync pass (its re-entrancy guard is "a sync is currently
 * running," not "has ever run" - see useInitialSync.ts), so the app
 * re-downloads live right away, no restart needed - the LoadingScreen
 * reappears over whatever's on screen while it runs.
 */

import { useState } from 'react';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseGameDataReturn } from '../hooks/useGameData';

interface GameDataResetSectionProps {
  databaseState: UseDatabaseReturn;
  gameDataState: UseGameDataReturn;
}

export default function GameDataResetSection({ databaseState, gameDataState }: GameDataResetSectionProps) {
  const [didReset, setDidReset] = useState(false);

  const handleReset = async () => {
    await Promise.all([databaseState.clearCache(), gameDataState.clearCache()]);
    setDidReset(true);
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h2 className="text-sm font-semibold text-gray-200">Game Data</h2>
      <p className="mt-1 text-xs text-gray-400">
        Species, move, item, and ability data is downloaded once and kept
        offline permanently rather than periodically re-checked. If
        something looks wrong or out of date, clear it here to force a
        fresh download.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleReset}
          className="px-2 py-1 text-[11px] font-bold rounded bg-red-600 text-white hover:bg-red-500 transition-colors cursor-pointer"
        >
          Refresh Game Data
        </button>
        {didReset && (
          <p className="text-[11px] text-yellow-400">
            Cleared - re-downloading now.
          </p>
        )}
      </div>
    </div>
  );
}
