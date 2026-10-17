import { AnimatePresence } from 'framer-motion';
import {
  Team,
  SpeciesRosterEntry,
  SavedPokemonEntry,
  type PokeAPICacheEntry,
} from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../hooks/useSettings';
import AddPokemonStatTable from './AddPokemonStatTable';
import ExportTeamModal from './ExportTeamModal';
import TeamExportImageModal from './TeamExportImageModal';
import TeamSheetPdfModal from './TeamSheetPdfModal';
import ContextMenu from './ContextMenu';

interface TeamCardOverlaysProps {
  team: Team;
  rulesetId: RegulationId;
  teamsState: UseTeamsReturn;
  gameDataState: UseGameDataReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
  getCachedEntry: (species: string) => PokeAPICacheEntry | null;

  // Team-level right-click menu (Quick Copy/Paste Pokémon & Teams via
  // Right-Click Leg 1/2, see TODO.md).
  contextMenuPos: { x: number; y: number } | null;
  onCloseContextMenu: () => void;
  onCopyTeam: () => void;
  onPasteTeam: () => void;

  // "Paste Pokémon" anywhere within the roster grid (Leg 2, see TODO.md).
  pokemonContextMenuPos: { x: number; y: number } | null;
  onClosePokemonContextMenu: () => void;
  onPasteNewPokemon: () => void;

  // "+ Add Pokémon" picker modal.
  isAddPickerOpen: boolean;
  onCloseAddPicker: () => void;
  addPickerRoster: SpeciesRosterEntry[];
  resolveSprite: (remoteUrl: string) => string;
  onSelectSpecies: (species: SpeciesRosterEntry, itemOverride?: string) => void;
  addPickerSavedPokemon: SavedPokemonEntry[];
  onSelectSaved: (entry: SavedPokemonEntry) => void;

  // Export modals (plain text / image / PDF sheet).
  isExportOpen: boolean;
  onCloseExport: () => void;
  isImageExportOpen: boolean;
  onCloseImageExport: () => void;
  isPdfExportOpen: boolean;
  onClosePdfExport: () => void;
}

// Right-click context menus plus the "+ Add Pokémon"/Export/Export
// Image/Export PDF modals, split out of TeamCard.tsx (File Cap Splits:
// TeamCard.tsx, see TODO.md) with no behavior change - grouped together
// since all of these are floating overlays TeamCard conditionally mounts
// rather than part of its always-visible header/roster layout.
export default function TeamCardOverlays({
  team,
  rulesetId,
  teamsState,
  gameDataState,
  spriteCacheState,
  settingsState,
  getCachedEntry,
  contextMenuPos,
  onCloseContextMenu,
  onCopyTeam,
  onPasteTeam,
  pokemonContextMenuPos,
  onClosePokemonContextMenu,
  onPasteNewPokemon,
  isAddPickerOpen,
  onCloseAddPicker,
  addPickerRoster,
  resolveSprite,
  onSelectSpecies,
  addPickerSavedPokemon,
  onSelectSaved,
  isExportOpen,
  onCloseExport,
  isImageExportOpen,
  onCloseImageExport,
  isPdfExportOpen,
  onClosePdfExport,
}: TeamCardOverlaysProps) {
  return (
    <>
      {contextMenuPos && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onClose={onCloseContextMenu}
          items={[
            {
              label: 'Copy Team',
              onClick: onCopyTeam,
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
              label: 'Paste as New Team',
              onClick: onPasteTeam,
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
                  <path d="M9 4.5h1.5a1.5 1.5 0 0 1 3 0H15a1 1 0 0 1 1 1V7H8V5.5a1 1 0 0 1 1-1Z" />
                  <path d="M8 6H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 18 6h-2" />
                </svg>
              ),
            },
          ]}
        />
      )}

      {/* "Paste Pokémon" anywhere within the roster grid, distinct from the
          header's team-level menu above (Leg 2, see TODO.md). */}
      {pokemonContextMenuPos && (
        <ContextMenu
          x={pokemonContextMenuPos.x}
          y={pokemonContextMenuPos.y}
          onClose={onClosePokemonContextMenu}
          items={[
            {
              label: 'Paste Pokémon',
              onClick: onPasteNewPokemon,
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
                  <path d="M9 4.5h1.5a1.5 1.5 0 0 1 3 0H15a1 1 0 0 1 1 1V7H8V5.5a1 1 0 0 1 1-1Z" />
                  <path d="M8 6H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 18 6h-2" />
                </svg>
              ),
            },
          ]}
        />
      )}

      <AnimatePresence>
        {isAddPickerOpen && (
          <AddPokemonStatTable
            roster={addPickerRoster}
            rulesetId={rulesetId}
            resolveSprite={resolveSprite}
            getCachedEntry={getCachedEntry}
            onSelect={onSelectSpecies}
            onClose={onCloseAddPicker}
            savedPokemon={addPickerSavedPokemon}
            onSelectSaved={onSelectSaved}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExportOpen && (
          <ExportTeamModal
            pokemonList={team.pokemon.map((p) => p.showdownData)}
            title="Export Team"
            pasteTitle={team.name}
            pasteAuthor={team.author}
            pasteNotes={team.notes}
            onClose={onCloseExport}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isImageExportOpen && (
          <TeamExportImageModal
            team={team}
            gameDataState={gameDataState}
            spriteCacheState={spriteCacheState}
            onClose={onCloseImageExport}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPdfExportOpen && (
          <TeamSheetPdfModal
            team={team}
            teamsState={teamsState}
            settingsState={settingsState}
            onClose={onClosePdfExport}
          />
        )}
      </AnimatePresence>
    </>
  );
}
