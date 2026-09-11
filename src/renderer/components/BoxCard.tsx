/**
 * BoxCard.tsx - One Box Tab Entry, Collapsed Tile or Expanded Editable Card
 *
 * Box Tab Leg 1 (see TODO.md). Collapsed default: just the sprite + the
 * saved entry's own `label` (distinct from the pokemon's `nickname` -
 * EditablePokemonCore.tsx shows the nickname once expanded). Expanded:
 * the same team-agnostic editable core PokemonCard.tsx uses for a roster
 * slot, wrapped in the same type-glow card shell, persisting edits through
 * `onUpdatePokemon` -> useSavedPokemon.ts's `updateSavedPokemon`.
 *
 * No roster-specific chrome (Roster Swap, drag-reorder) - a Box entry isn't
 * a roster slot. Rename/duplicate/delete (Box Tab Leg 3, see TODO.md) are a
 * right-click context menu in both the collapsed and expanded states,
 * same ContextMenu.tsx shell PokemonCard.tsx's own right-click menu uses -
 * these used to only be reachable via Calc's Saved Pokémon Sets modal.
 * Rename is inline (click "Rename" then edit in place, same pattern
 * CalcSavedSetsModal.tsx's own management list already used) rather than a
 * separate dialog.
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
 * Rendered as a corner-overlay button in both card states rather than a
 * context-menu item, since it's a one-click toggle rather than an
 * occasional action: collapsed tiles get it directly on the sprite
 * (`absolute -top-1 -right-1`, same precedent as TeamCard.tsx's own
 * SP-cap-warning badge overlay on its roster sprites) since the tile has no
 * header row to place a button in; expanded cards get a third floating
 * corner button at bottom-left (`-bottom-2.5 -left-2.5`, same circular w-6
 * h-6 style as the collapse button) since top-right is the collapse button
 * and top-left is the Custom-mode-only drag handle - favorite has to render
 * in every sort mode, so it can't share top-left with the handle. Both
 * call `stopPropagation` so the click doesn't also fire `onToggleExpand`
 * (collapsed) or bubble into the card's own `onContextMenu` region.
 *
 * Drag-to-reorder (Box Tab: Reorder Leg 7, see TODO.md) only has an effect
 * in BoxPage.tsx's Custom sort mode - `sortMode` gates both the drag
 * *source* (collapsed tile / expanded grip handle aren't `draggable` in
 * Alphabetical mode) and the drop target (handleDragOver bails immediately
 * if not Custom, same as it would anyway once nothing sets the payload, but
 * explicit rather than relying on that). Drag affordance is split by card
 * state: the collapsed tile (w-28, sprite+label, single click action) is
 * draggable as a whole - low click-ambiguity, unlike TeamCard's richer
 * header, so no dedicated handle is needed there. The expanded card (a
 * busier interactive surface: rename, context menu, editable fields) gets a
 * dedicated grip handle instead, mirroring TeamCard.tsx's controls-pill
 * handle - same grip-icon glyph, same "only the handle is a drag source, any
 * part of the card can still be a drop target" split.
 */

import { useState } from 'react';
import type { CSSProperties, DragEvent, MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BoxSortMode, ImportedPokemonInfo, SavedPokemonEntry } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { RegulationId } from '../utils/pokemonRules';
import { getTypeGlowColors } from '../config/pokemonTheme';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import { copyPokemonToClipboard } from '../utils/clipboardPayload';
import { BOX_DRAG_TYPE, type BoxDragPayload } from '../utils/boxDragTypes';
import { DRAG_REORDER_TRANSITION } from '../config/motion';
import EditablePokemonCore from './EditablePokemonCore';
import ExportTeamModal from './ExportTeamModal';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';

interface BoxCardProps {
  entry: SavedPokemonEntry;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdatePokemon: (updates: Partial<ImportedPokemonInfo>) => Promise<boolean>;
  onAddToTeam: () => void;
  onRename: (label: string) => Promise<boolean>;
  onDuplicate: () => Promise<boolean>;
  onToggleFavorite: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onReorder: (draggedId: string, targetId: string) => void;
  sortMode: BoxSortMode;
  gameDataState: UseGameDataReturn;
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  showAnimatedSprites: boolean;
}

