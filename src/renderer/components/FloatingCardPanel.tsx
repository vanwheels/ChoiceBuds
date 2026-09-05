/**
 * FloatingCardPanel.tsx - Interactive Card-Width-Locked Floating Panel
 * The interactive counterpart to Tooltip.tsx: same `position: fixed`,
 * card-width-locked, above/below-flipping placement (shared math lives in
 * `utils/floatingCardPanel.ts`), but for content that needs pointer events -
 * the item/ability/move picker panels (see EditOverlays.tsx). Card Popup
 * Consistency Leg 2 - see TODO.md.
 *
 * The caller captures `anchorRect`/`cardRect` once when the panel opens (the
 * trigger's own `getBoundingClientRect()`, and that trigger's closest
 * `[data-pokemon-card]` ancestor - same lookup `measureDropdownHeight.ts`
 * uses for the panel's internal `maxHeight`), same shape as Tooltip's own
 * hover-capture in EditOverlays.tsx. Floats over the card's existing content
 * rather than replacing it in place, unlike the picker panels' prior
 * "fills the slot" pattern.
 */

import type { ReactNode } from 'react';
import { computeFloatingCardPanelStyle } from '../utils/floatingCardPanel';

interface FloatingCardPanelProps {
  children: ReactNode;
  anchorRect: DOMRect;
  cardRect: DOMRect | null;
}

export default function FloatingCardPanel({ children, anchorRect, cardRect }: FloatingCardPanelProps) {
  const style = computeFloatingCardPanelStyle(anchorRect, cardRect);

  return (
    <div className="fixed z-50" style={style}>
      {children}
    </div>
  );
}
