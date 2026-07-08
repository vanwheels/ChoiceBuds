import { useState } from 'react';
import { Team, SpeciesRosterEntry } from '../types/pokemon';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import { useRosterActions } from '../hooks/useRosterActions';
import { toRegulationId } from '../utils/pokemonRules';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import PokemonCard from './PokemonCard';
import SpeciesPickerCard from './SpeciesPickerCard';
import TeamValidationButton from './TeamValidationButton';
import RegulationBadge from './RegulationBadge';
import ExportTeamModal from './ExportTeamModal';

interface TeamCardProps {
  team: Team;
  onDelete?: () => void;
  onEdit?: () => void;
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
}

export default function TeamCard({ team, onDelete, onEdit, teamsState, databaseState, gameDataState, speciesRosterState, spriteCacheState }: TeamCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [localTeamName, setLocalTeamName] = useState(team.name);
  const [localAuthor, setLocalAuthor] = useState(team.author || '');
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
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
        {/* Horizontal Mini Sprites Row - always reserves 6 slots (padding
            empty ones) so the team name's starting x-position stays fixed
            regardless of roster size, instead of drifting per team. */}
        <div className="flex flex-row items-center gap-3 mr-6" style={{ marginRight: '1.5rem' }}>
          {Array.from({ length: 6 }, (_, idx) => team.pokemon?.[idx]).map((p, idx) => (
            p ? (
              <img
                key={idx}
                src={spriteCacheState.resolveSprite(getPixelSpriteUrl(p.pokedexNumber, p.showdownData.species, p.showdownData.gender || 'M', p.showdownData.shiny))}
                alt={p.showdownData.species}
                className="w-8 h-8 object-contain [image-rendering:pixelated] shrink-0"
              />
            ) : (
              <div key={idx} className="w-8 h-8 shrink-0" />
            )
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
          {/* Author - team-level metadata, not per-Pokemon. Pokepaste pages carry one; a plain
              Showdown export doesn't, so this stays manually editable either way. Hidden entirely
              when not editing and no author is set, so teams without one show no empty chrome. */}
          {isEditingTeam ? (
            <input
              type="text"
              value={localAuthor}
              onChange={(e) => setLocalAuthor(e.target.value)}
              onBlur={async () => {
                if (localAuthor !== (team.author || '')) {
                  await updateTeam(team.id, { author: localAuthor.trim() || undefined });
                }
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              placeholder="Author"
              title="Author"
              className="w-24 px-1.5 py-0.5 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-600 outline-none focus:border-blue-500"
            />
          ) : team.author ? (
            <span className="text-[10px] text-zinc-500 whitespace-nowrap" title={`by ${team.author}`}>by {team.author}</span>
          ) : null}

          {/* A. Regulation Indicator Badge */}
          <div className="mr-2">
            <RegulationBadge team={team} onChange={(format) => updateTeam(team.id, { format })} />
          </div>

          {/* A2. Validate Team Button + Popup */}
          <TeamValidationButton team={team} rulesetId={toRegulationId(team.format)} />

          {/* A3. Export Button - opens a modal with Showdown-format text (services/parser.ts::formatShowdownText) */}
          <button
            onClick={() => setIsExportOpen(true)}
            title="Export Team (Showdown format)"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 text-sm transition-all cursor-pointer"
          >
            ⇩
          </button>

          {/* B. Edit Button */}
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

          {/* C. Delete Button */}
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 text-sm transition-all cursor-pointer"
              title="Delete Team"
            >
              ×
            </button>
          )}

          {/* D. Expand/Collapse Toggle Button */}
          <button
            onClick={() => {
              const nextExpanded = !isExpanded;
              setIsExpanded(nextExpanded);
              if (!nextExpanded) {
                setIsEditingTeam(false);
              }
            }}
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
                key={`${idx}-${p.importedAt}`}
                pokemon={p}
                team={team}
                pokemonIndex={idx}
                isEditing={isEditingTeam}
                updateTeam={updateTeam}
                gameDataState={gameDataState}
                speciesRosterState={speciesRosterState}
                spriteCacheState={spriteCacheState}
                rosterActions={rosterActions}
              />
            ))}

            {/* Append Add Button - only while editing and roster has room */}
            {isEditingTeam && team.pokemon.length < 6 && (
              isAddPickerOpen ? (
                <SpeciesPickerCard
                  roster={speciesRosterState.roster}
                  rulesetId={toRegulationId(team.format)}
                  resolveSprite={spriteCacheState.resolveSprite}
                  onSelect={handleAddSpecies}
                  onClose={() => setIsAddPickerOpen(false)}
                />
              ) : (
                <button
                  onClick={() => setIsAddPickerOpen(true)}
                  className="w-full h-full min-h-[280px] flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-blue-400 hover:border-blue-500 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-semibold">+ Add Pokémon</span>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {isExportOpen && <ExportTeamModal team={team} onClose={() => setIsExportOpen(false)} />}
    </div>
  );
}
