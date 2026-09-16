/**
 * VgcPasteCatalogModal.tsx - Sample Team Catalog (VGCPastes)
 * Browsable catalog of real tournament teams pulled from the public
 * VGCPastes Google Sheet (services/vgcPastes.ts), filtered to rows with a
 * confirmed real EV spread. Manually refreshed per regulation tab - no
 * automatic fetch, ever (see useVgcPastesCache.ts's header). Picking a row
 * hands the whole row to ImportTeamModal.tsx via onPickPaste (not just its
 * pokepast.es URL) - the modal reuses its existing pokepaste-URL import path
 * to fetch/parse the paste itself, but prefers the row's own
 * description/owner fields over the paste's own title/author for Team
 * Name/Author (see ImportTeamModal.tsx's applyPokepasteData), since the
 * paste's title carries a rental-code suffix and its author is always the
 * literal string "VGCPastes" (VGCPastes republishes every paste under its
 * own account) rather than the real player. No per-species parsing here
 * (see TODO.md's VGCPastes Per-Species Real-Set Extraction leg for that,
 * separately scoped). Row rendering itself
 * (name/author/sprites/expand-to-preview) lives in VgcPasteCatalogRow.tsx -
 * see that file's header for the Row Display Rework Leg 2 details.
 *
 * Search/filter (Search/Filter Leg 1, see TODO.md) - a single text box
 * matched case-insensitively against each row's species list/owner/
 * description, client-side over the active tab's already-cached rows (no
 * refetch). Flagged as a fast-follow during the original Leg 1 rather than
 * built speculatively, once a 200+-row regulation tab made a plain
 * scrollable list unwieldy.
 */

import { useMemo, useState } from 'react';
import type { RegulationLabel, VgcPasteTeamRow } from '../types/pokemon';
import type { UseVgcPastesCacheReturn } from '../hooks/useVgcPastesCache';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import Modal from './Modal';
import VgcPasteCatalogRow from './VgcPasteCatalogRow';

interface VgcPasteCatalogModalProps {
  onClose: () => void;
  onPickPaste: (row: VgcPasteTeamRow) => void;
  vgcPastesState: UseVgcPastesCacheReturn;
  defaultRegulation: RegulationLabel;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
}

const REGULATIONS: RegulationLabel[] = ['Reg M-A', 'Reg M-B', 'Reg M-C'];

function formatLastFetched(timestamp: number | null): string | null {
  if (!timestamp) return null;
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `Last pulled ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Last pulled ${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `Last pulled ${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * Modal component for browsing/importing VGCPastes sample teams.
 */
export default function VgcPasteCatalogModal({
  onClose,
  onPickPaste,
  vgcPastesState,
  defaultRegulation,
  speciesRosterState,
  spriteCacheState,
}: VgcPasteCatalogModalProps) {
  const [activeTab, setActiveTab] = useState<RegulationLabel>(defaultRegulation);
  const [searchQuery, setSearchQuery] = useState('');

  const rows = vgcPastesState.getRows(activeTab);
  const lastFetchedLabel = formatLastFetched(vgcPastesState.getLastFetchedAt(activeTab));

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(row => {
      const haystack = [row.owner, row.description, ...row.species].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, searchQuery]);

  return (
    <Modal panelClassName="max-w-2xl max-h-[85vh]">
      {/* Modal Header */}
      <div className="px-6 py-4 border-b border-zinc-700 flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100">Browse Sample Teams</h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Regulation Tabs + Refresh */}
      <div className="px-6 pt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {REGULATIONS.map(regulation => (
            <button
              key={regulation}
              onClick={() => setActiveTab(regulation)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === regulation
                  ? 'bg-accent-gold text-zinc-900'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              {regulation}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          {lastFetchedLabel && <span>{lastFetchedLabel}</span>}
          <button
            onClick={() => vgcPastesState.refresh(activeTab)}
            disabled={vgcPastesState.isRefreshing}
            className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {vgcPastesState.isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 pt-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by species, owner, or description..."
          className="w-full px-3 py-2 text-sm text-white bg-zinc-700 border border-zinc-600 rounded-lg outline-none focus:border-accent-gold placeholder:text-zinc-500"
        />
      </div>

      {/* Modal Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {vgcPastesState.error && (
          <div className="p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg text-red-200 text-sm">
            {vgcPastesState.error}
          </div>
        )}

        {rows.length === 0 && !vgcPastesState.error && (
          <p className="text-sm text-zinc-400 text-center py-8">
            {lastFetchedLabel
              ? `No sample teams with a confirmed EV spread found for ${activeTab} yet.`
              : `No sample teams loaded yet - click Refresh to pull the latest ${activeTab} teams from VGCPastes.`}
          </p>
        )}

        {rows.length > 0 && filteredRows.length === 0 && (
          <p className="text-sm text-zinc-400 text-center py-8">
            No sample teams match "{searchQuery}".
          </p>
        )}

        {filteredRows.map(row => (
          <VgcPasteCatalogRow
            key={row.id}
            row={row}
            onPick={() => onPickPaste(row)}
            roster={speciesRosterState.roster}
            spriteCacheState={spriteCacheState}
          />
        ))}
      </div>

      {/* Modal Footer */}
      <div className="px-6 py-4 border-t border-zinc-700 flex items-center justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
