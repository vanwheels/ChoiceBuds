/**
 * Modal.tsx - Shared Modal Shell
 * Owns the overlay/panel markup and Framer Motion enter/exit transitions
 * every modal in the app previously duplicated on its own (ImportTeamModal,
 * ExportTeamModal, TeamSheetPdfModal, TeamExportImageModal). Mount/unmount of this component IS open/close - the
 * caller's own `{isOpen && <SomeModal/>}` conditional still drives
 * visibility exactly as before, just now wrapped in an `AnimatePresence` at
 * the call site (TeamCard.tsx, PokemonCard.tsx, TeamsPage.tsx,
 * CalcPage.tsx) so this component gets to play its exit animation before
 * actually unmounting. Framer Motion requires `AnimatePresence` to live
 * where the mount/unmount decision is made, not one level inside it - that
 * also keeps each modal's (sometimes non-trivial, e.g.
 * TeamExportImageModal's poster grid) content from mounting until a user
 * actually opens it, same as before this component existed.
 *
 * No Escape-to-close is wired up here - none of the modals being ported to
 * this component supported that before, so this stays a pure animation
 * shell rather than adding new dismissal behavior alongside it. Sizing
 * (max-width/max-height) varies per modal, so it's the one thing left to the
 * caller via `panelClassName` rather than baked in here.
 *
 * Click-outside-to-close is opt-in via `onOverlayClick` (BoxEntryModal.tsx's
 * first consumer, Team Editor & Box Fixes Leg 2, see TODO.md) rather than
 * always-on, since most existing callers are forms/dialogs where an
 * accidental outside click shouldn't silently discard in-progress input.
 * The panel itself stops propagation so a click inside it never reaches the
 * overlay's own handler.
 *
 * Renders through a portal to document.body rather than in place (Export
 * Modal Stacking Fix, see TODO.md): PokemonCard.tsx's root motion.div uses
 * framer-motion's `layout` prop for drag-reorder animations, which keeps an
 * inline CSS transform on that element even at rest. A `transform` on an
 * ancestor makes it the containing block for this modal's `fixed inset-0`
 * overlay per the CSS spec, so without the portal the "fixed" overlay was
 * actually confined to that one card's box instead of the viewport - it
 * rendered behind the other sibling cards instead of covering the screen.
 * Portaling out from under any such ancestor is the general fix, since any
 * future modal caller nested inside a `layout`-animated element would hit
 * the same bug otherwise.
 *
 * The panel itself is `overflow-hidden` (clips content to its rounded
 * corners). Any absolutely-positioned child inside modal content - a
 * search-results dropdown, an autocomplete list - gets silently clipped by
 * this rather than overflowing visibly (hit live in
 * FavoritePokemonEditor.tsx's species search, see
 * docs/postmortems/profile-editing-and-visibility-controls.md). Render that
 * kind of content in-flow instead of absolutely-positioned, or it will not
 * be visible inside a Modal.
 */

import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import {
  MODAL_OVERLAY_TRANSITION,
  MODAL_PANEL_ENTER_TRANSITION,
  MODAL_PANEL_EXIT_TRANSITION,
} from '../config/motion';

interface ModalProps {
  children: ReactNode;
  /** Tailwind max-width/max-height classes for the panel - defaults match the most common modal size in the app. */
  panelClassName?: string;
  /** Opt-in click-outside-to-close - see header comment. Omitted (the default for every other caller) leaves the overlay inert. */
  onOverlayClick?: () => void;
}

const panelVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8, transition: MODAL_PANEL_EXIT_TRANSITION },
  visible: { opacity: 1, scale: 1, y: 0, transition: MODAL_PANEL_ENTER_TRANSITION },
};

export default function Modal({
  children,
  panelClassName = 'max-w-3xl max-h-[90vh]',
  onOverlayClick,
}: ModalProps) {
  return createPortal(
    <motion.div
      // z-[70]: above MobileTeamSwipeOverlay.tsx/MobileBoxSwipeOverlay.tsx's
      // z-[60] full-viewport overlays, since both can open a Modal-based
      // dialog (e.g. AddPokemonStatTable) from within themselves and that
      // dialog must still render on top, not behind the opaque overlay it
      // was opened from.
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]"
      onClick={onOverlayClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={MODAL_OVERLAY_TRANSITION}
    >
      <motion.div
        className={`bg-zinc-800 rounded-lg shadow-xl w-full overflow-hidden flex flex-col ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}
