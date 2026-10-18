/**
 * MobileAddPokemonPage.tsx - "Add Pokémon" Page for the Mobile Swipe Deck
 *
 * Mobile Add Pokémon Entry Point Leg 1 (see TODO.md and
 * docs/investigations/mobile-add-pokemon-entry-point.md). Shared presentational
 * content for the two places MobileTeamSwipeOverlay.tsx needs an "add a
 * Pokémon" affordance: the extra page past the last card when roster < 6,
 * and the roster = 0 empty-state screen that replaces the old bail-out-and-
 * auto-close effect. Same dashed-box styling/copy as desktop's
 * TeamCardRosterGrid.tsx "+ Add Pokémon" tile, scaled to fill a full-screen
 * page instead of a 280px grid slot.
 */

interface MobileAddPokemonPageProps {
  emptyTeam: boolean;
  onAddClick: () => void;
}

export default function MobileAddPokemonPage({ emptyTeam, onAddClick }: MobileAddPokemonPageProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-6">
      <p className="text-zinc-400 text-sm max-w-xs">
        {emptyTeam
          ? 'This team has no Pokémon yet.'
          : "You've reached the end of this team's roster."}
      </p>
      <button
        onClick={onAddClick}
        className="w-full max-w-xs h-14 flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer"
      >
        <span className="text-sm font-semibold">+ Add Pokémon</span>
      </button>
    </div>
  );
}
