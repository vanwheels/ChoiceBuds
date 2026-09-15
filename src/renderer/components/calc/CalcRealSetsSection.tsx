/**
 * CalcRealSetsSection.tsx - "Real Sets Seen" (VGCPastes Per-Species Real-Set
 * Extraction: Calc Panel Real Sets UI, see TODO.md and
 * docs/investigations/vgcpastes-realset-extraction-scope.md for the scoping
 * session that shaped this). Deliberately a separate section from the
 * existing usage-ranked Item/Ability/Nature dropdowns and
 * CalcStatSpreadChips - those are independent per-axis ChampionsUsageEntry
 * rankings, while this renders whole move/item/ability/nature/EV bundles
 * actually observed together in real tournament pastes (services/
 * vgcRealSets.ts). Picking a bundle fills the whole panel at once via
 * realSetBundleToCalcUpdates (utils/calcTeamImport.ts), same one-click-loads-
 * everything shape as SavedSetPicker.tsx.
 *
 * Purely presentational - CalcPokemonPanel.tsx owns the actual extraction
 * trigger (fires alongside its existing usage auto-fill, on a real species
 * pick or an opponent-tray load) and the loading/entry/error state this
 * renders. `hasCatalogRows`/`onRefreshCatalog` cover the case a regulation's
 * VGCPastes catalog (useVgcPastesCache.ts) hasn't been manually refreshed
 * yet from the Teams tab - extraction has nothing to sample against until
 * then, so this offers the same Refresh action inline instead of just
 * silently showing nothing.
 */

import type { RegulationLabel, VgcRealSetBundle, VgcRealSetsEntry } from '../../types/pokemon';

interface CalcRealSetsSectionProps {
  species: string;
  regulation: RegulationLabel;
  hasCatalogRows: boolean;
  isCatalogRefreshing: boolean;
  onRefreshCatalog: () => void;
  entry: VgcRealSetsEntry | null;
  isLoading: boolean;
  error: string | null;
  onPickBundle: (bundle: VgcRealSetBundle) => void;
}

function formatEvs(bundle: VgcRealSetBundle): string {
  const { hp, attack, defense, specialAttack, specialDefense, speed } = bundle.evs;
  return [hp, attack, defense, specialAttack, specialDefense, speed].join('/');
}

export default function CalcRealSetsSection({
  species, regulation, hasCatalogRows, isCatalogRefreshing, onRefreshCatalog, entry, isLoading, error, onPickBundle,
}: CalcRealSetsSectionProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
        Real Sets Seen ({regulation})
      </label>

      {error && (
        <p className="text-[10px] text-red-300 bg-red-900/40 border border-red-800/60 rounded px-2 py-1">{error}</p>
      )}

      {!error && !hasCatalogRows && (
        <div className="flex items-center justify-between gap-2 px-2 py-1 rounded border border-zinc-700 bg-zinc-800/60">
          <span className="text-[10px] text-zinc-400">Sample Team Catalog not pulled for {regulation} yet.</span>
          <button
            type="button"
            onClick={onRefreshCatalog}
            disabled={isCatalogRefreshing}
            className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors cursor-pointer bg-zinc-700 text-zinc-200 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCatalogRefreshing ? 'Refreshing...' : 'Refresh Catalog'}
          </button>
        </div>
      )}

      {!error && hasCatalogRows && isLoading && (
        <p className="text-[10px] text-zinc-500 italic">Sampling real {species} sets from VGCPastes...</p>
      )}

      {!error && hasCatalogRows && !isLoading && entry && entry.bundles.length === 0 && (
        <p className="text-[10px] text-zinc-500 italic">No confirmed real sets found for {species} in {regulation} yet.</p>
      )}

      {!error && hasCatalogRows && !isLoading && entry && entry.bundles.length > 0 && (
        <div className="flex flex-col gap-1">
          {entry.bundles.map((bundle, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onPickBundle(bundle)}
              title="Click to fill this panel with this real set"
              className="text-left px-2 py-1 rounded border border-zinc-700 bg-zinc-800/60 hover:border-accent-gold hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-zinc-300 truncate">
                  {bundle.item || 'No Item'} · {bundle.ability || 'No Ability'} · {bundle.nature || 'Hardy'}
                </span>
                <span className="shrink-0 text-[10px] font-mono text-accent-gold">
                  {bundle.occurrences}/{entry.sampledTeamCount}
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 truncate">{bundle.moves.join(' / ')}</div>
              <div className="text-[10px] font-mono text-zinc-600">{formatEvs(bundle)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
