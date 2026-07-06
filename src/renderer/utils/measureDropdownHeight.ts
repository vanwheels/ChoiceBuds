/**
 * Computes how tall a picker/dropdown can grow before it would spill past
 * the bottom edge of the PokemonCard it belongs to - measured from the
 * trigger element's own position down to the card's bottom edge, not the
 * card's total height. Falls back to a reasonable fixed height if the
 * trigger isn't inside a `[data-pokemon-card]` element (shouldn't normally
 * happen, but keeps this safe to call from anywhere).
 */

const FALLBACK_MAX_HEIGHT = 400;
const BOTTOM_MARGIN = 8;
const MIN_HEIGHT = 120;

export function measureDropdownMaxHeight(triggerEl: HTMLElement): number {
  const cardEl = triggerEl.closest<HTMLElement>('[data-pokemon-card]');
  if (!cardEl) return FALLBACK_MAX_HEIGHT;

  const triggerRect = triggerEl.getBoundingClientRect();
  const cardRect = cardEl.getBoundingClientRect();
  const available = cardRect.bottom - triggerRect.bottom - BOTTOM_MARGIN;

  return Math.max(MIN_HEIGHT, available);
}
