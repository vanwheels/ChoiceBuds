/**
 * BoxCard.tsx - One Box Tab Entry's Collapsed Grid Tile
 *
 * Box Tab Leg 1 (see TODO.md). Just the sprite + the saved entry's own
 * `label` (distinct from the pokemon's `nickname`, which only shows once
 * expanded). Clicking opens the full editable view in BoxEntryModal.tsx's
 * popup (Team Editor & Box Fixes Leg 2, see TODO.md) rather than this card
 * growing in place - this is the grid's only slot for the entry, so
 * expanding it never reflows any sibling tile. That modal is a single
 * instance BoxPageGrid.tsx mounts once (not one per BoxCard) so prev/next
 * navigation between entries can swap its content without a visible close-
 * then-reopen - see BoxEntryModal.tsx's own header comment for why.
 *
 * No roster-specific chrome (Roster Swap, drag-reorder) - a Box entry isn't
 * a roster slot. Rename/duplicate/delete (Box Tab Leg 3, see TODO.md) are a
 * right-click context menu, same ContextMenu.tsx shell PokemonCard.tsx's
 * own right-click menu uses - these used to only be reachable via Calc's
 * Saved Pokémon Sets modal. Rename is inline (click "Rename" then edit in
 * place, same pattern CalcSavedSetsModal.tsx's own management list already
 * used) rather than a separate dialog. BoxEntryModal.tsx's own expanded-view
 * context menu is a second, independent copy of this one rather than a
 * shared hook - see its header comment.
 *
 * "Add to Team…" (Box Tab Leg 4, see TODO.md) is the same context menu's
 * newest item - opens BoxPage.tsx's AddToTeamDialog rather than acting
 * directly, since picking a destination team needs its own UI.
 *
 * "Copy Pokémon"/"Export" (Box Tab Leg 6, see TODO.md) mirror
 * PokemonCard.tsx's own menu exactly - straight ports, same
 * clipboardPayload.ts round-trip and ExportTeamModal.tsx mount. One-
 * directional (out only): no "Paste Pokémon" per-entry item, since Leg 5
 * already covers pasting *into* Box at the grid level.
 *
 * Favoriting (Box Tab: Favoriting Leg 1, see TODO.md): a star toggle, same
 * gold-fill SVG path as TeamCard.tsx's own favorite button, persisted via
 * `onToggleFavorite` -> useSavedPokemon.ts's `toggleSavedPokemonFavorite`.
 * Rendered as a corner-overlay button directly on the sprite
 * (`absolute -top-1 -right-1`, same precedent as TeamCard.tsx's own
 * SP-cap-warning badge overlay on its roster sprites) rather than a
 * context-menu item, since it's a one-click toggle rather than an
 * occasional action and the tile has no header row to place a button in.
 * `stopPropagation` keeps the click from also firing `onExpand`.
 *
 * Drag-to-reorder (Box Tab: Reorder Leg 7, see TODO.md) - now via
 * framer-motion's Reorder.Item (Touch Drag-and-Drop: Framer Motion Reorder
 * Leg 1, see TODO.md), replacing the old native HTML5 draggable
 * implementation which never fired on touch at all. Only has an effect when
 * `canReorder` is true (BoxPage.tsx's Custom sort mode with no search filter
 * active - see its own header comment for why search disables it). The
 * whole tile (w-28, sprite+label, single click action) is draggable - low
 * click-ambiguity, unlike TeamCard's richer header, so no dedicated handle
 * is needed here.
 */

import { useState } from 'react';
import { toMotionDragProps, type GridReorderHandlers } from '../hooks/useGridReorder';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SavedPokemonEntry } from '../types/pokemon';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import { copyPokemonToClipboard } from '../utils/clipboardPayload';
import { DRAG_REORDER_TRANSITION } from '../config/motion';
import ExportTeamModal from './ExportTeamModal';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';

interface BoxCardProps {
  entry: SavedPokemonEntry;
  onExpand: () => void;
  onAddToTeam: () => void;
  onRename: (label: string) => Promise<boolean>;
  onDuplicate: () => Promise<boolean>;
  onToggleFavorite: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  // BoxPage.tsx owns the Reorder.Group's local order state (it wraps every
  // BoxCard), so this card only starts/commits its own drag - see its
  // header comment above.
  canReorder: boolean;
  reorderHandlers: GridReorderHandlers;
  resolveSprite: (remoteUrl: string) => string;
}

