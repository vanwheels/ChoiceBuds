/**
 * BoxEntryModal.tsx - Box Entry's Expanded Editor, as a Popup
 *
 * Split out of BoxCard.tsx (Team Editor & Box Fixes Leg 2, see TODO.md)
 * after live feedback: with one Modal.tsx instance per BoxCard, cycling
 * prev/next visibly closed one card's modal and opened the next one's -
 * two separate mount/unmount cycles playing Modal's enter/exit transition
 * back to back. A single instance is mounted once by BoxPageGrid.tsx
 * instead, gated by whichever entry id is in useSavedPokemon.ts's
 * `expandedCardIds` (in practice always 0 or 1, since this modal's own
 * overlay blocks clicking a second collapsed tile while it's open).
 * Navigating via `onNavigate` swaps BoxPageGrid's `entry` prop on this same
 * mounted instance instead of unmounting one modal and mounting another, so
 * AnimatePresence (owned by BoxPageGrid, wrapping this component's
 * conditional mount) only plays its transition on actual open/close, not on
 * every prev/next step.
 *
 * The same team-agnostic editable core PokemonCard.tsx uses for a roster
 * slot, wrapped in the same type-glow card shell, persisting edits through
 * `onUpdatePokemon` -> useSavedPokemon.ts's `updateSavedPokemon`.
 *
 * Escape, or a click on the overlay outside the card (Modal.tsx's opt-in
 * `onOverlayClick`), closes. Left/Right arrow keys (or the fixed-position
 * prev/next sprite buttons flanking the modal, portaled straight to
 * document.body so they flank the viewport rather than being squeezed into
 * the narrow panel) cycle through the box's current *displayed* order -
 * BoxPageGrid.tsx computes `prevEntry`/`nextEntry` from its own search-
 * filtered list, so navigation never lands on a hidden entry. The Escape/
 * arrow-key shortcuts stand down while the context menu is open or a rename
 * is in progress, deferring to those UIs' own Escape handling instead.
 *
 * Right-click menu (copy/export/add to team/rename/duplicate/delete) and
 * favoriting are a second, independent copy of BoxCard.tsx's own
 * collapsed-tile versions rather than a shared hook - same precedent as
 * this app's other "straight port" menus (BoxCard.tsx's Export/Copy items
 * already mirror PokemonCard.tsx's own menu the same way).
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { ImportedPokemonInfo, SavedPokemonEntry } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { RegulationId } from '../utils/pokemonRules';
import { getTypeGlowColors } from '../config/pokemonTheme';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import { copyPokemonToClipboard } from '../utils/clipboardPayload';
import EditablePokemonCore from './EditablePokemonCore';
import ExportTeamModal from './ExportTeamModal';
import Modal from './Modal';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';

interface BoxEntryModalProps {
  entry: SavedPokemonEntry;
  onClose: () => void;
  onUpdatePokemon: (updates: Partial<ImportedPokemonInfo>) => Promise<boolean>;
  onAddToTeam: () => void;
  onRename: (label: string) => Promise<boolean>;
  onDuplicate: () => Promise<boolean>;
  onToggleFavorite: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  gameDataState: UseGameDataReturn;
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  showAnimatedSprites: boolean;
  prevEntry: SavedPokemonEntry | null;
  nextEntry: SavedPokemonEntry | null;
  onNavigate: (direction: 'prev' | 'next') => void;
}

function entrySpriteUrl(entry: SavedPokemonEntry, resolveSprite: (remoteUrl: string) => string) {
  return resolveSprite(
    getPixelSpriteUrl(
      entry.pokemon.pokedexNumber,
      entry.pokemon.showdownData.species,
      entry.pokemon.showdownData.gender || 'M',
      entry.pokemon.showdownData.shiny,
    ),
  );
}

export default function BoxEntryModal({
  entry,
  onClose,
  onUpdatePokemon,
  onAddToTeam,
  onRename,
  onDuplicate,
  onToggleFavorite,
  onDelete,
  gameDataState,
  rulesetId,
  resolveSprite,
  showAnimatedSprites,
  prevEntry,
  nextEntry,
  onNavigate,
}: BoxEntryModalProps) {
  const { pokemon, label, favorite } = entry;

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(label);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // This instance stays mounted across prev/next (see header comment), so
  // any menu/rename/export left open against the previous entry needs to
  // close when the entry underneath it changes out from under it. Adjusted
  // during render (the React-recommended pattern for state keyed off a prop
  // change) rather than in an effect, which would let a stale menu/input
  // flash against the new entry for one frame before the effect ran.
  const [renderedEntryId, setRenderedEntryId] = useState(entry.id);
  if (entry.id !== renderedEntryId) {
    setRenderedEntryId(entry.id);
    setContextMenuPos(null);
    setIsRenaming(false);
    setIsExportOpen(false);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (contextMenuPos || isRenaming) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onNavigate('prev');
      else if (e.key === 'ArrowRight') onNavigate('next');
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [contextMenuPos, isRenaming, onClose, onNavigate]);

  const handleContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const startRename = () => {
    setRenameDraft(label);
    setIsRenaming(true);
  };

  const commitRename = async () => {
    const trimmed = renameDraft.trim();
    if (trimmed && trimmed !== label) await onRename(trimmed);
    setIsRenaming(false);
  };

  const handleCopyPokemon = async () => {
    await copyPokemonToClipboard(pokemon);
  };

  const handleToggleFavorite = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  const favoriteButton = (
    <button
      type="button"
      onClick={handleToggleFavorite}
      title={favorite ? 'Unfavorite' : 'Favorite'}
      className={`absolute -bottom-2.5 -left-2.5 z-10 w-8 h-8 md:w-6 md:h-6 border border-zinc-600 bg-zinc-800 hover:border-accent-gold flex items-center justify-center rounded-full transition-colors cursor-pointer ${
        favorite
          ? 'text-accent-gold hover:text-accent-gold-deep'
          : 'text-zinc-400 hover:text-zinc-200'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width="12"
        height="12"
        fill={favorite ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
      </svg>
    </button>
  );

  const menuItems: ContextMenuItem[] = [
    {
      label: 'Copy Pokémon',
      onClick: handleCopyPokemon,
      icon: (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="11" height="11" rx="1.5" />
          <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
        </svg>
      ),
    },
    {
      label: 'Export',
      onClick: () => setIsExportOpen(true),
      icon: (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      ),
    },
    {
      label: 'Add to Team…',
      onClick: onAddToTeam,
      icon: (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
      ),
    },
    {
      label: 'Rename',
      onClick: startRename,
      icon: (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 3a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      ),
    },
    {
      label: 'Duplicate',
      onClick: onDuplicate,
      icon: (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="11" height="11" rx="1.5" />
          <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
        </svg>
      ),
    },
    {
      label: 'Delete',
      onClick: onDelete,
      danger: true,
      icon: (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 7h16" />
          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      ),
    },
  ];

  const contextMenu = contextMenuPos && (
    <ContextMenu
      x={contextMenuPos.x}
      y={contextMenuPos.y}
      onClose={() => setContextMenuPos(null)}
      items={menuItems}
    />
  );

  const exportModal = (
    <AnimatePresence>
      {isExportOpen && (
        <ExportTeamModal
          pokemonList={[pokemon.showdownData]}
          title={`Export ${pokemon.showdownData.nickname || pokemon.showdownData.species}`}
          pasteTitle={pokemon.showdownData.nickname || pokemon.showdownData.species}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </AnimatePresence>
  );

  // Fixed-position, portaled directly to document.body rather than placed
  // inside the Modal's own panel - the panel is a narrow fixed-width card,
  // but these should flank the viewport at the modal's vertical center
  // regardless of panel width, like a lightbox's prev/next controls. null
  // (not just disabled) when there's no neighbor, so a single-entry box
  // shows no arrows at all.
  const navButton = (direction: 'prev' | 'next', neighbor: SavedPokemonEntry | null) => {
    if (!neighbor) return null;
    return createPortal(
      <button
        onClick={() => onNavigate(direction)}
        title={direction === 'prev' ? `Previous: ${neighbor.label}` : `Next: ${neighbor.label}`}
        className={`fixed top-1/2 -translate-y-1/2 z-[75] flex items-center gap-2 p-2 rounded-full bg-zinc-800/90 border border-zinc-600 text-zinc-400 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer ${
          direction === 'prev' ? 'left-3 md:left-10' : 'right-3 md:right-10'
        }`}
      >
        {direction === 'prev' && (
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        )}
        <img
          src={entrySpriteUrl(neighbor, resolveSprite)}
          alt={neighbor.pokemon.showdownData.species}
          draggable={false}
          className="w-9 h-9 object-contain [image-rendering:pixelated]"
        />
        {direction === 'next' && (
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        )}
      </button>,
      document.body,
    );
  };

  const [glowC1, glowC2] = getTypeGlowColors(pokemon.types);

  return (
    <>
      {contextMenu}
      {exportModal}
      {navButton('prev', prevEntry)}
      {navButton('next', nextEntry)}

      {/* Modal's own panel stays `overflow-hidden` (uncustomized - see its
          header comment on why that's the convention: the inner content
          owns its own scroll/padding rather than overriding the panel's
          clip). The p-4 wrapper below is load-bearing, not decorative: the
          close/favorite buttons sit at -top-2.5/-bottom-2.5/etc, outside
          the glow-ring card's own box, and without this padding the
          panel's clip cuts them off at the corners. */}
      <Modal panelClassName="max-w-[320px] max-h-[90vh]" onOverlayClick={onClose}>
        <div className="overflow-y-auto p-4">
          <div
            className="type-glow-ring"
            style={{ '--glow-c1': glowC1, '--glow-c2': glowC2 } as CSSProperties}
          >
            <div
              className="relative bg-zinc-700 rounded-[11px] p-3 flex flex-col gap-3 min-w-0"
              onContextMenu={handleContextMenu}
            >
              <button
                onClick={onClose}
                title="Close"
                className="absolute -top-2.5 -right-2.5 z-10 w-8 h-8 md:w-6 md:h-6 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-600 text-zinc-500 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer text-sm"
              >
                ×
              </button>

              {favoriteButton}

              {isRenaming ? (
                <input
                  type="text"
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setIsRenaming(false);
                  }}
                  autoFocus
                  className="text-center text-xs font-bold text-accent-gold uppercase tracking-wide bg-zinc-800 border border-accent-gold rounded px-2 py-1 mx-4 outline-none"
                />
              ) : (
                <p className="text-center text-xs font-bold text-accent-gold uppercase tracking-wide truncate px-4">
                  {label}
                </p>
              )}

              <EditablePokemonCore
                pokemon={pokemon}
                onUpdatePokemon={onUpdatePokemon}
                gameDataState={gameDataState}
                rulesetId={rulesetId}
                resolveSprite={resolveSprite}
                showAnimatedSprites={showAnimatedSprites}
              />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
