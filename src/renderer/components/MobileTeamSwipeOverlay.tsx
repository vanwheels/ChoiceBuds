/**
 * MobileTeamSwipeOverlay.tsx - Full-Viewport Swipeable Pokémon Deck
 *
 * Full-Screen Swipeable Pokémon Card + Teams List View Leg 1 (see TODO.md's
 * scoping doc, docs/investigations/mobile-teams-box-card-view-scope.md) -
 * "the core new primitive: a full-viewport PokemonCard with horizontal
 * swipe/paging and a close affordance." Opened by MobileTeamsList.tsx when a
 * team-preview row is tapped; pages through that team's roster one
 * MobilePokemonCard.tsx at a time via a horizontal drag gesture (with
 * fallback arrow buttons for non-touch input, same "swipe primary, buttons
 * as a fallback" shape as nothing else in this app needed a precedent for -
 * this is the first swipe-gesture surface).
 *
 * Portaled to document.body and z-[60] - one tier above Modal.tsx/the mobile
 * drawer's z-50, since this overlay can be opened from within the Teams tab
 * while the drawer's own trigger is still visible in Sidebar.tsx's top bar.
 *
 * currentIndex clamps down whenever the roster shrinks (Remove from team,
 * fired from inside MobilePokemonCard) rather than only reading it once at
 * open time - `team` here is the live object from useTeams, not a snapshot,
 * so a removal is visible on the very next render. Closes itself once the
 * roster is fully empty, since there'd be nothing left to page through.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { Team } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseSavedPokemonReturn } from '../hooks/useSavedPokemon';
import type { UseVgcPastesCacheReturn } from '../hooks/useVgcPastesCache';
import type { UseVgcRealSetsCacheReturn } from '../hooks/useVgcRealSetsCache';
import { useRosterActions } from '../hooks/useRosterActions';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import { getRegulationTheme } from '../config/pokemonTheme';
import { toRegulationId } from '../utils/pokemonRules';
import { STANDARD_ENTER_DURATION } from '../config/motion';
import { CloseIcon } from './icons/SidebarIcons';
import MobilePokemonCard from './MobilePokemonCard';

interface MobileTeamSwipeOverlayProps {
  team: Team;
  initialIndex: number;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<boolean>;
  databaseState: UseDatabaseReturn;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  savedPokemonState: UseSavedPokemonReturn;
  vgcPastesState: UseVgcPastesCacheReturn;
  vgcRealSetsState: UseVgcRealSetsCacheReturn;
  showAnimatedSprites: boolean;
  onClose: () => void;
}

const SWIPE_OFFSET_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 500;

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
};

export default function MobileTeamSwipeOverlay({ team, initialIndex, updateTeam, databaseState, gameDataState, speciesRosterState, spriteCacheState, savedPokemonState, vgcPastesState, vgcRealSetsState, showAnimatedSprites, onClose }: MobileTeamSwipeOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  // One instance per open overlay - same shape as TeamCard.tsx's own
  // per-card instantiation (useRosterActions holds no internal state of its
  // own, just useCallback-wrapped async functions, so there's no shared-cache
  // race to avoid the way vgcPastesState/vgcRealSetsState have).
  const rosterActions = useRosterActions(
    updateTeam,
    databaseState.getCachedEntry,
    databaseState.setCacheEntry,
    gameDataState.getEnrichedSpeciesOptions,
    gameDataState.getChampionsUsage
  );

  const rosterLength = team.pokemon.length;

  // Clamp down during render (the "adjust state when a prop changes"
  // pattern - see TeamCard.tsx's own rosterIdsKey/prevRosterIdsKey use of the
  // same shape, and docs/investigations/set-state-in-effect-lint-fix.md)
  // rather than an effect calling setCurrentIndex directly, which the
  // project's set-state-in-effect lint rule flags. Only reacts to a real
  // roster-length change, not every incidental re-render.
  //
  // Crucially, `safeIndex` (not the raw `currentIndex` state) is what the
  // rest of THIS render uses - calling setCurrentIndex only takes effect
  // next render, so reading team.pokemon[currentIndex] further down in the
  // same pass after a Remove shrunk the roster crashed live
  // ("Cannot read properties of undefined (reading 'id')", caught via
  // run-desktop removing the last-indexed Pokémon of a 2-mon team) - the
  // stale index was still pointing past the new, shorter array.
  const [prevRosterLength, setPrevRosterLength] = useState(rosterLength);
  let safeIndex = currentIndex;
  if (rosterLength !== prevRosterLength) {
    setPrevRosterLength(rosterLength);
    if (rosterLength > 0 && currentIndex >= rosterLength) {
      safeIndex = rosterLength - 1;
      setCurrentIndex(safeIndex);
    }
  }

  // Closing is an external callback (mutates the parent's openTeamId, not
  // this component's own state), so it stays in an effect rather than the
  // render-time clamp above - nothing left here to page through once the
  // last Pokémon is removed.
  useEffect(() => {
    if (rosterLength === 0) onClose();
  }, [rosterLength, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (rosterLength === 0) return null;

  const paginate = (delta: number) => {
    const next = safeIndex + delta;
    if (next < 0 || next >= rosterLength) return;
    setDirection(delta);
    setCurrentIndex(next);
  };

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.x <= -SWIPE_OFFSET_THRESHOLD || info.velocity.x <= -SWIPE_VELOCITY_THRESHOLD) {
      paginate(1);
    } else if (info.offset.x >= SWIPE_OFFSET_THRESHOLD || info.velocity.x >= SWIPE_VELOCITY_THRESHOLD) {
      paginate(-1);
    }
  };

  const regulationTheme = getRegulationTheme(toRegulationId(team.format));
  const currentPokemon = team.pokemon[safeIndex];

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col">
      {/* Header - close affordance, team identity, page indicator */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b border-zinc-800 border-l-4 ${regulationTheme.accentBorder}`}>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex items-center justify-center w-10 h-10 rounded-full text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
        >
          <CloseIcon />
        </button>
        <span className="flex-1 min-w-0 truncate font-bold text-zinc-100">{team.name || 'Untitled Team'}</span>
        <span className="shrink-0 text-xs font-semibold text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-1">
          {safeIndex + 1} / {rosterLength}
        </span>
      </div>

      {/* Swipe area - AnimatePresence mode="wait" keeps this to one card in
          flight at a time (simpler than an overlapping-pages carousel),
          acceptable for a first primitive - see file header. */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentPokemon.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: STANDARD_ENTER_DURATION, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 overflow-y-auto px-4 py-4 cursor-grab active:cursor-grabbing"
          >
            <MobilePokemonCard
              pokemon={currentPokemon}
              team={team}
              pokemonIndex={safeIndex}
              updateTeam={updateTeam}
              gameDataState={gameDataState}
              speciesRosterState={speciesRosterState}
              spriteCacheState={spriteCacheState}
              rosterActions={rosterActions}
              getCachedEntry={databaseState.getCachedEntry}
              savedPokemonState={savedPokemonState}
              vgcPastesState={vgcPastesState}
              vgcRealSetsState={vgcRealSetsState}
              showAnimatedSprites={showAnimatedSprites}
            />
          </motion.div>
        </AnimatePresence>

        {/* Prev/next fallback buttons - swipe is the primary gesture, these
            cover mouse/keyboard input and make paging discoverable. Hidden
            past either end rather than disabled-and-visible. */}
        {safeIndex > 0 && (
          <button
            onClick={() => paginate(-1)}
            aria-label="Previous Pokémon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-300 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
        )}
        {safeIndex < rosterLength - 1 && (
          <button
            onClick={() => paginate(1)}
            aria-label="Next Pokémon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-300 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