export default function BoxCard({ entry, isExpanded, onToggleExpand, onUpdatePokemon, onAddToTeam, onRename, onDuplicate, onToggleFavorite, onDelete, onReorder, sortMode, gameDataState, rulesetId, resolveSprite, showAnimatedSprites }: BoxCardProps) {
  const { pokemon, label, favorite } = entry;
  const isCustomOrder = sortMode === 'custom';

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(label);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    const payload: BoxDragPayload = { draggedId: entry.id };
    e.dataTransfer.setData(BOX_DRAG_TYPE, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!isCustomOrder || !e.dataTransfer.types.includes(BOX_DRAG_TYPE)) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!isCustomOrder) return;
    e.preventDefault();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData(BOX_DRAG_TYPE);
    if (!raw) return;
    try {
      const payload: BoxDragPayload = JSON.parse(raw);
      if (payload.draggedId !== entry.id) {
        onReorder(payload.draggedId, entry.id);
      }
    } catch {
      // malformed/foreign drag payload - ignore
    }
  };

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

  // stopPropagation keeps this from also firing onToggleExpand (collapsed
  // tile) or the card's own onContextMenu region (expanded card) - see
  // header comment.
  const handleToggleFavorite = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  const favoriteButton = (className: string) => (
    <button
      type="button"
      onClick={handleToggleFavorite}
      title={favorite ? 'Unfavorite' : 'Favorite'}
      className={`${className} flex items-center justify-center rounded-full transition-colors cursor-pointer ${
        favorite ? 'text-accent-gold hover:text-accent-gold-deep' : 'text-zinc-400 hover:text-zinc-200'
      }`}
    >
      <svg viewBox="0 0 24 24" width="12" height="12" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
      </svg>
    </button>
  );

  const menuItems: ContextMenuItem[] = [
    {
      label: 'Copy Pokémon',
      onClick: handleCopyPokemon,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="11" height="11" rx="1.5" />
          <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
        </svg>
      ),
    },
    {
      label: 'Export',
      onClick: () => setIsExportOpen(true),
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      ),
    },
    {
      label: 'Duplicate',
      onClick: onDuplicate,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16" />
          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      ),
    },
  ];

  const contextMenu = contextMenuPos && (
    <ContextMenu x={contextMenuPos.x} y={contextMenuPos.y} onClose={() => setContextMenuPos(null)} items={menuItems} />
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

  if (!isExpanded) {
    const sprite = (
      // relative wrapper scopes the favorite star's absolute positioning to
      // just the sprite itself (see header comment), sized to match it so
      // the corner overlay lands on the sprite regardless of the tile's
      // wider w-28 frame.
      <div className="relative w-16 h-16">
        <img
          src={resolveSprite(getPixelSpriteUrl(
            pokemon.pokedexNumber,
            pokemon.showdownData.species,
            pokemon.showdownData.gender || 'M',
            pokemon.showdownData.shiny
          ))}
          alt={pokemon.showdownData.species}
          draggable={false}
          className="w-16 h-16 object-contain [image-rendering:pixelated]"
        />
        {favoriteButton('absolute -top-1 -right-1 z-10 w-5 h-5 bg-zinc-800/90')}
      </div>
    );

    return (
      // motion.div wraps purely for the layout="position" FLIP animation -
      // the native HTML5 drag handlers (draggable/onDragStart in particular)
      // live on the plain inner div instead since framer-motion's own
      // onDragStart prop (for its pan/drag gesture, unused here) has an
      // incompatible signature and would conflict on the motion.div itself.
      <motion.div layout="position" transition={DRAG_REORDER_TRANSITION}>
        <div
          draggable={isCustomOrder && !isRenaming}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onContextMenu={handleContextMenu}
          title={isRenaming ? undefined : label}
          className={`flex flex-col items-center gap-1 w-28 shrink-0 p-2 rounded-lg bg-zinc-700 border border-zinc-600 hover:border-accent-gold hover:bg-zinc-600 transition-colors ${
            isCustomOrder ? 'cursor-grab' : ''
          } ${isDragOver ? 'ring-2 ring-inset ring-accent-gold' : ''}`}
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
            // favorite star above nests its own button on top of the
            // sprite, and a button-in-button isn't valid HTML.
            <div onClick={onToggleExpand} className="flex flex-col items-center gap-1 w-full cursor-pointer">
              {sprite}
              <span className="text-xs font-semibold text-zinc-200 truncate w-full text-center">{label}</span>
            </div>
          )}

          {contextMenu}
          {exportModal}
        </div>
      </motion.div>
    );
  }

  const [glowC1, glowC2] = getTypeGlowColors(pokemon.types);

  return (
    <motion.div
      layout="position"
      transition={DRAG_REORDER_TRANSITION}
      className="type-glow-ring w-[280px] shrink-0"
      style={{ '--glow-c1': glowC1, '--glow-c2': glowC2 } as CSSProperties}
    >
      <div
        className={`relative bg-zinc-700 rounded-[11px] p-3 flex flex-col gap-3 min-w-0 ${isDragOver ? 'ring-2 ring-inset ring-accent-gold' : ''}`}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <button
          onClick={onToggleExpand}
          title="Collapse"
          className="absolute -top-2.5 -right-2.5 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-600 text-zinc-500 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer text-sm"
        >
          ×
        </button>

        {/* Drag handle (Box Tab: Reorder Leg 7, see TODO.md) - mirrors
            TeamCard.tsx's controls-pill handle. Only rendered in Custom
            order mode; the expanded card's busier surface (rename, context
            menu, editable fields) means the whole card can't double as a
            drag source the way the collapsed tile does. */}
        {isCustomOrder && (
          <div
            draggable
            onDragStart={handleDragStart}
            title="Drag to reorder"
            className="absolute -top-2.5 -left-2.5 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-600 text-zinc-400 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-grab"
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <circle cx="9" cy="6" r="1.4" />
              <circle cx="15" cy="6" r="1.4" />
              <circle cx="9" cy="12" r="1.4" />
              <circle cx="15" cy="12" r="1.4" />
              <circle cx="9" cy="18" r="1.4" />
              <circle cx="15" cy="18" r="1.4" />
            </svg>
          </div>
        )}

        {/* Favorite toggle (Box Tab: Favoriting Leg 1, see TODO.md) - bottom-
            left is unclaimed in every sort mode (top-right is Collapse,
            top-left is the Custom-mode-only drag handle above), so favorite
            lives here instead of competing with the handle for top-left. */}
        {favoriteButton('absolute -bottom-2.5 -left-2.5 z-10 w-6 h-6 border border-zinc-600 bg-zinc-800 hover:border-accent-gold')}

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
          <p className="text-center text-xs font-bold text-accent-gold uppercase tracking-wide truncate px-4">{label}</p>
        )}

        <EditablePokemonCore
          pokemon={pokemon}
          onUpdatePokemon={onUpdatePokemon}
          gameDataState={gameDataState}
          rulesetId={rulesetId}
          resolveSprite={resolveSprite}
          showAnimatedSprites={showAnimatedSprites}
        />

        {contextMenu}
        {exportModal}
      </div>
    </motion.div>
  );
}
