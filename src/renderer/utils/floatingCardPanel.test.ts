import { describe, it, expect } from 'vitest';
import { computeFloatingCardPanelStyle } from './floatingCardPanel';

function rect(partial: Partial<DOMRect>): DOMRect {
  return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}), ...partial } as DOMRect;
}

describe('computeFloatingCardPanelStyle', () => {
  it('locks left/width to cardRect when the anchor is inside a [data-pokemon-card]', () => {
    const anchor = rect({ top: 300, bottom: 320, left: 50, width: 40 });
    const card = rect({ left: 100, width: 280 });
    expect(computeFloatingCardPanelStyle(anchor, card)).toMatchObject({ left: 100, width: 280 });
  });

  it('falls back to a fixed width centered on the anchor when cardRect is null', () => {
    const anchor = rect({ top: 300, bottom: 320, left: 500, width: 40 });
    const style = computeFloatingCardPanelStyle(anchor, null);
    expect(style.width).toBe(256);
    // centered: 500 + 40/2 - 256/2 = 392
    expect(style.left).toBe(392);
  });

  it('clamps the fallback-width placement within the viewport margins', () => {
    const anchor = rect({ top: 300, bottom: 320, left: -100, width: 10 });
    const style = computeFloatingCardPanelStyle(anchor, null);
    expect(style.left).toBe(8); // VIEWPORT_MARGIN, clamped up from a negative position
  });

  it('places below the anchor when there is little room above (top < 160)', () => {
    const anchor = rect({ top: 100, bottom: 130, left: 0, width: 40 });
    const card = rect({ left: 0, width: 280 });
    const style = computeFloatingCardPanelStyle(anchor, card);
    expect(style.top).toBe(138); // anchor.bottom (130) + 8px margin
    expect(style.bottom).toBeUndefined();
  });

  it('places above the anchor (anchored via bottom) when there is enough room above', () => {
    const anchor = rect({ top: 400, bottom: 430, left: 0, width: 40 });
    const card = rect({ left: 0, width: 280 });
    const style = computeFloatingCardPanelStyle(anchor, card);
    expect(style.top).toBeUndefined();
    expect(style.bottom).toBe(window.innerHeight - 400 + 8);
  });
});
