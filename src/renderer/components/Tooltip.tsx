/**
 * Tooltip.tsx - Card-Width-Locked Floating Popup
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
 * Positioning math (width lock to the hovered PokemonCard's own left/right
 * edges, above/below flip) lives in `utils/floatingCardPanel.ts` - the shared
 * primitive Card Popup Consistency's later legs (item/ability/move pickers,
 * the nature select) migrate onto - see TODO.md. This component is read-only
 * (`pointer-events-none`); `FloatingCardPanel.tsx` is the interactive
 * counterpart built on the same math.
 *
 * Deliberately avoids `transform`, `backdrop-blur`, and animated transitions:
 * those were triggering an Electron GPU process freeze under rapid hovering.
 * Horizontal/vertical placement is plain arithmetic on `left`/`top`/`bottom`.
 */

import type { ReactNode } from 'react';
import { computeFloatingCardPanelStyle } from '../utils/floatingCardPanel';

interface TooltipProps {
  content: ReactNode;
  anchorRect: DOMRect;
  cardRect: DOMRect | null;
}

export default function Tooltip({ content, anchorRect, cardRect }: TooltipProps) {
  const style = computeFloatingCardPanelStyle(anchorRect, cardRect);

  return (
    <div
      className="fixed z-50 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-md pointer-events-none break-words"
      style={style}
    >
      {content}
    </div>
  );
}
