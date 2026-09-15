/**
 * VgcPasteCatalogRow.tsx - one row within VgcPasteCatalogModal.tsx's Sample
 * Team Catalog list (VGCPastes Sample Team Catalog: Row Display Rework Leg
 * 2, see TODO.md). Reworked from the original plain description/owner/
 * species-text-chip layout to match TeamCard.tsx's own visual language for a
 * user's own teams - name, author, 6 species sprites - plus a per-row expand
 * toggle that lazily fetches and previews the pokepaste's full moves/EV
 * spreads before committing to Import.
 *
 * Expand fetch is deliberately lazy (only on click, decided 2026-09-14) -
 * not eager per row when a regulation tab loads. A tab can hold 200+ rows,
 * and eager would mean bulk-fetching pokepast.es on every tab open; lazy
 * matches this project's existing pokepast.es-read norm (CLAUDE.md's
 * Pokepaste exception is scoped to a single user-triggered fetch at a time)
 * and the VGCPastes bulk-fetch exception's own "never parallel-blasted"
 * caution. The fetched/parsed result is cached in local state per row so
 * collapsing and re-expanding doesn't re-fetch.
 *
 * Sprites are looked up by matching the sheet's plain species-name text
 * against the already-loaded full roster (speciesRosterState) rather than
 * fetching per-species PokeAPI data here - the sheet's text doesn't always
 * match this app's own display-name spelling exactly (e.g. spacing/hyphen
 * differences on multi-word forms), so matching is normalized (lowercased,
 * non-alphanumeric stripped) on both sides. A row whose species text doesn't
 * match anything in the roster just renders an empty slot, same as TeamCard
 * renders an empty roster slot - not worth blocking the row display on.
 */

import { useState } from 'react';
import type { ShowdownPokemon, SpeciesRosterEntry, VgcPasteTeamRow } from '../types/pokemon';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import { extractPokepasteId, fetchPokepaste } from '../services/pokepaste';
import { parseShowdownText } from '../services/parser';
import { findRosterEntry, formatEvs } from '../utils/vgcPasteRowDisplay';

interface VgcPasteCatalogRowProps {
  row: VgcPasteTeamRow;
  onPick: () => void;
  roster: SpeciesRosterEntry[];
  spriteCacheState: UseSpriteCacheReturn;
}

export default function VgcPasteCatalogRow({ row, onPick, roster, spriteCacheState }: VgcPasteCatalogRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewPokemon, setPreviewPokemon] = useState<ShowdownPokemon[] | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handleToggleExpand = async () => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (!next || previewPokemon !== null || isLoadingPreview) return;

    const pasteId = extractPokepasteId(row.pokepasteUrl);
    if (!pasteId) {
      setPreviewError('Could not read this row\'s Pokepaste link.');
      return;
    }

    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      const data = await fetchPokepaste(pasteId);
      const result = parseShowdownText(data.paste);
      setPreviewPokemon(result.pokemon);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to load preview.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <div className="bg-zinc-700/50 border border-zinc-600 rounded-lg overflow-hidden">
      <div className="p-3 flex items-center justify-between gap-4">
        <div className="min-w-0 shrink-0 max-w-[160px]">
          <p className="text-zinc-100 font-medium truncate">{row.description || row.id}</p>
          <p className="text-xs text-zinc-400 truncate">{row.owner || 'Unknown author'}</p>
        </div>

        <div className="flex-1 flex items-center justify-center gap-1.5">
          {Array.from({ length: 6 }, (_, idx) => row.species[idx]).map((species, idx) => {
            const entry = species ? findRosterEntry(species, roster) : undefined;
            if (!entry) return <div key={idx} className="w-10 h-10 shrink-0" />;
            return (
              <img
                key={idx}
                src={spriteCacheState.resolveSprite(entry.spriteUrl)}
                alt={species}
                title={species}
                className="w-10 h-10 object-contain [image-rendering:pixelated] shrink-0"
              />
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToggleExpand}
            title={isExpanded ? 'Hide preview' : 'Preview moves/EVs'}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-600 transition-colors ${
              isExpanded ? 'bg-zinc-600 text-zinc-200' : ''
            }`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <button
            onClick={onPick}
            className="px-3 py-1.5 bg-accent-gold hover:bg-accent-gold-deep text-zinc-900 rounded-lg transition-colors text-sm font-medium"
          >
            Import
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-zinc-600/60 pt-3">
          {isLoadingPreview && <p className="text-xs text-zinc-400">Loading preview...</p>}
          {previewError && <p className="text-xs text-red-300">{previewError}</p>}
          {previewPokemon && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {previewPokemon.map((p, idx) => (
                <div key={idx} className="text-xs">
                  <p className="font-semibold text-zinc-100 truncate">
                    {p.species}{p.item ? ` @ ${p.item}` : ''}
                  </p>
                  <p className="text-zinc-400 truncate">
                    {[p.ability, p.nature && `${p.nature} Nature`].filter(Boolean).join(' · ') || ' '}
                  </p>
                  <p className="text-zinc-400">{formatEvs(p.evs)}</p>
                  <p className="text-zinc-500 truncate">{p.moves.join(' / ') || 'No moves'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
