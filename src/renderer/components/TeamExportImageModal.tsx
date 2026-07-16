/**
 * TeamExportImageModal.tsx - Shareable Team Poster Image Export
 * Renders a full build-sheet poster (sprite/item/ability/moves/nature/EVs
 * per Pokemon, mirroring PokemonCard.tsx's own layout) as a visible preview,
 * then rasterizes that exact DOM node via html-to-image on demand - the
 * preview IS the export, so there's no separate hidden-node bookkeeping.
 * Sibling to ExportTeamModal.tsx (which exports plain Showdown text); this
 * one produces a PNG instead, for sharing to Discord/tournament reports the
 * way Pikalytics/VGC Helper's team-image export does.
 *
 * Two view modes (not "team poster + optional inline notes" - that earlier
 * design cramped a writeup of any real length into leftover grid space):
 * "Team" is the full per-Pokemon detail grid; "Notes" swaps the grid for a
 * compact strip of sprites (TeamPosterMiniSprite, each with its held item as
 * a corner badge) and hands the rest of the poster to the strategy writeup.
 */

import { useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import type { Team } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import { getRegulationTheme } from '../config/pokemonTheme';
import { toRegulationId } from '../utils/pokemonRules';
import TeamPosterTile from './TeamPosterTile';
import TeamPosterMiniSprite from './TeamPosterMiniSprite';

interface TeamExportImageModalProps {
  team: Team;
  gameDataState: UseGameDataReturn;
  spriteCacheState: UseSpriteCacheReturn;
  onClose: () => void;
}

const COPY_CONFIRMATION_MS = 2000;

async function renderPosterBlob(node: HTMLElement): Promise<Blob> {
  // pixelRatio 2 for a crisp export - the on-screen preview stays 1x.
  const blob = await toBlob(node, { pixelRatio: 2, backgroundColor: '#18181b', cacheBust: true });
  if (!blob) throw new Error('Failed to render team image');
  return blob;
}

export default function TeamExportImageModal({ team, gameDataState, spriteCacheState, onClose }: TeamExportImageModalProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  // Open Team Sheet mirrors what real VGC Open Team Sheets reveal (species/item/
  // ability/moves/Tera, never Nature+EVs); Closed hides Stat Alignment too, for a
  // teammate-facing or pre-tournament-safe share. Defaults to Open since that
  // matches this modal's pre-existing behavior (nothing was ever hidden before).
  // Only meaningful in "team" view mode - Stat Alignment isn't shown in "notes" mode.
  const [sheetMode, setSheetMode] = useState<'open' | 'closed'>('open');
  const [viewMode, setViewMode] = useState<'team' | 'notes'>('team');
  const regulationTheme = getRegulationTheme(toRegulationId(team.format));

  const handleCopy = async () => {
    if (!posterRef.current) return;
    setIsWorking(true);
    setError(null);
    try {
      const blob = await renderPosterBlob(posterRef.current);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPY_CONFIRMATION_MS);
    } catch (err) {
      console.error('Error exporting team image:', err);
      setError('Failed to copy image - try Download instead.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleDownload = async () => {
    if (!posterRef.current) return;
    setIsWorking(true);
    setError(null);
    try {
      const blob = await renderPosterBlob(posterRef.current);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${team.name.replace(/[^a-z0-9]+/gi, '-')}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting team image:', err);
      setError('Failed to download image.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Single consolidated top bar - title, poster controls, and export actions all in
            one row (deliberately OUTSIDE posterRef so none of it gets rasterized into the
            exported image). The standalone "Close" button was dropped - the X here already
            does that. */}
        <div className="px-6 py-3 border-b border-gray-700 flex items-center gap-5 flex-wrap">
          <h2 className="text-lg font-bold text-gray-100 shrink-0">Export Team Image</h2>

          {team.notes && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-gray-400">View:</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-600">
                <button
                  onClick={() => setViewMode('team')}
                  title="Full per-Pokemon detail grid"
                  className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === 'team' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Team
                </button>
                <button
                  onClick={() => setViewMode('notes')}
                  title="Compact sprite strip + the full strategy writeup"
                  className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === 'notes' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Notes
                </button>
              </div>
            </div>
          )}

          {viewMode === 'team' && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-gray-400">Team Sheet:</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-600">
                <button
                  onClick={() => setSheetMode('open')}
                  title="Shows species, item, ability, moves, and Stat Alignment (Nature + EVs)"
                  className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    sheetMode === 'open' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => setSheetMode('closed')}
                  title="Hides Stat Alignment (Nature + EVs) - matches a Closed Team Sheet"
                  className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    sheetMode === 'closed' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Closed
                </button>
              </div>
            </div>
          )}

          <div className="flex-1" />

          {error && <p className="text-xs text-red-400 shrink-0">{error}</p>}

          <button
            onClick={handleDownload}
            disabled={isWorking}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            Download
          </button>
          <button
            onClick={handleCopy}
            disabled={isWorking}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* items-start (not the flex row default of align-items:stretch) so the poster box
            below always sizes to its own content, however tall that turns out to be - a
            long Notes-mode writeup just makes the box taller, with this wrapper's own
            overflow-y-auto handling scroll if it exceeds the visible area. The previous
            default (stretch) rendered the box's background/border at the wrapper's height
            while overflowing content rendered past it with no background behind it. */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start">
          {/* w-full (not a fixed px width) so every child stretches to the same width, bounded
              strictly by this modal's own max-w-6xl/padding - can't overflow by construction,
              and uses whatever width is actually available (bigger tiles, less truncation). */}
          <div ref={posterRef} className="flex flex-col gap-4 p-6 bg-zinc-900 rounded-lg w-full" style={{ backgroundColor: '#18181b' }}>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-zinc-100">{team.name}</h3>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded text-white ${regulationTheme.badgeBg}`}>
                {team.format}
              </span>
              {team.author && <span className="text-xs text-zinc-500">by {team.author}</span>}
            </div>

            {viewMode === 'team' ? (
              <div className="grid grid-cols-6 gap-3">
                {team.pokemon.map((pokemon, idx) => (
                  <TeamPosterTile
                    key={idx}
                    pokemon={pokemon}
                    gameDataState={gameDataState}
                    spriteCacheState={spriteCacheState}
                    showStatAlignment={sheetMode === 'open'}
                  />
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 flex-wrap">
                  {team.pokemon.map((pokemon, idx) => (
                    <TeamPosterMiniSprite key={idx} pokemon={pokemon} gameDataState={gameDataState} spriteCacheState={spriteCacheState} />
                  ))}
                </div>
                {team.notes && (
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap border-l-2 border-zinc-700 pl-4 w-full">{team.notes}</p>
                )}
              </>
            )}

            <p className="text-[10px] text-zinc-600 text-right">Exported from ChoiceBuds</p>
          </div>
        </div>
      </div>
    </div>
  );
}
