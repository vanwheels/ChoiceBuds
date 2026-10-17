import { AnimatePresence, motion } from 'framer-motion';
import type { RefObject, MouseEvent as ReactMouseEvent } from 'react';
import { Team } from '../types/pokemon';
import type { GridReorderHandlers } from '../hooks/useGridReorder';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseSavedPokemonReturn } from '../hooks/useSavedPokemon';
import type { UseVgcPastesCacheReturn } from '../hooks/useVgcPastesCache';
import type { UseVgcRealSetsCacheReturn } from '../hooks/useVgcRealSetsCache';
import type { UseRosterActionsReturn } from '../hooks/useRosterActions';
import type { PokeAPICacheEntry } from '../types/pokemon';
import { CARD_EXPAND_ENTER_TRANSITION, CARD_EXPAND_EXIT_TRANSITION } from '../config/motion';
import PokemonCard from './PokemonCard';

// Card expand/collapse (animation/motion leg 2, see TODO.md): animates height
// 0 -> 'auto' via Framer Motion rather than the design demo's plain-CSS
// grid-template-rows trick (Framer measures 'auto' natively, so no
// equivalent trick is needed in real React). `overflow: hidden` only holds
// while a transition is actually in flight - `transitionEnd` flips it back
// to 'visible' once fully expanded, otherwise it would permanently
// reintroduce the popover/tooltip clipping the parent card's own
// overflow-hidden removal (see TeamCardHeader.tsx's rounded-t-xl comment)
// was specifically fixed to avoid.
const cardExpandVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    transition: CARD_EXPAND_EXIT_TRANSITION,
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    overflow: 'hidden',
    // Explicit height here too, not just overflow: live-tested opening the
    // Add Pokemon picker after the expand animation had already settled
    // showed the wrapper's inline height frozen at the pixel value Framer
    // measured during the transition rather than snapping back to real CSS
    // `auto` - so later content growth (the picker, the notes textarea,
    // adding/removing a Pokemon) overflowed past that stale height, got
    // painted over by the next team card in normal flow, and looked exactly
    // like the clipping bug the parent's own overflow-hidden removal was
    // fixed to avoid. Forcing both back explicitly once the transition ends
    // closes that gap.
    transitionEnd: { overflow: 'visible', height: 'auto' },
    transition: CARD_EXPAND_ENTER_TRANSITION,
  },
};

interface TeamCardRosterGridProps {
  isExpanded: boolean;
  onExitComplete: () => void;
  rosterGridRef: RefObject<HTMLDivElement | null>;
  onPokemonAreaContextMenu: (e: ReactMouseEvent<HTMLDivElement>) => void;
  orderedPokemonIds: string[];
  team: Team;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<boolean>;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  rosterActions: UseRosterActionsReturn;
  getCachedEntry: (species: string) => PokeAPICacheEntry | null;
  savedPokemonState: UseSavedPokemonReturn;
  vgcPastesState: UseVgcPastesCacheReturn;
  vgcRealSetsState: UseVgcRealSetsCacheReturn;
  showAnimatedSprites: boolean;
  getRosterHandlers: (id: string) => GridReorderHandlers;
  onAddPokemonClick: () => void;
  localNotes: string;
  onNotesChange: (value: string) => void;
  onNotesBlur: () => void;
}

