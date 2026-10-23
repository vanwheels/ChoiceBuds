/**
 * MegaFormToggleBadge.tsx - Held Mega Stone's Display-Flip Trigger
 * Presentational only: a small corner badge on the item sprite box, shown
 * only while the held item is this exact species' own Mega Stone (see
 * config/megaEvolution.ts::getMegaApiSlug) - clicking it flips
 * EditablePokemonCore.tsx's ability/stats/typing panel between the base form
 * and the Mega's, via usePokemonFormToggle's shared per-slot state (Mega
 * Team Card Flip, see TODO.md). Never affects the sprite itself - that stays
 * always-on whenever the stone is held, independent of this toggle.
 *
 * Icon is Showdown's own Mega-Evolution badge (see utils/spriteUrl.ts's
 * MEGA_BADGE_ICON_URL), not a hand-drawn glyph - its active/inactive state is
 * conveyed by the surrounding circle's fill, the same gold-vs-zinc treatment
 * the rest of this card uses for an active toggle.
 */

import { MEGA_BADGE_ICON_URL } from '../utils/spriteUrl';

interface MegaFormToggleBadgeProps {
  isActive: boolean;
  onToggle: () => void;
  resolveSprite: (remoteUrl: string) => string;
}

export default function MegaFormToggleBadge({
  isActive,
  onToggle,
  resolveSprite,
}: MegaFormToggleBadgeProps) {
  return (
    <button
      type="button"
      data-no-drag
      onClick={onToggle}
      title={isActive ? 'Showing Mega stats - click to revert to base form' : 'Show Mega stats'}
      className={`absolute -top-1.5 -right-1.5 z-10 w-5 h-5 flex items-center justify-center rounded-full border transition-colors cursor-pointer ${
        isActive
          ? 'bg-accent-gold border-accent-gold'
          : 'bg-zinc-800 border-zinc-600 hover:border-accent-gold'
      }`}
    >
      <img
        src={resolveSprite(MEGA_BADGE_ICON_URL)}
        alt="Mega"
        draggable={false}
        className="w-3 h-3"
      />
    </button>
  );
}
