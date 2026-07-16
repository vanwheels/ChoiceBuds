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

import { useEffect, useRef, useState } from 'react';
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
// Matches Tailwind's text-xs line-height (0.75rem font / 1rem line-height = 16px at the
// default 16px root font size) - the notes paragraph below is styled text-xs specifically
// so this stays accurate for the line-clamp math.
const NOTES_LINE_HEIGHT_PX = 16;

/**
 * How many lines of notes text currently fit in `containerRef`'s own box, recomputed via
 * ResizeObserver whenever that box's height changes (window resize, toggling the roster
 * grid's height via Open/Closed, etc.) - this is what makes the clamp "adjustable as the
 * window expands" rather than a fixed line count. containerRef is a flex-1 child of the
 * poster's flex-col layout, so its height is always exactly "whatever's left" after the
 * title row/roster grid/footer take their own space.
 */
function useLinesThatFit(containerRef: React.RefObject<HTMLDivElement | null>): number {
  const [maxLines, setMaxLines] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const recompute = () => setMaxLines(Math.max(1, Math.floor(el.clientHeight / NOTES_LINE_HEIGHT_PX)));
    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  return maxLines;
}

async function renderPosterBlob(node: HTMLElement): Promise<Blob> {
  // pixelRatio 2 for a crisp export - the on-screen preview stays 1x.
  const blob = await toBlob(node, { pixelRatio: 2, backgroundColor: '#18181b', cacheBust: true });
  if (!blob) throw new Error('Failed to render team image');
  return blob;
}

export default function TeamExportImageModal({ team, gameDataState, spriteCacheState, onClose }: TeamExportImageModalProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const notesContainerRef = useRef<HTMLDivElement>(null);
  const notesMaxLines = useLinesThatFit(notesContainerRef);
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
        {/* Single consolidated top bar - title, poster controls, and export actions all in
            one row (deliberately OUTSIDE posterRef so none of it gets rasterized into the
            exported image). Previously this was 3 separate bars (title, controls, footer
            actions); collapsing them into one frees a lot of vertical room for the poster
            itself, which matters at the app's enforced 1280x720 minimum window size. The
            standalone "Close" button was dropped too - the X here already does that. */}
        <div className="px-6 py-3 border-b border-gray-700 flex items-center gap-5 flex-wrap">
          <h2 className="text-lg font-bold text-gray-100 shrink-0">Export Team Image</h2>

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

          {team.notes && (
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={showNotes}
                onChange={(e) => setShowNotes(e.target.checked)}
                className="cursor-pointer"
              />
              Include notes
            </label>
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
            below sizes to its own content by default - only opted into full-height stretch
            (via self-stretch on the box itself, see below) when notes are actually shown and
            need a bounded "leftover space" to clamp against. Leaving stretch as the default
            here previously caused the box's own background/border to render at the wrapper's
            height while its content (e.g. many-line notes) visually overflowed past it,
            uncontained by any background - the "notes spill out" bug. */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start">
          {/* w-full (not a fixed px width) so every child stretches to the same width, bounded
              strictly by this modal's own max-w-6xl/padding - can't overflow by construction,
              and uses whatever width is actually available (bigger tiles, less truncation).
              self-stretch only while notes are shown: that's what gives the notes area below a
              bounded, measurable height to clamp its line count against instead of growing
              unbounded; without notes, the box just sizes to its own content as before. */}
          <div
            ref={posterRef}
            className={`flex flex-col gap-4 p-6 bg-zinc-900 rounded-lg w-full ${showNotes && team.notes ? 'self-stretch' : ''}`}
            style={{ backgroundColor: '#18181b' }}
          >
            <div className="flex items-center gap-3 shrink-0">
              <h3 className="text-lg font-bold text-zinc-100">{team.name}</h3>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded text-white ${regulationTheme.badgeBg}`}>
                {team.format}
              </span>
              {team.author && <span className="text-xs text-zinc-500">by {team.author}</span>}
            </div>

            <div className="grid grid-cols-6 gap-3 shrink-0">
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
                view) and only rendered when opted in, so it can't dominate the exported image.
                flex-1 min-h-0 makes this div take exactly whatever space is left in the
                (now-bounded) poster box after the title row/grid/footer above and below it;
                the -webkit-line-clamp on the <p> (native ellipsis included, no manual "..."
                needed) then clips the notes text to exactly as many lines as that leftover
                space fits, recalculated live via useLinesThatFit's ResizeObserver as the
                window/modal is resized. */}
            {showNotes && team.notes && (
              <div ref={notesContainerRef} className="flex-1 min-h-0 overflow-hidden">
                <p
                  className="text-xs text-zinc-400 whitespace-pre-wrap border-l-2 border-zinc-700 pl-3 w-full"
                  style={{
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: notesMaxLines,
                    overflow: 'hidden',
                  }}
                >
                  {team.notes}
                </p>
              </div>
            )}

            <p className="text-[10px] text-zinc-600 text-right shrink-0">Exported from ChoiceBuds</p>
          </div>
        </div>
      </div>
    </div>
  );
}
