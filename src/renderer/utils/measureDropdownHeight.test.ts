import { describe, it, expect } from 'vitest';
import { measureDropdownMaxHeight } from './measureDropdownHeight';

/**
 * Runs under jsdom (see vitest.config.ts), so `window.innerHeight` exists
 * (jsdom's default is 768) - these build minimal duck-typed stand-ins for
 * the two DOM calls the function actually uses (closest/
 * getBoundingClientRect) rather than rendering a real card/trigger.
 */
function makeTrigger(cardEl: HTMLElement | null, top: number, bottom: number): HTMLElement {
  return {
    closest: () => cardEl,
    getBoundingClientRect: () => ({ top, bottom } as DOMRect),
  } as unknown as HTMLElement;
}

function makeCard(top: number, bottom: number): HTMLElement {
  return {
    getBoundingClientRect: () => ({ top, bottom } as DOMRect),
  } as unknown as HTMLElement;
}

describe('measureDropdownMaxHeight', () => {
  it('falls back to 400 when the trigger is not inside a [data-pokemon-card] element', () => {
    const trigger = makeTrigger(null, 100, 120);
    expect(measureDropdownMaxHeight(trigger)).toBe(400);
  });

  describe('when the trigger is near the top of the viewport (panel placed below)', () => {
    it('returns the space between the trigger and the card bottom, minus the 8px margin', () => {
      const card = makeCard(50, 500);
      const trigger = makeTrigger(card, 100, 120);
      // 500 - 120 - 8 = 372
      expect(measureDropdownMaxHeight(trigger)).toBe(372);
    });

    it('clamps to window.innerHeight when the card extends past the bottom of the viewport', () => {
      const card = makeCard(50, 5000);
      const trigger = makeTrigger(card, 100, 120);
      // window.innerHeight (768, jsdom default) - 120 - 8 = 640
      expect(measureDropdownMaxHeight(trigger)).toBe(640);
    });

    it('clamps to the 120px minimum when the available space is smaller', () => {
      const card = makeCard(50, 130);
      const trigger = makeTrigger(card, 100, 120);
      // 130 - 120 - 8 = 2, clamped up to 120
      expect(measureDropdownMaxHeight(trigger)).toBe(120);
    });
  });

  describe('when the trigger has enough room above it (panel placed above)', () => {
    it('returns the space between the card top and the trigger top, minus the 8px margin', () => {
      const card = makeCard(50, 900);
      const trigger = makeTrigger(card, 300, 320);
      // 300 - 50 - 8 = 242 - this used to be miscalculated off the card's
      // bottom (the "placed below" math) even though the panel renders
      // above the trigger, letting it grow taller than this and spill off
      // the top of the screen.
      expect(measureDropdownMaxHeight(trigger)).toBe(242);
    });

    it('clamps to the 120px minimum when the available space is smaller', () => {
      const card = makeCard(250, 900);
      const trigger = makeTrigger(card, 260, 280);
      // 260 - 250 - 8 = 2, clamped up to 120
      expect(measureDropdownMaxHeight(trigger)).toBe(120);
    });
  });
});
