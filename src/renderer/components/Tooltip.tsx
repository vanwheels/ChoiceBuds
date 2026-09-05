/**
 * Tooltip.tsx - Card-Width-Locked Floating Popup Primitive
 * A single, parent-controlled floating panel. The caller owns hover state and
 * captures the hovered trigger's own `getBoundingClientRect()` once on
 * hover-enter (see EditOverlays.tsx); this component just renders near that
 * rect.
 *
 * Uses `position: fixed`, so it renders relative to the viewport rather than
 * any ancestor - it always appears right next to whatever was actually
 * hovered (flipping above/below to stay on screen) instead of at the bottom
 * of the whole card, and it can never be clipped by a card/grid boundary.
 *
 * Width locks to the hovered PokemonCard's own left/right edges (`cardRect`,
 * found via the trigger's closest `[data-pokemon-card]` ancestor - see
 * `measureDropdownHeight.ts` for the same lookup pattern) rather than a fixed
 * pixel width centered on the cursor. This is the shared primitive Card Popup
 * Consistency's later legs (item/ability/move pickers, the nature select)
 * migrate onto - see TODO.md. Vertical placement (above/below flip, and
 * overlapping sibling content within the same card) is unaffected and stays
 * keyed to the trigger's own rect; only the horizontal bounds are card-locked.
 *
 * `cardRect` is nullable only for the case where the trigger somehow isn't
 * inside a `[data-pokemon-card]` element (shouldn't normally happen) - falls
 * back to the old fixed-width, cursor-centered box in that case.
 *
 * Deliberately avoids `transform`, `backdrop-blur`, and animated transitions:
 * those were triggering an Electron GPU process freeze under rapid hovering.
 * Horizontal/vertical placement is plain arithmetic on `left`/`top`/`bottom`.
 */

import type { CSSProperties, ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  anchorRect: DOMRect;
  cardRect: DOMRect | null;
}

const FALLBACK_WIDTH = 256; // px - only used when cardRect is null
const VIEWPORT_MARGIN = 8;
const MIN_SPACE_ABOVE = 160; // rough tooltip height - flip below if less room than this

export default function Tooltip({ content, anchorRect, cardRect }: TooltipProps) {
  const width = cardRect ? cardRect.width : FALLBACK_WIDTH;
  const left = cardRect
    ? cardRect.left
    : Math.min(
        Math.max(anchorRect.left + anchorRect.width / 2 - FALLBACK_WIDTH / 2, VIEWPORT_MARGIN),
        window.innerWidth - FALLBACK_WIDTH - VIEWPORT_MARGIN
      );

  const placeBelow = anchorRect.top < MIN_SPACE_ABOVE;
  const style: CSSProperties = {
    left,
    width,
    ...(placeBelow
      ? { top: anchorRect.bottom + VIEWPORT_MARGIN }
      : { bottom: window.innerHeight - anchorRect.top + VIEWPORT_MARGIN }),
  };

  return (
    <div
      className="fixed z-50 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-md pointer-events-none break-words"
      style={style}
    >
      {content}
    </div>
  );
}
