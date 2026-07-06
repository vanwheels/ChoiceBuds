/**
 * Tooltip.tsx - Card-Anchored Tooltip Panel
 * A single, parent-controlled floating panel. The caller owns hover state and
 * decides *when* to render this; this component only decides *where* it sits.
 *
 * It renders with no positioning context of its own (no `relative` wrapper,
 * no per-trigger sizing) so it always resolves against the nearest positioned
 * ancestor up the tree - which should be the whole card container (e.g.
 * PokemonCard's root `relative` div), not the small element that triggered it.
 * That keeps every tooltip (item/ability/move) at one uniform, card-width size
 * instead of shrinking to whatever tiny element was hovered.
 *
 * Deliberately avoids `transform`, `backdrop-blur`, and animated transitions:
 * those were triggering an Electron GPU process freeze under rapid hovering.
 */

import type { ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
}

export default function Tooltip({ content }: TooltipProps) {
  return (
    <div className="absolute z-50 top-full left-0 right-0 w-full mt-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-md pointer-events-none break-words">
      {content}
    </div>
  );
}
