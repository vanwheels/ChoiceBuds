/**
 * Tooltip.tsx - Cursor-Anchored Tooltip Panel
 * A single, parent-controlled floating panel. The caller owns hover state and
 * captures the hovered element's `getBoundingClientRect()` once on hover-enter
 * (see EditOverlays.tsx); this component just renders near that rect.
 *
 * Uses `position: fixed`, so it renders relative to the viewport rather than
 * any ancestor - it always appears right next to whatever was actually
 * hovered (flipping above/below to stay on screen) instead of at the bottom
 * of the whole card, and it can never be clipped by a card/grid boundary.
 *
 * Deliberately avoids `transform`, `backdrop-blur`, and animated transitions:
 * those were triggering an Electron GPU process freeze under rapid hovering.
 * Horizontal/vertical placement is plain arithmetic on `left`/`top`/`bottom`.
 */

import type { CSSProperties, ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  anchorRect: DOMRect;
}

const TOOLTIP_WIDTH = 256; // px, matches w-64 below
const VIEWPORT_MARGIN = 8;
const MIN_SPACE_ABOVE = 160; // rough tooltip height - flip below if less room than this

export default function Tooltip({ content, anchorRect }: TooltipProps) {
  const centerX = anchorRect.left + anchorRect.width / 2;
  const left = Math.min(
    Math.max(centerX - TOOLTIP_WIDTH / 2, VIEWPORT_MARGIN),
    window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN
  );

  const placeBelow = anchorRect.top < MIN_SPACE_ABOVE;
  const style: CSSProperties = placeBelow
    ? { left, top: anchorRect.bottom + VIEWPORT_MARGIN }
    : { left, bottom: window.innerHeight - anchorRect.top + VIEWPORT_MARGIN };

  return (
    <div
      className="fixed z-50 w-64 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-md pointer-events-none break-words"
      style={style}
    >
      {content}
    </div>
  );
}
