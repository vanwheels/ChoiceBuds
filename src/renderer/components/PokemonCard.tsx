/**
 * PokemonCard.tsx - Thin Roster-Chrome Wrapper Around EditablePokemonCore
 *
 * The nickname input, gender/shiny toggles, sprite/type badges, and item/
 * ability/moves/EVs editing itself live in `EditablePokemonCore` (Extract
 * Editable Pokémon Card Core Leg 1, see TODO.md) - this component owns only
 * what's specific to a roster slot: Roster Swap (+ its SavedSetPicker
 * popover), remove-from-team, drag-reorder, the right-click context menu
 * (Export/Copy/Paste/Save to Library), and the outer card shell/glow ring
 * those all hang off of.
 *
 * Receives `team`/`updateTeam`/`gameDataState`/`speciesRosterState`/`rosterActions`
 * as props from TeamCard rather than calling useTeams()/useGameData() itself -
 * see TeamCard.tsx for why a second hook instance here would desync from what's
 * actually on screen.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CSSProperties, DragEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { ImportedPokemonInfo, SavedPokemonEntry, Team, SpeciesRosterEntry } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseRosterActionsReturn } from '../hooks/useRosterActions';
import type { UseSavedPokemonReturn } from '../hooks/useSavedPokemon';
import { getTypeGlowColors } from '../config/pokemonTheme';
import EditablePokemonCore from './EditablePokemonCore';
import SpeciesPickerCard from './SpeciesPickerCard';
import SavedSetPicker from './SavedSetPicker';
import ExportTeamModal from './ExportTeamModal';
import SaveToLibraryDialog from './SaveToLibraryDialog';
import ContextMenu from './ContextMenu';
import { toRegulationId } from '../utils/pokemonRules';
import { TEAM_ROSTER_DRAG_TYPE, type TeamRosterDragPayload } from '../utils/teamRosterDragTypes';
import { DRAG_REORDER_TRANSITION } from '../config/motion';
import { copyPokemonToClipboard, readPokemonFromClipboard } from '../utils/clipboardPayload';

interface PokemonCardProps {
  pokemon: ImportedPokemonInfo;
  team: Team;
  pokemonIndex: number;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<boolean>;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  rosterActions: UseRosterActionsReturn;
  savedPokemonState: UseSavedPokemonReturn;
  showAnimatedSprites: boolean;
}

export default function PokemonCard({ pokemon, team, pokemonIndex, updateTeam, gameDataState, speciesRosterState, spriteCacheState, rosterActions, savedPokemonState, showAnimatedSprites }: PokemonCardProps) {
  const { showdownData, types } = pokemon;
  const [isSwapPickerOpen, setIsSwapPickerOpen] = useState(false);
  // Set the instant a Roster Swap lands on a species with 1+ saved builds
  // (useSavedPokemon.ts) - offers a choice between those and the usual
  // fresh usage-based default before committing the swap (Saved Builds
  // Database for Team-Building Leg 1, see TODO.md). null the rest of the
  // time, including right after the swap picker closes with no matches.
  const [savedSetPickerSpecies, setSavedSetPickerSpecies] = useState<SpeciesRosterEntry | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  // "Save to Library" context-menu item (Save-to-Library Name Prompt Leg 1,
  // see TODO.md) - opens the shared name-prompt dialog directly, since this
  // Pokémon (unlike Calc's) is already a real ImportedPokemonInfo with no
  // enrichment step needed first.
  const [isSaveToLibraryOpen, setIsSaveToLibraryOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  // Export moved out of the corner into a right-click context menu (Card
  // Action Button Placement Leg 1, see TODO.md) - null when closed, the
  // click's own coordinates (not the card's rect) while open, since
  // ContextMenu positions itself at literal click coordinates.
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const rulesetId = toRegulationId(team.format);
  const [glowC1, glowC2] = getTypeGlowColors(types);
  const glowRingStyle = { '--glow-c1': glowC1, '--glow-c2': glowC2 } as CSSProperties;

  // Passed into EditablePokemonCore as its injected persistence callback -
  // operates on the whole ImportedPokemonInfo (not just showdownData) since
  // the gender toggle there also needs to rewrite the top-level `spriteUrl`
  // field for form-divergent species.
  const updatePokemon = async (updates: Partial<ImportedPokemonInfo>): Promise<boolean> => {
    const updatedPokemon = [...team.pokemon];
    updatedPokemon[pokemonIndex] = { ...updatedPokemon[pokemonIndex], ...updates };
    return updateTeam(team.id, { pokemon: updatedPokemon });
  };

  // Real list-click on a species with 1+ saved builds opens SavedSetPicker
  // for a choice between those and a fresh default, instead of committing
  // the swap immediately - same "offer a saved-set choice on real selection"
  // pattern CalcPokemonPanel.tsx's own species Autocomplete already uses.
  const handleSwapSelect = async (species: SpeciesRosterEntry) => {
    setIsSwapPickerOpen(false);
    const savedSets = savedPokemonState.getSavedSetsForSpecies(species.name);
    if (savedSets.length > 0) {
      setSavedSetPickerSpecies(species);
      return;
    }
    await rosterActions.swapSlot(team, pokemonIndex, species.name);
  };

  // "Blank" on the saved-set popover: same fresh usage-based default a
  // species with no saved builds gets immediately above.
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

  // Quick Copy/Paste Pokémon via Right-Click (Leg 1, see TODO.md) - internal
  // JSON round-trip (utils/clipboardPayload.ts), not the Showdown-text export
  // above. Paste replaces just this slot's set in place (same array position,
  // fresh id so it doesn't collide with the id still sitting in the clipboard
  // payload or any other slot pasted from the same copy) - silently a no-op
  // if the clipboard doesn't hold a ChoiceBuds Pokémon payload.
  const handleCopyPokemon = async () => {
    await copyPokemonToClipboard(pokemon);
  };

  const handleSaveToLibrary = async (label: string): Promise<boolean> => {
    return savedPokemonState.addSavedPokemonBatch([pokemon], [label]);
  };

  const handlePastePokemon = async () => {
    const pasted = await readPokemonFromClipboard();
    if (!pasted) return;
    const updatedPokemon = [...team.pokemon];
    updatedPokemon[pokemonIndex] = { ...pasted, id: crypto.randomUUID() };
    await updateTeam(team.id, { pokemon: updatedPokemon });
  };

  // Right-click opens the Export context menu instead of the OS/browser's
  // native one (Card Action Button Placement Leg 1, see TODO.md).
  // stopPropagation (Quick Copy/Paste Leg 2, see TODO.md) keeps this from
  // also bubbling up into TeamCard.tsx's own roster-grid "Paste Pokémon"
  // menu - a right-click that lands on an actual card should only ever open
  // this card's own menu, never both stacked on top of each other.
  const handleContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  // Roster reorder via drag-and-drop (Always-On Editing Leg 2, see TODO.md) -
  // draggable now lives on the whole card div below rather than a dedicated
  // grip-handle icon (Pokémon Card Drag Without Handle Leg 1, see TODO.md).
  // The prior whole-card attempt was reverted for click/drag ambiguity, but
  // the actual cause wasn't HTML5's own click-vs-drag disambiguation (that
  // already works cleanly for MoveBubbleGrid.tsx's move-bubble drag, which
  // is simultaneously a click target and a drag source) - it was `draggable`
  // on a container with no exclusion logic for its natively-draggable/
  // text-selectable descendants. Bailing out here when the drag actually
  // started on an input/button/[data-no-drag] element is what fixes that:
  // nickname input and the delete button are native `input`/`button`
  // elements already covered by the selector; the sprite/swap box and
  // gender/shiny corner badges and EditOverlays' item/ability pills carry
  // `data-no-drag` explicitly. Same MIME-type-payload pattern as the Battle
  // Logger roster drag (utils/dragTypes.ts) and Calc team tray drag
  // (utils/calcDragTypes.ts). teamId travels in the payload (not the type
  // string itself) since a mismatched-team drop is checked on `drop`, not
  // shown live during `dragover` - unlike those two, dragging between two
  // different teams' cards has no valid outcome to preview either way.
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('input, button, [data-no-drag]')) {
      e.preventDefault();
      return;
    }
    const payload: TeamRosterDragPayload = { teamId: team.id, fromIndex: pokemonIndex };
    e.dataTransfer.setData(TEAM_ROSTER_DRAG_TYPE, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(TEAM_ROSTER_DRAG_TYPE)) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData(TEAM_ROSTER_DRAG_TYPE);
    if (!raw) return;
    try {
      const payload: TeamRosterDragPayload = JSON.parse(raw);
      if (payload.teamId === team.id && payload.fromIndex !== pokemonIndex) {
        rosterActions.reorderSlot(team, payload.fromIndex, pokemonIndex);
      }
    } catch {
      // malformed/foreign drag payload - ignore
    }
  };

  // Roster Swap fills this slot with an in-card species picker rather than
  // floating a dropdown under the sprite - see SpeciesPickerCard.tsx
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
    // Outer ring wraps the actual card in a soft per-type colored glow (see
    // config/pokemonTheme.ts::getTypeGlowColors + index.css's .type-glow-ring) -
    // a dual-type Pokemon blends both type colors via one shared gradient.
    // This replaces the card's own flat border; the inner card below carries
    // no border of its own, only its background/radius/padding.
    // layout="position" (leg 4, see TODO.md): animates this card sliding to its
    // new grid slot when reorderSlot changes roster order (position delta only -
    // NOT plain `layout`, which would also try to FLIP-animate this card's own
    // size if its content ever changes height).
    <motion.div layout="position" transition={DRAG_REORDER_TRANSITION} className="type-glow-ring max-w-[280px] min-w-0" style={glowRingStyle}>
      <div
        data-pokemon-card
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onContextMenu={handleContextMenu}
        className={`relative bg-zinc-700 rounded-[11px] p-3 flex flex-col gap-3 min-w-0 transition-colors cursor-grab ${isDragOver ? 'ring-2 ring-accent-gold' : ''}`}
      >
        {/* Left-Shifting Slot Deletion - permanently on (Always-On Editing Leg 2,
            see TODO.md). Centered on the card's top-right corner with a negative
            offset (Card Action Button Placement Leg 1, see TODO.md) - sits outside
            the card's rounded border rather than inset from it, now that Export
            (below) has moved out of this corner entirely and left it free. */}
        <button
          onClick={handleDelete}
          title="Remove from roster"
          className="absolute -top-2.5 -right-2.5 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-600 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer text-sm"
        >
          ×
        </button>

        {/* Nickname/sprite/type badges/item-ability-moves/EVs - the team-agnostic
            editable core, shared with a future saved-library card (Extract
            Editable Pokémon Card Core Leg 1, see TODO.md). `onSpriteClick` +
            `spriteOverlay` are how Roster Swap's picker trigger and its
            SavedSetPicker popover still hang off the core's sprite box despite
            being roster-only concerns the core itself doesn't know about. */}
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
      </div>
    </motion.div>
  );
}
