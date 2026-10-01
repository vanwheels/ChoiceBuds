/**
 * MobileBoxSwipeOverlay.tsx - Full-Viewport Swipeable Box Entry Deck
 *
 * Box Mobile: Compact Grid + Swipe Deck Leg 1 (see TODO.md's scoping doc,
 * docs/investigations/mobile-teams-box-card-view-scope.md). Same full-
 * viewport swipe/paging mechanics as MobileTeamSwipeOverlay.tsx (the
 * Full-Screen Swipeable Pokémon Card leg's primitive), but pages through
 * `entries` - BoxPage.tsx's own filtered/sorted Box list - instead of a
 * team's fixed `pokemon` roster. Kept as its own component rather than
 * generalizing MobileTeamSwipeOverlay/MobilePokemonCard to cover both: a Box
 * entry has no team/roster-slot context (no Roster Swap, no "remove from
 * team", no RealSetsButton keyed to a team's regulation) - its available
 * actions are BoxCard.tsx's own set (Rename/Duplicate/Add to Team/Favorite/
 * Delete) instead, different enough that sharing one component would mean
 * threading two incompatible action sets through the same props.
 *
 * currentIndex clamps down whenever `entries` shrinks (a delete fired from
 * inside MobileBoxPokemonCard), same render-time clamp pattern as
 * MobileTeamSwipeOverlay.tsx's own (see its header comment and
 * docs/investigations/set-state-in-effect-lint-fix.md for why this isn't an
 * effect). Closes itself once `entries` is empty.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { SavedPokemonEntry } from '../types/pokemon';
import type { UseSavedPokemonReturn } from '../hooks/useSavedPokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { RegulationId } from '../utils/pokemonRules';
import { STANDARD_ENTER_DURATION } from '../config/motion';
import { CloseIcon } from './icons/SidebarIcons';
import MobileBoxPokemonCard from './MobileBoxPokemonCard';

interface MobileBoxSwipeOverlayProps {
  entries: SavedPokemonEntry[];
  initialIndex: number;
  savedPokemonState: UseSavedPokemonReturn;
  gameDataState: UseGameDataReturn;
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  showAnimatedSprites: boolean;
  onAddToTeam: (entryId: string) => void;
  onClose: () => void;
}

const SWIPE_OFFSET_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 500;

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
};

export default function MobileBoxSwipeOverlay({ entries, initialIndex, savedPokemonState, gameDataState, rulesetId, resolveSprite, showAnimatedSprites, onAddToTeam, onClose }: MobileBoxSwipeOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);

  const entryCount = entries.length;

  // Render-time clamp (not an effect) - see MobileTeamSwipeOverlay.tsx's
  // header comment for why, and why `safeIndex` (not the raw `currentIndex`
  // state) is what the rest of this render reads: setCurrentIndex only takes
  // effect next render, so reading entries[currentIndex] further down after
  // a delete shrunk the array would read past its new end.
  const [prevEntryCount, setPrevEntryCount] = useState(entryCount);
  let safeIndex = currentIndex;
  if (entryCount !== prevEntryCount) {
    setPrevEntryCount(entryCount);
    if (entryCount > 0 && currentIndex >= entryCount) {
      safeIndex = entryCount - 1;
      setCurrentIndex(safeIndex);
    }
  }

  // External callback (mutates the parent's open-tile state, not this
  // component's own), so it stays in an effect rather than the render-time
  // clamp above - nothing left here to page through once the last entry is
  // deleted.
  useEffect(() => {
    if (entryCount === 0) onClose();
  }, [entryCount, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (entryCount === 0) return null;

  const paginate = (delta: number) => {
    const next = safeIndex + delta;
    if (next < 0 || next >= entryCount) return;
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

  const currentEntry = entries[safeIndex];

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col">
      {/* Header - close affordance, entry label, page indicator */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex items-center justify-center w-10 h-10 rounded-full text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
        >
          <CloseIcon />
        </button>
        <span className="flex-1 min-w-0 truncate font-bold text-zinc-100">{currentEntry.label}</span>
        <span className="shrink-0 text-xs font-semibold text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-1">
          {safeIndex + 1} / {entryCount}
        </span>
      </div>

      {/* Swipe area - AnimatePresence mode="wait" keeps this to one card in
          flight at a time, same as MobileTeamSwipeOverlay.tsx's own. */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentEntry.id}
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
            <MobileBoxPokemonCard
              entry={currentEntry}
              onUpdatePokemon={(updates) => savedPokemonState.updateSavedPokemon(currentEntry.id, updates)}
              onRename={(label) => savedPokemonState.renameSavedPokemon(currentEntry.id, label)}
              onDuplicate={() => savedPokemonState.duplicateSavedPokemon(currentEntry.id)}
              onToggleFavorite={() => savedPokemonState.toggleSavedPokemonFavorite(currentEntry.id)}
              onDelete={() => savedPokemonState.deleteSavedPokemon(currentEntry.id)}
              onAddToTeam={() => onAddToTeam(currentEntry.id)}
              gameDataState={gameDataState}
              rulesetId={rulesetId}
              resolveSprite={resolveSprite}
              showAnimatedSprites={showAnimatedSprites}
            />
          </motion.div>
        </AnimatePresence>

        {/* Prev/next fallback buttons - swipe is the primary gesture, these
            cover mouse/keyboard input and make paging discoverable. */}
        {safeIndex > 0 && (
          <button
            onClick={() => paginate(-1)}
            aria-label="Previous build"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-300 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
        )}
        {safeIndex < entryCount - 1 && (
          <button
            onClick={() => paginate(1)}
            aria-label="Next build"
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
