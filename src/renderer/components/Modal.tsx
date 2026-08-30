/**
 * Modal.tsx - Shared Modal Shell
 * Owns the overlay/panel markup and Framer Motion enter/exit transitions
 * every modal in the app previously duplicated on its own (ImportTeamModal,
 * ExportTeamModal, TeamSheetPdfModal, TeamExportImageModal,
 * CalcSavedSetsModal). Mount/unmount of this component IS open/close - the
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
 * No overlay-click/Escape-to-close is wired up here - none of the modals
 * being ported to this component supported that before, so this stays a
 * pure animation shell rather than adding new dismissal behavior alongside
 * it. Sizing (max-width/max-height) varies per modal, so it's the one thing
 * left to the caller via `panelClassName` rather than baked in here.
 */

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
}

const panelVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8, transition: MODAL_PANEL_EXIT_TRANSITION },
  visible: { opacity: 1, scale: 1, y: 0, transition: MODAL_PANEL_ENTER_TRANSITION },
};

export default function Modal({ children, panelClassName = 'max-w-3xl max-h-[90vh]' }: ModalProps) {
  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={MODAL_OVERLAY_TRANSITION}
    >
      <motion.div
        className={`bg-zinc-800 rounded-lg shadow-xl w-full overflow-hidden flex flex-col ${panelClassName}`}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
