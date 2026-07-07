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
    <div className="flex h-screen items-center justify-center bg-gray-900 text-gray-100">
      <div className="w-full max-w-md flex flex-col gap-4 px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-400">ChoiceBuds</h1>
          <p className="text-sm text-gray-400 mt-1">Setting up for offline use...</p>
        </div>

        <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
          <div
            className="h-full bg-blue-600 transition-all duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="text-center text-sm text-gray-400">
          {progress.label}{progress.total > 1 ? ` (${progress.current}/${progress.total})` : '...'}
        </p>
      </div>
    </div>
  );
}
