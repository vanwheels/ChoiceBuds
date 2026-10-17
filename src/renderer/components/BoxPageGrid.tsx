import type { ReactNode, RefObject, MouseEvent as ReactMouseEvent } from 'react';
import type { SavedPokemonEntry } from '../types/pokemon';
import type { GridReorderHandlers } from '../hooks/useGridReorder';
import type { UseSavedPokemonReturn } from '../hooks/useSavedPokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../hooks/useSettings';
import type { RegulationId } from '../utils/pokemonRules';
import BoxCard from './BoxCard';
import MobileBoxGrid from './MobileBoxGrid';

interface BoxPageGridProps {
  isLoading: boolean;
  error: string | null;
  displayedEntries: SavedPokemonEntry[];
  savedPokemonState: UseSavedPokemonReturn;
  gameDataState: UseGameDataReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
  rulesetId: RegulationId;
  emptyStateContent: ReactNode;
  onAddToTeam: (entryId: string) => void;
  onNewBuild: () => void;
  isBuildingSpecies: boolean;
  boxGridRef: RefObject<HTMLDivElement | null>;
  getBoxHandlers: (id: string) => GridReorderHandlers;
  orderedEntryIds: string[];
  canReorder: boolean;
  onGridContextMenu: (e: ReactMouseEvent<HTMLDivElement>) => void;
}

// Loading/error states plus the mobile compact grid and desktop
// Reorder.Group card grid (2D hit-test reorder via useGridReorder.ts, Web
// Reorder Jank Leg 2) - split out of BoxPage.tsx (File Cap Splits:
// BoxPage.tsx, see TODO.md) with no behavior change.
export default function BoxPageGrid({
  isLoading,
  error,
  displayedEntries,
  savedPokemonState,
  gameDataState,
  spriteCacheState,
  settingsState,
  rulesetId,
  emptyStateContent,
  onAddToTeam,
  onNewBuild,
  isBuildingSpecies,
  boxGridRef,
  getBoxHandlers,
  orderedEntryIds,
  canReorder,
  onGridContextMenu,
}: BoxPageGridProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6" style={{ scrollbarGutter: 'stable' }}>
      {/* min-h-[calc(100%+1px)] - same iOS Safari stuck-scroll fix as
          TeamsPage.tsx's content container (see its own comment) - a box
          with very few saved builds could hit the same exact-height
          coincidence. */}
      <div className="min-h-[calc(100%+1px)]">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-zinc-400">Loading box...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-400">Error: {error}</div>
          </div>
        ) : (
          <>
            {/* Compact sprite/favorite/name grid - mobile only (Box Mobile:
            Compact Grid + Swipe Deck leg, see TODO.md). Renders instead of
            the desktop Reorder.Group grid below, not a responsive variant
            of it - no drag-reorder here (out of scope, see
            MobileBoxGrid.tsx's header), tapping a tile opens
            MobileBoxSwipeOverlay.tsx at that tile's index. */}
            <div className="md:hidden">
              <MobileBoxGrid
                entries={displayedEntries}
                savedPokemonState={savedPokemonState}
                gameDataState={gameDataState}
                rulesetId={rulesetId}
                resolveSprite={spriteCacheState.resolveSprite}
                showAnimatedSprites={settingsState.settings.showAnimatedSprites}
                onAddToTeam={onAddToTeam}
                onNewBuild={onNewBuild}
                isBuildingSpecies={isBuildingSpecies}
                emptyStateContent={emptyStateContent}
              />
            </div>

            {/* 2D hit-test reorder (useGridReorder.ts, Web Reorder Jank Leg 2). */}
            <div
              ref={boxGridRef}
              className="hidden md:flex flex-wrap gap-4 items-start"
              onContextMenu={onGridContextMenu}
            >
              <button
                onClick={onNewBuild}
                disabled={isBuildingSpecies}
                className="w-28 min-h-28 shrink-0 flex items-center justify-center text-center rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >
                <span className="text-xs font-semibold px-1">
                  {isBuildingSpecies ? 'Building…' : '+ New Build'}
                </span>
              </button>

              {emptyStateContent && (
                <div className="flex flex-col justify-center text-zinc-400 px-2 min-h-28">
                  {emptyStateContent}
                </div>
              )}

              {orderedEntryIds.map((id) => {
                const entry = displayedEntries.find((e) => e.id === id);
                if (!entry) return null;
                return (
                  <BoxCard
                    key={id}
                    entry={entry}
                    isExpanded={savedPokemonState.expandedCardIds.has(entry.id)}
                    onToggleExpand={() => savedPokemonState.toggleCardExpansion(entry.id)}
                    onUpdatePokemon={(updates) =>
                      savedPokemonState.updateSavedPokemon(entry.id, updates)
                    }
                    onAddToTeam={() => onAddToTeam(entry.id)}
                    onRename={(label) => savedPokemonState.renameSavedPokemon(entry.id, label)}
                    onDuplicate={() => savedPokemonState.duplicateSavedPokemon(entry.id)}
                    onToggleFavorite={() => savedPokemonState.toggleSavedPokemonFavorite(entry.id)}
                    onDelete={() => savedPokemonState.deleteSavedPokemon(entry.id)}
                    canReorder={canReorder}
                    reorderHandlers={getBoxHandlers(id)}
                    gameDataState={gameDataState}
                    rulesetId={rulesetId}
                    resolveSprite={spriteCacheState.resolveSprite}
                    showAnimatedSprites={settingsState.settings.showAnimatedSprites}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
