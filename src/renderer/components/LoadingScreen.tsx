/**
 * LoadingScreen.tsx - First-Launch / Startup Progress Screen
 * Rendered by App.tsx instead of the tab content until useInitialSync
 * reports done. On first-ever launch this covers the real bulk sprite +
 * move/ability/learnset download (see useInitialSync.ts); on every launch
 * after that it just resolves immediately since nothing is left to sync.
 */

import type { SyncProgress } from '../hooks/useInitialSync';

interface LoadingScreenProps {
  progress: SyncProgress;
}

export default function LoadingScreen({ progress }: LoadingScreenProps) {
  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-900 text-zinc-100">
      <div className="w-full max-w-md flex flex-col gap-4 px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-accent-gold">ChoiceBuds</h1>
          <p className="text-sm text-zinc-400 mt-1">Setting up for offline use...</p>
        </div>

        <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
          <div
            className="h-full bg-accent-gold transition-all duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="text-center text-sm text-zinc-400">
          {progress.label}{progress.total > 1 ? ` (${progress.current}/${progress.total})` : '...'}
        </p>
      </div>
    </div>
  );
}
