/**
 * MobilePokemonCard.tsx - Full-Screen Single Pokémon Page (Mobile Swipe Deck)
 *
 * Full-Screen Swipeable Pokémon Card + Teams List View Leg 1 (see TODO.md's
 * scoping doc, docs/investigations/mobile-teams-box-card-view-scope.md).
 * One page of MobileTeamSwipeOverlay.tsx's horizontal deck - built on the
 * same team-agnostic EditablePokemonCore PokemonCard.tsx (desktop roster
 * slot) and BoxCard.tsx (Box entry) already share, so nickname/sprite/
 * gender/shiny/item/ability/moves/EVs editing behaves identically here.
 *
 * Deliberately NOT a fullscreen mode bolted onto PokemonCard.tsx itself -
 * that component's Reorder.Item + pointerdown drag-start scaffolding exists
 * for the desktop roster grid's drag-to-reorder, which has no equivalent
 * here (paging between Pokémon is the overlay's own horizontal swipe, not a
 * roster-position drag) - keeping this a separate component means zero risk
 * to the desktop card while building this one, matching the milestone's own
 * "mobile-only, desktop untouched" scope decision.
 *
 * Carries over roster-slot actions a mobile user would otherwise lose
 * relative to desktop: Roster Swap (tap sprite), Remove from team, Real
 * Sets Seen, and the Copy/Paste/Export/Save to Library context menu -
 * everything PokemonCard.tsx offers except drag-reorder, which has no
 * mobile equivalent to begin with.
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { ImportedPokemonInfo, SavedPokemonEntry, Team, SpeciesRosterEntry, VgcRealSetBundle } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseRosterActionsReturn } from '../hooks/useRosterActions';
import type { UseSavedPokemonReturn } from '../hooks/useSavedPokemon';
import type { UseVgcPastesCacheReturn } from '../hooks/useVgcPastesCache';
import type { UseVgcRealSetsCacheReturn } from '../hooks/useVgcRealSetsCache';
import EditablePokemonCore from './EditablePokemonCore';
import SpeciesPickerCard from './SpeciesPickerCard';
import SavedSetPicker from './SavedSetPicker';
import RealSetsButton from './RealSetsButton';
import ExportTeamModal from './ExportTeamModal';
import SaveToLibraryDialog from './SaveToLibraryDialog';
import ContextMenu from './ContextMenu';
import { toRegulationId } from '../utils/pokemonRules';
import { realSetBundleToShowdownUpdates } from '../utils/teamRealSetImport';
import { copyPokemonToClipboard, readPokemonFromClipboard } from '../utils/clipboardPayload';

interface MobilePokemonCardProps {
  pokemon: ImportedPokemonInfo;
  team: Team;
  pokemonIndex: number;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<boolean>;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  rosterActions: UseRosterActionsReturn;
  savedPokemonState: UseSavedPokemonReturn;
  vgcPastesState: UseVgcPastesCacheReturn;
  vgcRealSetsState: UseVgcRealSetsCacheReturn;
  showAnimatedSprites: boolean;
}

export default function MobilePokemonCard({ pokemon, team, pokemonIndex, updateTeam, gameDataState, speciesRosterState, spriteCacheState, rosterActions, savedPokemonState, vgcPastesState, vgcRealSetsState, showAnimatedSprites }: MobilePokemonCardProps) {
  const { showdownData } = pokemon;
  const [isSwapPickerOpen, setIsSwapPickerOpen] = useState(false);
  // Same "saved builds for this species" offer PokemonCard.tsx's own Roster
  // Swap uses - see its header comment.
  const [savedSetPickerSpecies, setSavedSetPickerSpecies] = useState<SpeciesRosterEntry | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSaveToLibraryOpen, setIsSaveToLibraryOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const rulesetId = toRegulationId(team.format);

  const updatePokemon = async (updates: Partial<ImportedPokemonInfo>): Promise<boolean> => {
    const updatedPokemon = [...team.pokemon];
    updatedPokemon[pokemonIndex] = { ...updatedPokemon[pokemonIndex], ...updates };
    return updateTeam(team.id, { pokemon: updatedPokemon });
  };

  const handleSwapSelect = async (species: SpeciesRosterEntry) => {
    setIsSwapPickerOpen(false);
    const savedSets = savedPokemonState.getSavedSetsForSpecies(species.name);
    if (savedSets.length > 0) {
      setSavedSetPickerSpecies(species);
      return;
    }
    await rosterActions.swapSlot(team, pokemonIndex, species.name);
  };

  const handleSwapBlank = async () => {
    if (!savedSetPickerSpecies) return;
    const species = savedSetPickerSpecies.name;
    setSavedSetPickerSpecies(null);
    await rosterActions.swapSlot(team, pokemonIndex, species);
  };

  const handleSwapPickSaved = async (entry: SavedPokemonEntry) => {
    setSavedSetPickerSpecies(null);
    await rosterActions.loadSavedSet(team, pokemonIndex, entry);
  };

  const handleDelete = async () => {
    await rosterActions.removeSlot(team, pokemonIndex);
  };

  const handleCopyPokemon = async () => {
    await copyPokemonToClipboard(pokemon);
  };

  const handleSaveToLibrary = async (label: string): Promise<boolean> => {
    return savedPokemonState.addSavedPokemonBatch([pokemon], [label]);
  };

  const handlePickRealSet = async (bundle: VgcRealSetBundle) => {
    await updatePokemon({ showdownData: { ...pokemon.showdownData, ...realSetBundleToShowdownUpdates(bundle) } });
  };

  const handlePastePokemon = async () => {
    const pasted = await readPokemonFromClipboard();
    if (!pasted) return;
    const updatedPokemon = [...team.pokemon];
    updatedPokemon[pokemonIndex] = { ...pasted, id: crypto.randomUUID() };
    await updateTeam(team.id, { pokemon: updatedPokemon });
  };

  if (isSwapPickerOpen) {
    return (
      <SpeciesPickerCard
        roster={speciesRosterState.roster}
        rulesetId={rulesetId}
        resolveSprite={spriteCacheState.resolveSprite}
        onSelect={handleSwapSelect}
        onClose={() => setIsSwapPickerOpen(false)}
      />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-3">
      {/* Remove/More action row - replaces PokemonCard.tsx's corner-positioned
          × button and right-click menu (no right-click on touch) with a
          plain always-visible row, since this card fills the screen rather
          than a small grid slot with spare corner room. */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={handleDelete}
          title="Remove from team"
          className="flex items-center justify-center gap-1.5 px-3 h-10 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer text-sm"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16" />
            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
            <path d="M10 11v6M14 11v6" />
          </svg>
          Remove
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

      <div className="relative bg-zinc-700 rounded-xl p-4 flex flex-col gap-3 min-w-0">
        <EditablePokemonCore
          pokemon={pokemon}
          onUpdatePokemon={updatePokemon}
          gameDataState={gameDataState}
          rulesetId={rulesetId}
          resolveSprite={spriteCacheState.resolveSprite}
          showAnimatedSprites={showAnimatedSprites}
          onSpriteClick={() => setIsSwapPickerOpen(true)}
          spriteOverlay={
            savedSetPickerSpecies && (
              <SavedSetPicker
                species={savedSetPickerSpecies.name}
                sets={savedPokemonState.getSavedSetsForSpecies(savedSetPickerSpecies.name)}
                resolveSprite={spriteCacheState.resolveSprite}
                onPick={handleSwapPickSaved}
                onBlank={handleSwapBlank}
                onClose={() => setSavedSetPickerSpecies(null)}
                align="center"
              />
            )
          }
        />

        <RealSetsButton
          species={showdownData.species}
          item={showdownData.item}
          regulation={team.format}
          vgcPastesState={vgcPastesState}
          vgcRealSetsState={vgcRealSetsState}
          onPickBundle={handlePickRealSet}
        />
      </div>

      <AnimatePresence>
        {isExportOpen && (
          <ExportTeamModal
            pokemonList={[showdownData]}
            title={`Export ${showdownData.nickname || showdownData.species}`}
            pasteTitle={showdownData.nickname || showdownData.species}
            onClose={() => setIsExportOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSaveToLibraryOpen && (
          <SaveToLibraryDialog
            pokemon={pokemon}
            resolveSprite={spriteCacheState.resolveSprite}
            onSave={handleSaveToLibrary}
            onClose={() => setIsSaveToLibraryOpen(false)}
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
              label: 'Paste Pokémon',
              onClick: handlePastePokemon,
              icon: (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 4.5h1.5a1.5 1.5 0 0 1 3 0H15a1 1 0 0 1 1 1V7H8V5.5a1 1 0 0 1 1-1Z" />
                  <path d="M8 6H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 18 6h-2" />
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
              label: 'Save to Library',
              onClick: () => setIsSaveToLibraryOpen(true),
              icon: (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3.75A1.75 1.75 0 0 1 7.75 2h8.5A1.75 1.75 0 0 1 18 3.75V21l-6-3.5L6 21V3.75Z" />
                </svg>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
