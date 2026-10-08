/**
 * Computes how tall a picker/dropdown can grow before it would spill past
 * the edge of the PokemonCard it belongs to (or the viewport, whichever is
 * tighter) - measured from the trigger element's own position toward
 * whichever side `floatingCardPanel.ts`'s `shouldPlaceBelow` will actually
 * render it on, not always "down to the card's bottom". Measuring the wrong
 * side let a panel placed above its trigger use a max-height sized for the
 * room below it, so it could grow past the top of the screen. Falls back to
 * a reasonable fixed height if the trigger isn't inside a
 * `[data-pokemon-card]` element (shouldn't normally happen, but keeps this
 * safe to call from anywhere).
 */

import { shouldPlaceBelow } from './floatingCardPanel';

const FALLBACK_MAX_HEIGHT = 400;
const EDGE_MARGIN = 8;
const MIN_HEIGHT = 120;

export function measureDropdownMaxHeight(triggerEl: HTMLElement): number {
  const cardEl = triggerEl.closest<HTMLElement>('[data-pokemon-card]');
  if (!cardEl) return FALLBACK_MAX_HEIGHT;

  const triggerRect = triggerEl.getBoundingClientRect();
  const cardRect = cardEl.getBoundingClientRect();

  const available = shouldPlaceBelow(triggerRect)
    ? Math.min(cardRect.bottom, window.innerHeight) - triggerRect.bottom - EDGE_MARGIN
    : triggerRect.top - Math.max(cardRect.top, 0) - EDGE_MARGIN;

  return Math.max(MIN_HEIGHT, available);
}
