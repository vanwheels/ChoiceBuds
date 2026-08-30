/**
 * TeamsPage.tsx - Primary Teams Interface Portal View
 * Header controls with format filters and Add New Team button
 * Displays team cards in a vertical stream layout
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseActiveEditorReturn } from '../hooks/useActiveEditor';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../hooks/useSettings';
import ImportTeamModal from './ImportTeamModal';
import TeamCard from './TeamCard';


interface TeamsPageProps {
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  editorState: UseActiveEditorReturn;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
}

type FormatFilter = 'All' | 'Reg M-A' | 'Reg M-B';

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
}: TeamsPageProps) {
  const [activeFilter, setActiveFilter] = useState<FormatFilter>('All');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Filter teams based on active format filter
  const filteredTeams = activeFilter === 'All'
    ? teamsState.teams
    : teamsState.teams.filter(team => team.format === activeFilter);

  // Format filter buttons configuration
  const filterButtons: FormatFilter[] = ['All', 'Reg M-A', 'Reg M-B'];

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
      <div className="flex-1 overflow-y-auto px-8 py-6 @container" style={{ scrollbarGutter: 'stable' }}>
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
                mockup's own placeholder ~1160px) is picked from the collapsed
                header's actual hard-minimum content width: the identity
                column (max-w-[190px]) + the coverflow's fixed 240px box
                (flex-shrink:0, never compresses) + the controls pill (~124px)
                + header padding add up to a real ~574px floor per card
                (measured live) that a too-low breakpoint leaves no room for -
                confirmed live at 1160px each column lands at ~570px, clipping
                the coverflow/controls together. 1360px keeps a comfortable
                ~50px+ buffer above that floor once 2 columns activate. A no
                max-width cap remains further down: each TeamCard's Pokemon
                grid (auto-fill, minmax(240px, 280px)) still needs the full
                available column width to fit up to 6 comfortable columns in
                one row on wide windows. */}
            {filteredTeams.map(team => (
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
            existingTeamNames={teamsState.teams.map(team => team.name)}
            defaultRegulation={settingsState.settings.defaultRegulation}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