// EXPANDED VIEW CONTAINER - split out of TeamCard.tsx (File Cap Splits:
// TeamCard.tsx, see TODO.md) with no behavior change. @container: the grid
// below snaps its column count off THIS element's own width (a CSS
// container query), not the browser viewport - viewport-based breakpoints
// were the original bug, since raw viewport width crossing 1280px doesn't
// mean the sidebar-reduced content area actually has room for 6 real 280px
// columns.
export default function TeamCardRosterGrid({
  isExpanded,
  onExitComplete,
  rosterGridRef,
  onPokemonAreaContextMenu,
  orderedPokemonIds,
  team,
  updateTeam,
  gameDataState,
  speciesRosterState,
  spriteCacheState,
  rosterActions,
  getCachedEntry,
  savedPokemonState,
  vgcPastesState,
  vgcRealSetsState,
  showAnimatedSprites,
  getRosterHandlers,
  onAddPokemonClick,
  localNotes,
  onNotesChange,
  onNotesBlur,
}: TeamCardRosterGridProps) {
  return (
    <AnimatePresence initial={false} onExitComplete={onExitComplete}>
      {isExpanded && (
        <motion.div
          key="expanded-content"
          className="@container"
          variants={cardExpandVariants}
          initial="collapsed"
          animate="expanded"
          exit="collapsed"
        >
          <div className="p-3 md:p-6 border-t border-zinc-800/60 bg-zinc-900/10 rounded-b-xl">
            {/* Column-count tiers, not a continuous reflow: 1 column on a
                phone-narrow container, up through 2 and 3, until the
                container is wide enough to snap to 6 (1x6). The original
                1760px breakpoint (6*280px + 5*1rem gaps, treating 280px as
                a hard requirement rather than PokemonCard's actual
                max-w-[280px] cap) was never reachable on a real laptop.
                Measured live via run-desktop (see TODO.md) on the
                reporter's actual setup - 14" MacBook at 1512px, sidebar
                expanded - this grid's container gets 1251px (after the
                Team Card Grid Layout Re-check narrowed the sidebar to
                176px and dropped TeamsPage's duplicated md:px-8 padding).
                1220px keeps cards >= ~182px at 6 columns, the width
                EditablePokemonCore's content (two side-by-side type
                badges, move pills, the SP row) is sized to fit without
                wrapping or overflowing. An earlier 1040px tier only
                checked the sprite box's ~158px floor, so at ~170px the
                second type badge wrapped (uneven card heights) and move
                names/the SP badge overflowed. Doesn't help a 13" MacBook -
                not a target device for
                this fix. The 380px/600px tiers below (Responsive Layout
                Audit: Teams & Box Leg 1, see TODO.md) were measured the
                same way, live via run-desktop at a 375px phone viewport
                with the drawer nav closed, against the same ~158-280px
                PokemonCard footprint. @[Npx]: is a container-query variant
                (keyed off the @container ancestor above), not a viewport
                media query - unlike the old xl:grid-cols-6 this can't
                misfire from raw viewport width alone. */}
            {/* 2D hit-test reorder (useGridReorder.ts, Web Reorder Jank Leg 2) -
                items are keyed by pokemon id (orderedPokemonIds above), so
                identity stays stable across drag re-renders. pokemonIndex
                passed to each PokemonCard is its authoritative position in
                team.pokemon (not its visual position here), since that's
                what PokemonCard's own field edits index into; only the
                drag-end commit uses the visual order. */}
            <div
              ref={rosterGridRef}
              className="grid grid-cols-1 @[380px]:grid-cols-2 @[600px]:grid-cols-3 @[1220px]:grid-cols-6 gap-4 w-full"
              onContextMenu={onPokemonAreaContextMenu}
            >
              {orderedPokemonIds.map((id) => {
                const p = team.pokemon.find((pk) => pk.id === id);
                if (!p) return null;
                return (
                  <PokemonCard
                    key={id}
                    pokemon={p}
                    team={team}
                    pokemonIndex={team.pokemon.indexOf(p)}
                    updateTeam={updateTeam}
                    gameDataState={gameDataState}
                    speciesRosterState={speciesRosterState}
                    spriteCacheState={spriteCacheState}
                    rosterActions={rosterActions}
                    getCachedEntry={getCachedEntry}
                    savedPokemonState={savedPokemonState}
                    vgcPastesState={vgcPastesState}
                    vgcRealSetsState={vgcRealSetsState}
                    showAnimatedSprites={showAnimatedSprites}
                    reorderHandlers={getRosterHandlers(id)}
                  />
                );
              })}

              {/* Add-Pokémon trigger (Always-On Editing Leg 2, see TODO.md) -
                  restores the same dashed-box button Leg 1 left disabled, just
                  gated on roster room instead of isEditingTeam now that there's
                  no edit mode to gate behind. Opens AddPokemonStatTable as a
                  modal (Add Pokémon: Sortable Base-Stat Table Leg 1, see
                  TODO.md) rather than swapping this slot's own content the way
                  SpeciesPickerCard used to - a sortable stat table needs more
                  width than a 280px grid slot affords. */}
              {team.pokemon.length < 6 && (
                <button
                  onClick={onAddPokemonClick}
                  className="w-full max-w-[280px] h-full min-h-[280px] flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer"
                >
                  <span className="text-sm font-semibold">+ Add Pokémon</span>
                </button>
              )}
            </div>

            {/* Strategy Notes - team-level free text (Team.notes), same "local state + save
                on blur" pattern as the name/author fields in TeamCardHeader.tsx. Permanently
                editable (Always-On Editing Leg 1, see TODO.md) - the placeholder covers the
                empty-chrome case the old hide-when-empty behavior used to handle.
                Placed after the roster grid (not before) so the team's visual composition
                is always the first thing seen when expanding a card. */}
            <div className="mt-4">
              <textarea
                value={localNotes}
                onChange={(e) => onNotesChange(e.target.value)}
                onBlur={onNotesBlur}
                placeholder="Strategy notes, game plan, matchup tips..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-600 outline-none focus:border-accent-gold resize-y"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
