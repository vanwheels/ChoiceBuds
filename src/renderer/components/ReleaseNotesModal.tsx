/**
 * ReleaseNotesModal.tsx - "What's New" Startup Popup
 * Mounted conditionally in App.tsx (same tier as the other top-level hooks)
 * whenever useReleaseNotes.ts's showPopup is true - i.e. the running version
 * doesn't match the last version the user has dismissed this popup for, and
 * this isn't a fresh install (see that hook's header comment for the
 * fresh-install-skip case). Renders the current version's own GitHub Release
 * body via ReleaseNotesMarkdown - if the history fetch hasn't resolved yet,
 * or the running version has no matching published Release (e.g. an
 * in-progress build ahead of its own release being published), it shows a
 * minimal fallback rather than blocking the dismiss action on that fetch.
 */

import type { UseReleaseNotesReturn } from '../hooks/useReleaseNotes';
import { CURRENT_APP_VERSION } from '../utils/appVersion';
import Modal from './Modal';
import ReleaseNotesMarkdown from './ReleaseNotesMarkdown';

interface ReleaseNotesModalProps {
  releaseNotesState: UseReleaseNotesReturn;
}

export default function ReleaseNotesModal({ releaseNotesState }: ReleaseNotesModalProps) {
  const { isLoading, currentReleaseNotes, markAsSeen } = releaseNotesState;

  return (
    <Modal panelClassName="max-w-lg max-h-[80vh]">
      <div className="px-6 py-4 border-b border-zinc-700 flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100">What's New in {CURRENT_APP_VERSION}</h2>
        <button
          onClick={markAsSeen}
          className="text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && !currentReleaseNotes && (
          <p className="text-xs text-zinc-500">Loading release notes...</p>
        )}
        {!isLoading && !currentReleaseNotes && (
          <p className="text-xs text-zinc-500">No release notes found for this version.</p>
        )}
        {currentReleaseNotes && <ReleaseNotesMarkdown body={currentReleaseNotes.body} />}
      </div>

      <div className="px-6 py-4 border-t border-zinc-700 flex justify-end">
        <button
          onClick={markAsSeen}
          className="px-3 py-1.5 text-xs font-bold rounded bg-accent-gold text-zinc-900 hover:bg-accent-gold-deep transition-colors cursor-pointer"
        >
          Got it
        </button>
      </div>
    </Modal>
  );
}
