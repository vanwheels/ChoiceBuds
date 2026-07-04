/**
 * TeamsPage.tsx - Primary Teams Interface Portal View
 * Header controls with format filters and Add New Team button
 * Displays team cards in a vertical stream layout
 */

import { useState } from 'react';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseActiveEditorReturn } from '../hooks/useActiveEditor';
import type { Team } from '../types/pokemon';
import ImportTeamModal from './ImportTeamModal';


interface TeamsPageProps {
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  editorState: UseActiveEditorReturn;
}

type FormatFilter = 'All' | 'VGC' | 'Singles' | 'Doubles' | 'Other';

/**
 * Main teams page component
 * Displays all teams with filtering and import capabilities
 */
export default function TeamsPage({
  teamsState,
  databaseState,
}: TeamsPageProps) {
  const [activeFilter, setActiveFilter] = useState<FormatFilter>('All');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Filter teams based on active format filter
  const filteredTeams = activeFilter === 'All'
    ? teamsState.teams
    : teamsState.teams.filter(team => team.format === activeFilter);

  // Format filter buttons configuration
  const filterButtons: FormatFilter[] = ['All', 'VGC', 'Singles', 'Doubles', 'Other'];

  return (
    <div className="h-full flex flex-col">
      {/* Header Control Bar */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
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
        <div className="flex gap-2 mt-4">
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
      <div className="flex-1 overflow-y-auto p-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTeams.map(team => (
              <TeamCard
                key={team.id}
                team={team}
                onDelete={() => teamsState.deleteTeam(team.id)}
                isExpanded={teamsState.expandedCardIds.has(team.id)}
                onToggleExpand={() => teamsState.toggleCardExpansion(team.id)}
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
        />
      )}
    </div>
  );
}

/**
 * Individual team card component
 */
interface TeamCardProps {
  team: Team;
  onDelete: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function TeamCard({ team, onDelete, isExpanded, onToggleExpand }: TeamCardProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-100">{team.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded">
              {team.format}
            </span>
            <span className="text-xs text-gray-400">
              {team.pokemon.length} Pokémon
            </span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-400 transition-colors"
          title="Delete team"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Pokémon Preview */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {team.pokemon.slice(0, 6).map((pokemon, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-12 h-12 bg-gray-700 rounded border border-gray-600 flex items-center justify-center"
            title={pokemon.showdownData.species}
          >
            <span className="text-xs text-gray-400">#{pokemon.pokedexNumber}</span>
          </div>
        ))}
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Updated {formatDate(team.updatedAt)}</span>
        <button
          onClick={onToggleExpand}
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && team.notes && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-sm text-gray-400">{team.notes}</p>
        </div>
      )}
    </div>
  );
}
