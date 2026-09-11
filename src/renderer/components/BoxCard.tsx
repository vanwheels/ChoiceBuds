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
 */

import { useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import type { ImportedPokemonInfo, SavedPokemonEntry } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { RegulationId } from '../utils/pokemonRules';
import { getTypeGlowColors } from '../config/pokemonTheme';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import EditablePokemonCore from './EditablePokemonCore';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';

interface BoxCardProps {
  entry: SavedPokemonEntry;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdatePokemon: (updates: Partial<ImportedPokemonInfo>) => Promise<boolean>;
  onAddToTeam: () => void;
  onRename: (label: string) => Promise<boolean>;
  onDuplicate: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  gameDataState: UseGameDataReturn;
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  showAnimatedSprites: boolean;
}

export default function BoxCard({ entry, isExpanded, onToggleExpand, onUpdatePokemon, onAddToTeam, onRename, onDuplicate, onDelete, gameDataState, rulesetId, resolveSprite, showAnimatedSprites }: BoxCardProps) {
  const { pokemon, label } = entry;

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(label);

  const handleContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
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

  const menuItems: ContextMenuItem[] = [
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

  if (!isExpanded) {
    const sprite = (
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
    );

    return (
      <div
        onContextMenu={handleContextMenu}
        title={isRenaming ? undefined : label}
        className="flex flex-col items-center gap-1 w-28 shrink-0 p-2 rounded-lg bg-zinc-700 border border-zinc-600 hover:border-accent-gold hover:bg-zinc-600 transition-colors"
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
          <button type="button" onClick={onToggleExpand} className="flex flex-col items-center gap-1 w-full cursor-pointer">
            {sprite}
            <span className="text-xs font-semibold text-zinc-200 truncate w-full text-center">{label}</span>
          </button>
        )}

        {contextMenu}
      </div>
    );
  }

  const [glowC1, glowC2] = getTypeGlowColors(pokemon.types);

  return (
    <div className="type-glow-ring w-[280px] shrink-0" style={{ '--glow-c1': glowC1, '--glow-c2': glowC2 } as CSSProperties}>
      <div className="relative bg-zinc-700 rounded-[11px] p-3 flex flex-col gap-3 min-w-0" onContextMenu={handleContextMenu}>
        <button
          onClick={onToggleExpand}
          title="Collapse"
          className="absolute -top-2.5 -right-2.5 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-600 text-zinc-500 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer text-sm"
        >
          ×
        </button>

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
      </div>
    </div>
  );
}
