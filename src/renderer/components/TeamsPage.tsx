/**
 * TeamsPage.tsx - Primary Teams Interface Portal View
 * Header controls with format filters and Add New Team button
 * Displays team cards in a vertical stream layout
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { RegulationLabel } from '../types/pokemon';
import { sortTeamsByFavorite } from '../utils/teamSort';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseActiveEditorReturn } from '../hooks/useActiveEditor';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../hooks/useSettings';
import type { UseSavedPokemonReturn } from '../hooks/useSavedPokemon';
import { readTeamFromClipboard } from '../utils/clipboardPayload';
import { buildPastedTeam } from '../utils/teamPaste';
import ImportTeamModal from './ImportTeamModal';
import TeamCard from './TeamCard';
import ContextMenu from './ContextMenu';


interface TeamsPageProps {
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  editorState: UseActiveEditorReturn;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
  savedPokemonState: UseSavedPokemonReturn;
}

type FormatFilter = 'All' | RegulationLabel;

/**
 * Main teams page component
 * Displays all teams with filtering and import capabilities
 */
export default function TeamsPage({
  teamsState,
  databaseState,
  gameDataState,
  speciesRosterState,
  spriteCacheState,
  settingsState,
  savedPokemonState,
}: TeamsPageProps) {
  const [activeFilter, setActiveFilter] = useState<FormatFilter>('All');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  // "Paste as New Team" from anywhere in the page's empty space, not just by
  // right-clicking an existing TeamCard's own header (Quick Copy/Paste
  // Pokémon & Teams via Right-Click Leg 2, see TODO.md). TeamCard's own
  // context-menu handlers stop propagation, so this only ever fires for a
  // right-click that didn't land on a team card in the first place.
  const [pasteContextMenuPos, setPasteContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handleContentContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPasteContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  // Same "brand-new team, never an overwrite" behavior as TeamCard.tsx's own
  // per-card paste - see utils/teamPaste.ts::buildPastedTeam. Silently a
  // no-op if the clipboard doesn't hold a ChoiceBuds Team payload.
  const handlePasteNewTeam = async () => {
    const pasted = await readTeamFromClipboard();
    if (!pasted) return;
    await teamsState.addTeam(buildPastedTeam(pasted, teamsState.teams.map(t => t.name)));
  };

  // Filter teams based on active format filter
  const filteredTeams = activeFilter === 'All'
    ? teamsState.teams
    : teamsState.teams.filter(team => team.format === activeFilter);

  // Favorited teams always sort to the top, otherwise preserving each
  // group's existing relative (drag-reorderable) order - see teamSort.ts.
  const sortedTeams = sortTeamsByFavorite(filteredTeams);

  // Format filter buttons configuration
  const filterButtons: FormatFilter[] = ['All', 'Reg M-A', 'Reg M-B', 'Reg M-C'];

  return (
    <div className="h-full flex flex-col">
      {/* Header Control Bar */}
      <header className="bg-zinc-800 border-b border-zinc-700 px-6 py-4" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">My Teams</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {filteredTeams.length} {filteredTeams.length === 1 ? 'team' : 'teams'}
              {activeFilter !== 'All' && ` in ${activeFilter}`}
            </p>
          </div>

          {/* Add New Team Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-gold hover:bg-accent-gold-deep text-zinc-900 rounded-lg transition-colors font-medium"
          >
            <span className="text-xl">+</span>
            <span>Add New Team</span>
          </button>
        </div>

        {/* Format Filter Buttons */}
        <div className="flex gap-2 mt-4" style={{ paddingLeft: '0.75rem', paddingRight: '0.75rem' }}>
          {filterButtons.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeFilter === filter
                  ? 'bg-accent-gold text-zinc-900'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </header>

      {/* Teams Content Area */}
      {/* scrollbarGutter: 'stable' - this div, not App.tsx's <main>, is the actual
          scroll container whose scrollbar was popping in/out and shrinking every
          team card by the scrollbar's own width (reported 2026-08-29, following
          leg 2's overflow-menu addition). Its height gets fixed by flexbox layout
          (flex-1 inside TeamsPage's own h-full flex-col) independently of content
          added afterward - so a card's open dropdown, though position:absolute
          and out of flow, can still push scrollHeight past that already-fixed
          clientHeight and trigger a scrollbar here specifically, even while
          <main> itself (already fixed the same way, see App.tsx) has plenty of
          room to spare and shows no scrollbar at all. Confirmed live by walking
          the DOM ancestor chain and diffing scrollHeight/clientHeight per
          ancestor before/after opening the dropdown - this was the only one
          whose clientHeight was exceeded. */}
      <div className="flex-1 overflow-y-auto px-8 py-6 @container" style={{ scrollbarGutter: 'stable' }} onContextMenu={handleContentContextMenu}>
        {teamsState.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-zinc-400">Loading teams...</div>
          </div>
        ) : teamsState.error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-400">Error: {teamsState.error}</div>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
            <p className="text-lg">No teams found</p>
            <p className="text-sm mt-2">Click "Add New Team" to import your first team</p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 @[1360px]:grid-cols-2 gap-4 w-full"
            style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
          >
            {/* Responsive teams grid (carousel/grid rework leg 4, see TODO.md):
                1 column by default, 2 once this wrapper's own @container width
                (not viewport width - the sidebar eats into that) clears
                1360px, capped at 2 no matter how wide the window gets
                (explicit user call, see the Window-sizing entry in TODO.md) -
                no 3rd-column tier for ultrawide monitors. 1360px (not the
                mockup's own placeholder ~1160px) was picked from the collapsed
                header's hard-minimum content width at the time: the identity
                column (max-w-[190px]) + the coverflow's fixed 240px box
                (flex-shrink:0, never compresses) + the controls pill (~124px)
                + header padding added up to a real ~574px floor per card
                (measured live) that a too-low breakpoint left no room for -
                confirmed live at 1160px each column landed at ~570px, clipping
                the coverflow/controls together. 1360px kept a comfortable
                ~50px+ buffer above that floor. STALE as of Team Header Sprite
                Strip leg 1 (see TODO.md): the coverflow was reverted to a flat
                strip whose own shrink-0 content is ~376px wide (6 * 56px
                sprites + 5 * 8px gaps), well past the 240px this floor was
                measured against - the ~574px floor and the 1360px breakpoint
                itself have NOT been re-verified live against that new width
                and may need retuning. Note this halves the width available to
                each TeamCard's own Pokemon
                grid once 2 columns activate - TeamCard.tsx's 3-vs-6-column
                snap (see its own comment) is tuned against realistic
                single-column widths, not this 2-column state, so 2 teams
                side-by-side may render 2x3 even where 1 team alone would
                reach 1x6. */}
            {sortedTeams.map(team => (
              <TeamCard
                key={team.id}
                team={team}
                onDelete={() => teamsState.deleteTeam(team.id)}
                teamsState={teamsState}
                databaseState={databaseState}
                gameDataState={gameDataState}
                speciesRosterState={speciesRosterState}
                spriteCacheState={spriteCacheState}
                settingsState={settingsState}
                savedPokemonState={savedPokemonState}
              />
            ))}
          </div>
        )}
      </div>

      {/* Import Team Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <ImportTeamModal
            onClose={() => setIsImportModalOpen(false)}
            onImport={teamsState.addTeam}
            databaseState={databaseState}
            savedPokemonState={savedPokemonState}
            resolveSprite={spriteCacheState.resolveSprite}
            existingTeamNames={teamsState.teams.map(team => team.name)}
            defaultRegulation={settingsState.settings.defaultRegulation}
          />
        )}
      </AnimatePresence>

      {pasteContextMenuPos && (
        <ContextMenu
          x={pasteContextMenuPos.x}
          y={pasteContextMenuPos.y}
          onClose={() => setPasteContextMenuPos(null)}
          items={[
            {
              label: 'Paste as New Team',
              onClick: handlePasteNewTeam,
              icon: (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 4.5h1.5a1.5 1.5 0 0 1 3 0H15a1 1 0 0 1 1 1V7H8V5.5a1 1 0 0 1 1-1Z" />
                  <path d="M8 6H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 18 6h-2" />
                </svg>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
