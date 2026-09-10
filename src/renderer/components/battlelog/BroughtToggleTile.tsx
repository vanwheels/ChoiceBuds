/**
 * BroughtToggleTile.tsx - Shared "brought" selection tile
 * One clickable roster entry for RecordMatchForm.tsx's two brought-4
 * pickers (player roster, opponent roster) - selection previously relied
 * on a subtle border/background color swap alone, which wasn't a strong
 * enough signal at a glance (see Battle Logger: Selection UI Improvements
 * in TODO.md). Selected tiles now also get a checkmark badge on the sprite
 * and unselected ones dim slightly, so the brought 4 read as a group
 * immediately rather than requiring a close look at each tile's border.
 */

import type { ReactNode } from 'react';

interface BroughtToggleTileProps {
  spriteUrl: string;
  resolveSprite: (url: string) => string;
  label: string;
  selected: boolean;
  onToggle: () => void;
  /** Extra controls rendered after the label, outside the toggle button - e.g. the opponent roster's remove ("x") control, which must stay independently clickable. */
  trailing?: ReactNode;
}

export default function BroughtToggleTile({ spriteUrl, resolveSprite, label, selected, onToggle, trailing }: BroughtToggleTileProps) {
  return (
    <div
      className={`flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg border transition-colors ${
        selected
          ? 'border-accent-gold bg-accent-gold/10 text-zinc-100'
          : 'border-zinc-700 bg-zinc-800 text-zinc-400 opacity-60 hover:opacity-100 hover:border-zinc-500'
      }`}
    >
      <button type="button" onClick={onToggle} className="flex items-center gap-2 cursor-pointer">
        <span className="relative shrink-0">
          <img src={resolveSprite(spriteUrl)} alt={label} className="w-8 h-8" />
          {selected && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent-gold text-zinc-900 text-[10px] font-bold flex items-center justify-center leading-none">
              ✓
            </span>
          )}
        </span>
        <span className="text-sm">{label}</span>
      </button>
      {trailing}
    </div>
  );
}
