/**
 * VgcPasteCatalogModal.tsx - Sample Team Catalog (VGCPastes)
 * Browsable catalog of real tournament teams pulled from the public
 * VGCPastes Google Sheet (services/vgcPastes.ts), filtered to rows with a
 * confirmed real EV spread. Manually refreshed per regulation tab - no
 * automatic fetch, ever (see useVgcPastesCache.ts's header). Picking a row
 * hands its pokepast.es URL to ImportTeamModal.tsx via onPickPaste, which
 * reuses that modal's existing pokepaste-URL import path as-is - no
 * per-species parsing here (see TODO.md's VGCPastes Per-Species Real-Set
 * Extraction leg for that, separately scoped).
 */

import { useState } from 'react';
import type { RegulationLabel, VgcPasteTeamRow } from '../types/pokemon';
import type { UseVgcPastesCacheReturn } from '../hooks/useVgcPastesCache';
import Modal from './Modal';

interface VgcPasteCatalogModalProps {
  onClose: () => void;
  onPickPaste: (pokepasteUrl: string) => void;
  vgcPastesState: UseVgcPastesCacheReturn;
  defaultRegulation: RegulationLabel;
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

function TeamRow({ row, onPick }: { row: VgcPasteTeamRow; onPick: () => void }) {
  return (
    <div className="p-3 bg-zinc-700/50 border border-zinc-600 rounded-lg flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-zinc-100 font-medium truncate">{row.description || row.id}</p>
        <p className="text-xs text-zinc-400 mt-0.5">
          {[row.owner, row.tournament, row.rank, row.date].filter(Boolean).join(' · ')}
        </p>
        {row.species.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {row.species.map((species, i) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-300 rounded">
                {species}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onPick}
        className="shrink-0 px-3 py-1.5 bg-accent-gold hover:bg-accent-gold-deep text-zinc-900 rounded-lg transition-colors text-sm font-medium"
      >
        Import
      </button>
    </div>
  );
}

/**
 * Modal component for browsing/importing VGCPastes sample teams.
 */
export default function VgcPasteCatalogModal({
  onClose,
  onPickPaste,
  vgcPastesState,
  defaultRegulation,
}: VgcPasteCatalogModalProps) {
  const [activeTab, setActiveTab] = useState<RegulationLabel>(defaultRegulation);

  const rows = vgcPastesState.getRows(activeTab);
  const lastFetchedLabel = formatLastFetched(vgcPastesState.getLastFetchedAt(activeTab));

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

        {rows.map(row => (
          <TeamRow key={row.id} row={row} onPick={() => onPickPaste(row.pokepasteUrl)} />
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
