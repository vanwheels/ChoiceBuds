/**
 * CalcPopup.tsx - Regular Calc, as a Floating Overlay
 * Popup Launcher Leg 1 (see TODO.md / docs/investigations/regular-calc-popup-scope.md).
 * Wraps the existing CalcPage (unmodified) in overlay chrome so it's
 * reachable from anywhere in the app via App.tsx's floating launcher button,
 * rather than being locked to its own sidebar tab.
 *
 * Deliberately NOT the usual `{isOpen && <Modal>...}` mount/unmount pattern
 * every other modal in the app uses (Modal.tsx's own header comment) -
 * CalcPage owns `useDamageCalc` (and its @smogon/calc import) internally, so
 * unmounting this component on close would discard the in-progress matchup
 * along with it. Instead this component is rendered once App.tsx's
 * `hasOpenedCalcPopup` flag flips true and then stays mounted for the rest
 * of the session; `isOpen` only toggles visibility (opacity/pointer-events),
 * matching the same lazy-once/hidden-after-first-open lifecycle App.tsx's
 * `visitedTabs` already uses for tabs, just applied to a single portal-
 * rendered overlay instead of a per-tab `<div>`. Reuses Modal.tsx's overlay/
 * panel styling and enter/exit transitions rather than inventing new ones,
 * but drives them off `animate` (a toggle between two steady states) instead
 * of `AnimatePresence` (a mount/unmount), since this component's whole point
 * is to never unmount once opened.
 *
 * No overlay-click/Escape-to-close, matching Modal.tsx's own note that none
 * of today's modals support that either.
 */

import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  MODAL_OVERLAY_TRANSITION,
  MODAL_PANEL_ENTER_TRANSITION,
  MODAL_PANEL_EXIT_TRANSITION,
} from '../config/motion';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseSavedPokemonReturn } from '../hooks/useSavedPokemon';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../hooks/useSettings';
import CalcPage from './calc/CalcPage';

interface CalcPopupProps {
  isOpen: boolean;
  onClose: () => void;
  gameDataState: UseGameDataReturn;
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  savedPokemonState: UseSavedPokemonReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
}

const overlayVariants = {
  hidden: { opacity: 0, transition: MODAL_OVERLAY_TRANSITION },
  visible: { opacity: 1, transition: MODAL_OVERLAY_TRANSITION },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8, transition: MODAL_PANEL_EXIT_TRANSITION },
  visible: { opacity: 1, scale: 1, y: 0, transition: MODAL_PANEL_ENTER_TRANSITION },
};

export default function CalcPopup({ isOpen, onClose, ...calcPageProps }: CalcPopupProps) {
  return createPortal(
    <motion.div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isOpen ? '' : 'pointer-events-none'}`}
      variants={overlayVariants}
      animate={isOpen ? 'visible' : 'hidden'}
      initial="hidden"
      aria-hidden={!isOpen}
    >
      <motion.div
        className="bg-zinc-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        variants={panelVariants}
        animate={isOpen ? 'visible' : 'hidden'}
        initial="hidden"
      >
        <div className="px-6 py-4 border-b border-zinc-700 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-zinc-100">Calc</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <CalcPage {...calcPageProps} />
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
