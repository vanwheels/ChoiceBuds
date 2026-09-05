/**
 * Shared positioning math for card-width-locked, viewport-fixed floating
 * panels - extracted from Tooltip.tsx (Card Popup Consistency Leg 1) so
 * Leg 2's interactive item/ability/move picker panels (see
 * FloatingCardPanel.tsx) can float using the exact same rules instead of a
 * copy-pasted variant.
 *
 * Locks to the anchor's closest `[data-pokemon-card]` ancestor's own
 * left/right edges (`cardRect`) rather than a fixed pixel width, and flips
 * above/below the anchor to stay on screen. `cardRect` is nullable only for
 * the case where the anchor somehow isn't inside a `[data-pokemon-card]`
 * element (shouldn't normally happen) - falls back to a fixed width centered
 * on the anchor in that case.
 */

export interface FloatingCardPanelStyle {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
}

const FALLBACK_WIDTH = 256; // px - only used when cardRect is null
const VIEWPORT_MARGIN = 8;
const MIN_SPACE_ABOVE = 160; // rough panel height - flip below if less room than this

export function computeFloatingCardPanelStyle(anchorRect: DOMRect, cardRect: DOMRect | null): FloatingCardPanelStyle {
  const width = cardRect ? cardRect.width : FALLBACK_WIDTH;
  const left = cardRect
    ? cardRect.left
    : Math.min(
        Math.max(anchorRect.left + anchorRect.width / 2 - FALLBACK_WIDTH / 2, VIEWPORT_MARGIN),
        window.innerWidth - FALLBACK_WIDTH - VIEWPORT_MARGIN
      );

  const placeBelow = anchorRect.top < MIN_SPACE_ABOVE;
  return {
    left,
    width,
    ...(placeBelow
      ? { top: anchorRect.bottom + VIEWPORT_MARGIN }
      : { bottom: window.innerHeight - anchorRect.top + VIEWPORT_MARGIN }),
  };
}
