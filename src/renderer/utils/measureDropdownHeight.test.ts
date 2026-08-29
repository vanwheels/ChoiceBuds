import { describe, it, expect } from 'vitest';
import { measureDropdownMaxHeight } from './measureDropdownHeight';

/**
 * No jsdom in this project's Vitest config (Node environment, see
 * vitest.config.ts) - these build minimal duck-typed stand-ins for the two
 * DOM calls the function actually uses (closest/getBoundingClientRect)
 * rather than pulling in a real DOM.
 */
function makeTrigger(cardEl: HTMLElement | null, triggerBottom: number): HTMLElement {
  return {
    closest: () => cardEl,
    getBoundingClientRect: () => ({ bottom: triggerBottom } as DOMRect),
  } as unknown as HTMLElement;
}

function makeCard(cardBottom: number): HTMLElement {
  return {
    getBoundingClientRect: () => ({ bottom: cardBottom } as DOMRect),
  } as unknown as HTMLElement;
}

describe('measureDropdownMaxHeight', () => {
  it('falls back to 400 when the trigger is not inside a [data-pokemon-card] element', () => {
    const trigger = makeTrigger(null, 100);
    expect(measureDropdownMaxHeight(trigger)).toBe(400);
  });

  it('returns the space between the trigger and the card bottom, minus the 8px margin', () => {
    const card = makeCard(500);
    const trigger = makeTrigger(card, 300);
    // 500 - 300 - 8 = 192
    expect(measureDropdownMaxHeight(trigger)).toBe(192);
  });

  it('clamps to the 120px minimum when the available space is smaller', () => {
    const card = makeCard(310);
    const trigger = makeTrigger(card, 300);
    // 310 - 300 - 8 = 2, clamped up to 120
    expect(measureDropdownMaxHeight(trigger)).toBe(120);
  });

  it('clamps to the 120px minimum when available space is negative (trigger below the card bottom)', () => {
    const card = makeCard(200);
    const trigger = makeTrigger(card, 300);
    expect(measureDropdownMaxHeight(trigger)).toBe(120);
  });
});
