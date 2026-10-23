/**
 * MegaFormToggleBadge.tsx - Held Mega Stone's Display-Flip Trigger
 * Presentational only: a small corner badge on the item sprite box, shown
 * only while the held item is this exact species' own Mega Stone (see
 * config/megaEvolution.ts::getMegaApiSlug) - clicking it flips
 * EditablePokemonCore.tsx's ability/stats/typing panel between the base form
 * and the Mega's, via usePokemonFormToggle's shared per-slot state (Mega
 * Team Card Flip, see TODO.md). Never affects the sprite itself - that stays
 * always-on whenever the stone is held, independent of this toggle.
 */

interface MegaFormToggleBadgeProps {
  isActive: boolean;
  onToggle: () => void;
}

export default function MegaFormToggleBadge({ isActive, onToggle }: MegaFormToggleBadgeProps) {
  return (
    <button
      type="button"
      data-no-drag
      onClick={onToggle}
      title={isActive ? 'Showing Mega stats - click to revert to base form' : 'Show Mega stats'}
      className={`absolute -top-1.5 -right-1.5 z-10 w-5 h-5 flex items-center justify-center rounded-full border text-[10px] font-bold transition-colors cursor-pointer ${
        isActive
          ? 'bg-accent-gold border-accent-gold text-zinc-900'
          : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:border-accent-gold'
      }`}
    >
      M
    </button>
  );
}
