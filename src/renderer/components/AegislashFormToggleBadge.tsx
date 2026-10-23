/**
 * AegislashFormToggleBadge.tsx - Blade/Shield Display-Flip Trigger
 * Presentational only: a small bottom-center label on Aegislash's own sprite
 * box (EditablePokemonCore.tsx, shown only while showdownData.species is
 * Aegislash - see utils/aegislashForme.ts::isAegislash) - clicking it flips
 * the stats panel between Shield (the stored default) and Blade, via
 * usePokemonFormToggle's shared per-slot state (Aegislash Form Toggle in
 * Team Builder, see TODO.md). Unlike MegaFormToggleBadge, this isn't tied to
 * a held item - Blade/Shield is a stance any Aegislash can take regardless
 * of what it holds - so it sits on the Pokémon's own sprite box instead of
 * the item box, and shows as a text label (not an icon) naming the currently
 * displayed forme directly, the same "label what it does, don't make the
 * viewer guess" lesson StatsColumn.tsx's SP/Base/Real toggle already learned
 * (see that file's header comment).
 */

interface AegislashFormToggleBadgeProps {
  isBlade: boolean;
  onToggle: () => void;
}

export default function AegislashFormToggleBadge({
  isBlade,
  onToggle,
}: AegislashFormToggleBadgeProps) {
  return (
    <button
      type="button"
      data-no-drag
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      title={
        isBlade
          ? 'Showing Blade Forme stats - click to revert to Shield'
          : 'Showing Shield Forme stats - click to show Blade Forme'
      }
      className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
        isBlade
          ? 'bg-accent-gold border-accent-gold text-zinc-900'
          : 'bg-zinc-900/70 border-zinc-600 text-zinc-300 hover:border-accent-gold'
      }`}
    >
      {isBlade ? 'Blade' : 'Shield'}
    </button>
  );
}