export default function BoxCard({
  entry,
  onExpand,
  onAddToTeam,
  onRename,
  onDuplicate,
  onToggleFavorite,
  onDelete,
  canReorder,
  reorderHandlers,
  resolveSprite,
}: BoxCardProps) {
  const { pokemon, label, favorite } = entry;

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(label);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // stopPropagation (Box Tab: Import via Right-Click Leg 5, see TODO.md)
  // keeps this from also bubbling up into BoxPage.tsx's own
  // anywhere-in-the-grid paste menu - same precedent PokemonCard.tsx's
  // per-slot context menu already established for TeamCard.tsx's grid-level
  // paste menu.
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

  // stopPropagation keeps this from also firing onExpand.
  const handleToggleFavorite = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  const favoriteButton = (
    <button
      type="button"
      onClick={handleToggleFavorite}
      title={favorite ? 'Unfavorite' : 'Favorite'}
      className={`absolute -top-1 -right-1 z-10 w-7 h-7 md:w-5 md:h-5 bg-zinc-800/90 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
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

  const sprite = (
    // relative wrapper scopes the favorite star's absolute positioning to
    // just the sprite itself (see header comment), sized to match it so
    // the corner overlay lands on the sprite regardless of the tile's
    // wider w-28 frame.
    <div className="relative w-16 h-16">
      <img
        src={resolveSprite(
          getPixelSpriteUrl(
            pokemon.pokedexNumber,
            pokemon.showdownData.species,
            pokemon.showdownData.gender || 'M',
            pokemon.showdownData.shiny,
          ),
        )}
        alt={pokemon.showdownData.species}
        draggable={false}
        className="w-16 h-16 object-contain [image-rendering:pixelated]"
      />
      {favoriteButton}
    </div>
  );

  return (
    // Reorder.Item (Touch Drag-and-Drop: Framer Motion Reorder Leg 1, see
    // TODO.md) provides its own FLIP animation on reorder, replacing the
    // old plain motion.div + layout="position" pairing. dragListener stays
    // on its default (true) rather than a manual dragControls.start()
    // pattern - this tile is a *dual-purpose* element (tap to expand AND
    // press-drag to reorder, same physical area, same as
    // MoveBubbleGrid.tsx's move bubbles), so it needs framer's own built-in
    // tap-vs-drag movement threshold to disambiguate the two, not an
    // exclusion list. Confirmed live via run-desktop: forcing
    // dragControls.start() unconditionally on pointerdown (this card's own
    // earlier attempt) has no movement threshold at all and swallowed the
    // plain click-to-expand outright. canReorder/isRenaming still gate
    // whether dragging can start at all.
    <motion.div
      layout="position"
      drag
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0}
      data-reorder-id={entry.id}
      dragListener={canReorder && !isRenaming}
      transition={DRAG_REORDER_TRANSITION}
      {...toMotionDragProps(reorderHandlers)}
    >
      <div
        onContextMenu={handleContextMenu}
        title={isRenaming ? undefined : label}
        className={`flex flex-col items-center gap-1 w-28 shrink-0 p-2 rounded-lg bg-zinc-700 border border-zinc-600 hover:border-accent-gold hover:bg-zinc-600 transition-colors select-none ${
          canReorder && !isRenaming ? 'cursor-grab' : ''
        }`}
      >
        {isRenaming ? (
          <>
            {sprite}
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
              className="w-full px-1 py-0.5 text-xs text-center bg-zinc-800 border border-accent-gold rounded text-zinc-100 outline-none"
            />
          </>
        ) : (
          // Plain div rather than a button (as this used to be) - the
          // favorite star above nests its own button on top of the sprite,
          // and a button-in-button isn't valid HTML.
          <div
            onClick={onExpand}
            className="flex flex-col items-center gap-1 w-full cursor-pointer"
          >
            {sprite}
            <span className="text-xs font-semibold text-zinc-200 truncate w-full text-center">
              {label}
            </span>
          </div>
        )}

        {contextMenu}
        {exportModal}
      </div>
    </motion.div>
  );
}
