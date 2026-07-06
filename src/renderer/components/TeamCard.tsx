import { useState } from 'react';
import { Team, SpeciesRosterEntry } from '../types/pokemon';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import { useRosterActions } from '../hooks/useRosterActions';
import { toRegulationId } from '../utils/pokemonRules';
import PokemonCard from './PokemonCard';
import { ShowdownPopover } from './ShowdownPopover';

interface TeamCardProps {
  team: Team;
  onDelete?: () => void;
  onEdit?: () => void;
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
}

export default function TeamCard({ team, onDelete, onEdit, teamsState, databaseState, gameDataState, speciesRosterState }: TeamCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [localTeamName, setLocalTeamName] = useState(team.name);
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const { updateTeam } = teamsState;
  const rosterActions = useRosterActions(
    updateTeam,
    databaseState.getCachedEntry,
    databaseState.setCacheEntry,
    gameDataState.getEnrichedSpeciesOptions
  );

  const handleAddSpecies = async (species: SpeciesRosterEntry) => {
    setIsAddPickerOpen(false);
    await rosterActions.addSlot(team, species.name);
  };

  return (
    <div className="w-auto mx-6 bg-zinc-900/40 border border-zinc-800/80 rounded-xl mb-4 transition-all">

      {/* MINIMIZED VIEW CONTAINER ROW - Enhanced Header with Controls */}
      {/* rounded-t-xl replaces the parent's old overflow-hidden clip (removed so
          tooltips/popovers from expanded cards below are never cut off) */}
      <div className="w-full flex flex-row items-center h-16 px-6 bg-zinc-950/40 rounded-t-xl transition-colors" style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem' }}>
        {/* Horizontal Mini Sprites Row with clean end-to-end padding and internal spacing gaps */}
        <div className="flex flex-row items-center gap-3 mr-6" style={{ marginRight: '1.5rem' }}>
          {team.pokemon && team.pokemon.map((p, idx) => (
            <img
              key={idx}
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.showdownData.shiny ? 'shiny/' : ''}${p.pokedexNumber}.png`}
              alt={p.showdownData.species}
              className="w-8 h-8 object-contain [image-rendering:pixelated] shrink-0"
            />
          ))}
        </div>

        {/* Team Title - Editable when in edit mode */}
        {isEditingTeam ? (
          <input
            type="text"
            value={localTeamName}
            onChange={(e) => setLocalTeamName(e.target.value)}
            onBlur={async () => {
              // Save team name on blur
              if (localTeamName !== team.name) {
                await updateTeam(team.id, { name: localTeamName });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className="flex-1 text-left font-bold text-sm text-zinc-100 truncate tracking-wide"
            style={{
              backgroundColor: 'transparent',
              borderBottom: '1px dashed #4b5563',
              color: '#ffffff',
              fontWeight: 'bold',
              outline: 'none',
              padding: '0.125rem 0.25rem',
            }}
          />
        ) : (
          <h2 className="flex-1 text-left font-bold text-sm text-zinc-100 truncate tracking-wide">
            {team.name.replace(/^(Reg\s*M-[AB]\s*)+/i, '').trim() || 'Untitled Team'}
          </h2>
        )}

        {/* Far-Right Controls Cluster */}
        <div className="flex flex-row items-center gap-2 shrink-0 ml-4">
          {/* A. Regulation Indicator Badge */}
          <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-600 text-white mr-2">
            {team.format || 'Reg M-A'}
          </div>

          {/* B. Delete Button */}
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 text-sm transition-all cursor-pointer"
              title="Delete Team"
            >
              ×
            </button>
          )}

          {/* C. Edit Button */}
          <button
            onClick={() => {
              setIsEditingTeam(!isEditingTeam);
              if (!isExpanded) {
                setIsExpanded(true);
              }
              if (onEdit) {
                onEdit();
              }
            }}
            title="Edit Team"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 text-sm transition-all cursor-pointer"
          >
            ✎
          </button>

          {/* D. Expand/Collapse Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 text-sm transition-all cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            ▼
          </button>
        </div>
      </div>

      {/* EXPANDED VIEW CONTAINER - RENDERS THE INDIVIDUAL EXPANDED POKEMON CARDS */}
      {isExpanded && (
        <div className="p-6 border-t border-zinc-800/60 bg-zinc-900/10 rounded-b-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 w-full">
            {team.pokemon && team.pokemon.map((p, idx) => (
              <PokemonCard
                key={idx}
                pokemon={p}
                team={team}
                pokemonIndex={idx}
                isEditing={isEditingTeam}
                updateTeam={updateTeam}
                gameDataState={gameDataState}
                speciesRosterState={speciesRosterState}
                rosterActions={rosterActions}
              />
            ))}

            {/* Append Add Button - only while editing and roster has room */}
            {isEditingTeam && team.pokemon.length < 6 && (
              <div className="relative">
                <button
                  onClick={() => setIsAddPickerOpen(prev => !prev)}
                  className="w-full h-full min-h-[280px] flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-blue-400 hover:border-blue-500 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-semibold">+ Add Pokémon</span>
                </button>
                {isAddPickerOpen && (
                  <ShowdownPopover
                    mode="pokemon"
                    data={speciesRosterState.roster}
                    rulesetId={toRegulationId(team.format)}
                    onSelect={handleAddSpecies}
                    onClose={() => setIsAddPickerOpen(false)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
