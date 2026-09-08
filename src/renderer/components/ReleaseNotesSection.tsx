/**
 * ReleaseNotesSection.tsx - Full Release History
 * Mirrors UpdateCheckSection.tsx's shape/states (loading/error/no-releases) -
 * the fetch itself runs once in useReleaseNotes.ts (shared with
 * ReleaseNotesModal.tsx's startup popup, not refetched per consumer), this
 * only renders whatever it found. Each past release's notes are always
 * visible (not collapsed behind an expand click) inside one scrollable list,
 * since the scope doc didn't call for per-entry collapse/expand state.
 */

import type { UseReleaseNotesReturn } from '../hooks/useReleaseNotes';
import ReleaseNotesMarkdown from './ReleaseNotesMarkdown';

interface ReleaseNotesSectionProps {
  releaseNotesState: UseReleaseNotesReturn;
}

export default function ReleaseNotesSection({ releaseNotesState }: ReleaseNotesSectionProps) {
  const { history, isLoading, error } = releaseNotesState;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Release Notes</h2>
      <p className="mt-1 text-xs text-zinc-400">Full history of published releases, newest first.</p>

      <div className="mt-3">
        {isLoading && <p className="text-xs text-zinc-500">Loading release history...</p>}
        {!isLoading && error && (
          <p className="text-xs text-red-400">Couldn't load release history - check your connection.</p>
        )}
        {!isLoading && !error && history.length === 0 && (
          <p className="text-xs text-zinc-500">No releases published yet.</p>
        )}
        {!isLoading && !error && history.length > 0 && (
          <div className="max-h-96 overflow-y-auto divide-y divide-zinc-700 rounded border border-zinc-700 bg-zinc-900/40">
            {history.map(release => (
              <div key={release.version} className="p-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-zinc-100">{release.version}</span>
                  {release.publishedAt && (
                    <span className="text-[11px] text-zinc-500">
                      {new Date(release.publishedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <ReleaseNotesMarkdown body={release.body} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
