/**
 * CalcBoxHoverCard.tsx - Instant Set Summary for a CalcBoxPanel Tile
 * Deliberately a plain fixed-position div rather than the app's delayed
 * tooltip: Box tiles are scanned quickly, so the card has to appear on
 * pointer-enter with no delay. Fixed (not absolute) because the tile grid
 * scrolls inside an overflow container that would clip an absolute card.
 * pointer-events-none so it can never steal the hover from the tile.
 */

import type { SavedPokemonEntry } from '../../types/pokemon';

interface CalcBoxHoverCardProps {
  entry: SavedPokemonEntry;
  /** The hovered tile's bounds - the card sits below it, flipping above when there's no room. */
  anchor: DOMRect;
  /** The card must stay inside this rect (the Calc popup's body) rather than the whole window - a fixed card isn't clipped by the popup, so it would otherwise spill past its edge. */
  bounds: DOMRect;
}

const CARD_WIDTH = 200;
const CARD_HEIGHT_ESTIMATE = 150;
const GAP = 6;

export default function CalcBoxHoverCard({ entry, anchor, bounds }: CalcBoxHoverCardProps) {
  const { nickname, species, item, nature, moves } = entry.pokemon.showdownData;
  const left = Math.max(
    bounds.left + GAP,
    Math.min(anchor.left + anchor.width / 2 - CARD_WIDTH / 2, bounds.right - CARD_WIDTH - GAP),
  );
  const fitsBelow = anchor.bottom + GAP + CARD_HEIGHT_ESTIMATE < bounds.bottom;
  const top = fitsBelow ? anchor.bottom + GAP : anchor.top - GAP - CARD_HEIGHT_ESTIMATE;
  const shownMoves = moves.filter(Boolean);

  return (
    <div
      className="fixed z-50 pointer-events-none rounded-lg border border-zinc-600 bg-zinc-900 p-2 shadow-lg text-xs text-zinc-200"
      style={{ left, top, width: CARD_WIDTH }}
    >
      <p className="font-bold text-zinc-100 truncate">{nickname || entry.label}</p>
      <p className="text-zinc-400 truncate">
        {species}
        {nickname && nickname !== entry.label ? ` - ${entry.label}` : ''}
      </p>
      <p className="mt-1 text-zinc-300">
        <span className="text-zinc-500">Nature</span> {nature || '-'}
      </p>
      {item && (
        <p className="text-zinc-300 truncate">
          <span className="text-zinc-500">Item</span> {item}
        </p>
      )}
      <ul className="mt-1 space-y-0.5">
        {shownMoves.length === 0 ? (
          <li className="text-zinc-500">No moves</li>
        ) : (
          shownMoves.map((m) => (
            <li key={m} className="truncate">
              {m}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
