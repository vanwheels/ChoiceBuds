/**
 * MobileBoxPokemonCard.tsx - Full-Screen Single Box Entry Page (Mobile Swipe Deck)
 *
 * Box Mobile: Compact Grid + Swipe Deck Leg 1 (see TODO.md's scoping doc,
 * docs/investigations/mobile-teams-box-card-view-scope.md). One page of
 * MobileBoxSwipeOverlay.tsx's horizontal deck - built on the same team-
 * agnostic EditablePokemonCore BoxCard.tsx (desktop) and
 * MobilePokemonCard.tsx (Teams' own mobile deck) already share, so nickname/
 * sprite/gender/shiny/item/ability/moves/EVs editing behaves identically
 * here.
 *
 * Not a reuse of MobilePokemonCard.tsx itself - that component is wired to a
 * team roster slot (Roster Swap, "remove from team", RealSetsButton keyed to
 * a team's regulation). A Box entry has none of that; its action set is
 * BoxCard.tsx's own (Rename/Duplicate/Add to Team/Favorite/Delete/Copy/
 * Export) instead. Favorite and Delete get dedicated top-row buttons (same
 * "pull the one-click/destructive actions out of the menu" split
 * MobilePokemonCard.tsx uses for its own Remove button); the rest live
 * behind "More", matching that component's no-right-click-on-touch
 * precedent.
 */

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { ImportedPokemonInfo, SavedPokemonEntry } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { RegulationId } from '../utils/pokemonRules';
import { getTypeGlowColors } from '../config/pokemonTheme';
import { copyPokemonToClipboard } from '../utils/clipboardPayload';
import EditablePokemonCore from './EditablePokemonCore';
import ExportTeamModal from './ExportTeamModal';
import ContextMenu from './ContextMenu';

interface MobileBoxPokemonCardProps {
  entry: SavedPokemonEntry;
  onUpdatePokemon: (updates: Partial<ImportedPokemonInfo>) => Promise<boolean>;
  onRename: (label: string) => Promise<boolean>;
  onDuplicate: () => Promise<boolean>;
  onToggleFavorite: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onAddToTeam: () => void;
  gameDataState: UseGameDataReturn;
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  showAnimatedSprites: boolean;
}

export default function MobileBoxPokemonCard({ entry, onUpdatePokemon, onRename, onDuplicate, onToggleFavorite, onDelete, onAddToTeam, gameDataState, rulesetId, resolveSprite, showAnimatedSprites }: MobileBoxPokemonCardProps) {
  const { pokemon, label, favorite } = entry;
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(label);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

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

  const [glowC1, glowC2] = getTypeGlowColors(pokemon.types);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-3">
      {/* Favorite/Delete/More action row - replaces BoxCard.tsx's corner
          favorite star and right-click menu (no right-click on touch) with a
          plain always-visible row, same shape as MobilePokemonCard.tsx's own
          Remove/More row. */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onToggleFavorite}
          title={favorite ? 'Unfavorite' : 'Favorite'}
          className={`flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 transition-colors cursor-pointer ${
            favorite ? 'text-accent-gold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="flex items-center justify-center gap-1.5 px-3 h-10 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer text-sm"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16" />
            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
            <path d="M10 11v6M14 11v6" />
          </svg>
          Delete
        </button>
        <button
          onClick={(e) => setContextMenuPos({ x: e.clientX, y: e.clientY })}
          title="More"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <circle cx="12" cy="5" r="1.6" fill="currentColor" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
            <circle cx="12" cy="19" r="1.6" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div
        className="type-glow-ring relative bg-zinc-700 rounded-xl p-4 flex flex-col gap-3 min-w-0"
        style={{ '--glow-c1': glowC1, '--glow-c2': glowC2 } as CSSProperties}
      >
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
      </div>

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

      {contextMenuPos && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onClose={() => setContextMenuPos(null)}
          items={[
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
          ]}
        />
      )}
    </div>
  );
}
