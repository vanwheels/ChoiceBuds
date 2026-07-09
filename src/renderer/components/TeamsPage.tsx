/**
 * TeamsPage.tsx - Primary Teams Interface Portal View
 * Header controls with format filters and Add New Team button
 * Displays team cards in a vertical stream layout
 */

import { useState } from 'react';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseActiveEditorReturn } from '../hooks/useActiveEditor';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import ImportTeamModal from './ImportTeamModal';
import TeamCard from './TeamCard';


interface TeamsPageProps {
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  editorState: UseActiveEditorReturn;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
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
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">My Teams</h2>
            <p className="text-sm text-gray-400 mt-1">
              {filteredTeams.length} {filteredTeams.length === 1 ? 'team' : 'teams'}
              {activeFilter !== 'All' && ` in ${activeFilter}`}
            </p>
          </div>

          {/* Add New Team Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
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
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </header>

      {/* Teams Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {teamsState.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading teams...</div>
          </div>
        ) : teamsState.error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-400">Error: {teamsState.error}</div>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <p className="text-lg">No teams found</p>
            <p className="text-sm mt-2">Click "Add New Team" to import your first team</p>
          </div>
        ) : (
          <div 
            className="flex flex-col gap-4 w-full"
            style={{ paddingLeft: '4rem', paddingRight: '4rem' }}
          >
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Import Team Modal */}
      {isImportModalOpen && (
        <ImportTeamModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={teamsState.addTeam}
          databaseState={databaseState}
          existingTeamNames={teamsState.teams.map(team => team.name)}
        />
      )}
    </div>
  );
}
