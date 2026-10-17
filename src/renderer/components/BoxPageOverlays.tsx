import { AnimatePresence } from 'framer-motion';
import type {
  ImportedPokemonInfo,
  SavedPokemonEntry,
  SpeciesRosterEntry,
  Team,
  PokeAPICacheEntry,
} from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';
import AddPokemonStatTable from './AddPokemonStatTable';
import SaveToLibraryDialog from './SaveToLibraryDialog';
import AddToTeamDialog from './AddToTeamDialog';
import ContextMenu from './ContextMenu';

interface BoxPageOverlaysProps {
  // "+ New Build" picker -> save-name dialog (Box Tab Leg 2, see TODO.md).
  isPickerOpen: boolean;
  onClosePicker: () => void;
  roster: SpeciesRosterEntry[];
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  getCachedEntry: (species: string) => PokeAPICacheEntry | null;
  onSelectSpecies: (species: SpeciesRosterEntry, itemOverride?: string) => void;
  pendingNewBuild: { id: string; pokemon: ImportedPokemonInfo } | null;
  onSaveNewBuild: (label: string) => Promise<boolean>;
  onClosePendingBuild: () => void;

  // "Add to Team…" (Box Tab Leg 4, see TODO.md).
  addToTeamEntry: SavedPokemonEntry | null;
  teams: Team[];
  onAddToTeam: (teamId: string, cloned: ImportedPokemonInfo) => Promise<boolean>;
  onCloseAddToTeam: () => void;

  // Grid-level "Paste Pokémon"/"Paste Showdown Text" menu (Leg 5, see
  // BoxPage.tsx's header comment).
  pasteContextMenuPos: { x: number; y: number } | null;
  onClosePasteMenu: () => void;
  onPastePokemon: () => void;
  onPasteShowdownText: () => void;
}

// Floating overlays BoxPage.tsx conditionally mounts - the "+ New Build"
// picker/save-name dialog, "Add to Team…" dialog, and the grid's right-click
// paste menu - split out of BoxPage.tsx (File Cap Splits: BoxPage.tsx, see
// TODO.md) with no behavior change.
export default function BoxPageOverlays({
  isPickerOpen,
  onClosePicker,
  roster,
  rulesetId,
  resolveSprite,
  getCachedEntry,
  onSelectSpecies,
  pendingNewBuild,
  onSaveNewBuild,
  onClosePendingBuild,
  addToTeamEntry,
  teams,
  onAddToTeam,
  onCloseAddToTeam,
  pasteContextMenuPos,
  onClosePasteMenu,
  onPastePokemon,
  onPasteShowdownText,
}: BoxPageOverlaysProps) {
  return (
    <>
      <AnimatePresence>
        {isPickerOpen && (
          <AddPokemonStatTable
            roster={roster}
            rulesetId={rulesetId}
            resolveSprite={resolveSprite}
            getCachedEntry={getCachedEntry}
            onSelect={onSelectSpecies}
            onClose={onClosePicker}
          />
        )}
        {pendingNewBuild && (
          <SaveToLibraryDialog
            pokemon={pendingNewBuild.pokemon}
            resolveSprite={resolveSprite}
            onSave={onSaveNewBuild}
            onClose={onClosePendingBuild}
          />
        )}
        {addToTeamEntry && (
          <AddToTeamDialog
            pokemon={addToTeamEntry.pokemon}
            teams={teams}
            onAddToTeam={onAddToTeam}
            onClose={onCloseAddToTeam}
          />
        )}
      </AnimatePresence>

      {pasteContextMenuPos && (
        <ContextMenu
          x={pasteContextMenuPos.x}
          y={pasteContextMenuPos.y}
          onClose={onClosePasteMenu}
          items={[
            {
              label: 'Paste Pokémon',
              onClick: onPastePokemon,
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
            {
              label: 'Paste Showdown Text',
              onClick: onPasteShowdownText,
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
                  <path d="M6 3.5h9l4.5 4.5v12.5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4.5 20.5v-15A1.5 1.5 0 0 1 6 3.5Z" />
                  <path d="M9 12h6M9 15.5h6M9 8.5h2" />
                </svg>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
