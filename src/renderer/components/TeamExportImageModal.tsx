/**
 * TeamExportImageModal.tsx - Shareable Team Poster Image Export
 * Renders a full build-sheet poster (sprite/item/ability/moves/nature/EVs
 * per Pokemon, mirroring PokemonCard.tsx's own layout) as a visible preview,
 * then rasterizes that exact DOM node via html-to-image on demand - the
 * preview IS the export, so there's no separate hidden-node bookkeeping.
 * Sibling to ExportTeamModal.tsx (which exports plain Showdown text); this
 * one produces a PNG instead, for sharing to Discord/tournament reports the
 * way Pikalytics/VGC Helper's team-image export does.
 */

import { useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import type { Team } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import { getRegulationTheme } from '../config/pokemonTheme';
import { toRegulationId } from '../utils/pokemonRules';
import TeamPosterTile from './TeamPosterTile';

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
  const [sheetMode, setSheetMode] = useState<'open' | 'closed'>('open');
  // Notes default off: free-form text of arbitrary length was breaking the poster's
  // fixed-width grid layout, so it's opt-in per export rather than always-on.
  const [showNotes, setShowNotes] = useState(false);
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
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-100">Export Team Image</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Poster controls - deliberately OUTSIDE posterRef so they never get rasterized
            into the exported image itself. */}
        <div className="px-6 pt-4 flex items-center gap-6 border-b border-gray-700 pb-4">
          <div className="flex items-center gap-2">
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

          {team.notes && (
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showNotes}
                onChange={(e) => setShowNotes(e.target.checked)}
                className="cursor-pointer"
              />
              Include notes
            </label>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex justify-center">
          {/* Fixed width (not just max-w) so every child - title row, roster grid, notes,
              footer - stretches to the exact same width via flex's default cross-axis
              stretch, rather than the box's own width drifting to whichever child happens
              to be widest (the roster grid used to implicitly set it, which broke down
              once notes needed to fit the same box too). Sized for 6 poster tiles in one
              row (matching a real Team Sheet, not a cramped 2-row grid). */}
          <div ref={posterRef} className="flex flex-col gap-4 p-6 bg-zinc-900 rounded-lg w-[960px]" style={{ backgroundColor: '#18181b' }}>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-zinc-100">{team.name}</h3>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded text-white ${regulationTheme.badgeBg}`}>
                {team.format}
              </span>
              {team.author && <span className="text-xs text-zinc-500">by {team.author}</span>}
            </div>

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

            {/* Notes moved below the roster grid (same rationale as TeamCard.tsx's expanded
                view) and only rendered when opted in, so a long note can't stretch the
                fixed-width poster grid above it or dominate the exported image. */}
            {showNotes && team.notes && (
              <p className="text-xs text-zinc-400 whitespace-pre-wrap border-l-2 border-zinc-700 pl-3 w-full">{team.notes}</p>
            )}

            <p className="text-[10px] text-zinc-600 text-right">Exported from ChoiceBuds</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-end gap-3">
          {error && <p className="text-xs text-red-400 mr-auto">{error}</p>}
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors">
            Close
          </button>
          <button
            onClick={handleDownload}
            disabled={isWorking}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Download
          </button>
          <button
            onClick={handleCopy}
            disabled={isWorking}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
