import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { DragEvent } from 'react';
import { Team, SpeciesRosterEntry } from '../types/pokemon';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../hooks/useSettings';
import { useRosterActions } from '../hooks/useRosterActions';
import { toRegulationId } from '../utils/pokemonRules';
import { getRegulationTheme } from '../config/pokemonTheme';
import { TEAMS_LIST_DRAG_TYPE, type TeamsListDragPayload } from '../utils/teamsListDragTypes';
import PokemonCard from './PokemonCard';
import SpeciesPickerCard from './SpeciesPickerCard';
import TeamCoverflow from './TeamCoverflow';
import TeamOverflowMenu from './TeamOverflowMenu';
import RegulationBadge from './RegulationBadge';
import ExportTeamModal from './ExportTeamModal';
import TeamExportImageModal from './TeamExportImageModal';
import TeamSheetPdfModal from './TeamSheetPdfModal';

interface TeamCardProps {
  team: Team;
  onDelete?: () => void;
  onEdit?: () => void;
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
}

export default function TeamCard({ team, onDelete, onEdit, teamsState, databaseState, gameDataState, speciesRosterState, spriteCacheState, settingsState }: TeamCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [localTeamName, setLocalTeamName] = useState(team.name);
  const [localAuthor, setLocalAuthor] = useState(team.author || '');
  const [localNotes, setLocalNotes] = useState(team.notes || '');
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImageExportOpen, setIsImageExportOpen] = useState(false);
  const [isPdfExportOpen, setIsPdfExportOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { updateTeam, reorderTeam } = teamsState;
  const rosterActions = useRosterActions(
    updateTeam,
    databaseState.getCachedEntry,
    databaseState.setCacheEntry,
    gameDataState.getEnrichedSpeciesOptions,
    gameDataState.getChampionsUsage
  );

  const handleAddSpecies = async (species: SpeciesRosterEntry) => {
    setIsAddPickerOpen(false);
    await rosterActions.addSlot(team, species.name);
  };

  // Teams-list reorder via drag-and-drop, gated behind both expanded AND
  // edit-mode (carousel/grid rework leg 4, see TODO.md) - changed from the
  // original "always active on the collapsed header regardless of state"
  // behavior, since an always-draggable collapsed header made every header
  // click/drag ambiguous. Same MIME-type-payload pattern as the
  // Pokemon-within-a-team reorder (utils/teamRosterDragTypes.ts).
  // reorderTeam itself resolves the drop against the full unfiltered teams
  // array, so this works the same whether TeamsPage.tsx is showing "All"
  // or a filtered subset. Only the drag *source* is gated - any card can
  // still be dropped onto as a target regardless of its own state.
  const canReorder = isExpanded && isEditingTeam;

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (!canReorder) {
      e.preventDefault();
      return;
    }
    const payload: TeamsListDragPayload = { draggedTeamId: team.id };
    e.dataTransfer.setData(TEAMS_LIST_DRAG_TYPE, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(TEAMS_LIST_DRAG_TYPE)) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData(TEAMS_LIST_DRAG_TYPE);
    if (!raw) return;
    try {
      const payload: TeamsListDragPayload = JSON.parse(raw);
      if (payload.draggedTeamId !== team.id) {
        reorderTeam(payload.draggedTeamId, team.id);
      }
    } catch {
      // malformed/foreign drag payload - ignore
    }
  };

  const regulationTheme = getRegulationTheme(toRegulationId(team.format));

  return (
    <div className={`bg-zinc-900/40 border border-zinc-800/80 border-l-4 ${regulationTheme.accentBorder} rounded-xl transition-all ${
      isExpanded ? 'col-span-full' : ''
    }`}>

      {/* MINIMIZED VIEW CONTAINER ROW - Enhanced Header with Controls */}
      {/* rounded-t-xl replaces the parent's old overflow-hidden clip (removed so
          tooltips/popovers from expanded cards below are never cut off) */}
      <div
        draggable={canReorder}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        title={canReorder ? 'Drag to reorder' : undefined}
        className={`w-full flex flex-row items-center min-h-[116px] py-4 px-6 bg-zinc-950/40 rounded-t-xl transition-colors ${
          canReorder ? 'cursor-grab' : ''
        } ${isDragOver ? 'ring-2 ring-inset ring-accent-gold' : ''}`}
        style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem' }}
      >
        {/* Identity column (header/controls rework leg 2, see TODO.md) - regulation
            badge, team name, and author all moved here from the old far-right
            button cluster, matching the approved mockup's left-column grouping. */}
        <div className="flex flex-col gap-1 min-w-[190px] max-w-[190px] shrink-0">
          <RegulationBadge team={team} onChange={(format) => updateTeam(team.id, { format })} />

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
              className="text-left font-bold text-base text-zinc-100 truncate tracking-wide mt-0.5"
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
            <h2 className="text-left font-bold text-base text-zinc-100 truncate tracking-wide mt-0.5">
              {team.name.replace(/^(Reg\s*M-[AB]\s*)+/i, '').trim() || 'Untitled Team'}
            </h2>
          )}

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
              className="w-24 px-1.5 py-0.5 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-600 outline-none focus:border-accent-gold"
            />
          ) : team.author ? (
            <span className="text-[11px] text-zinc-500 truncate block" title={`by ${team.author}`}>by {team.author}</span>
          ) : null}
        </div>

        {/* 3D coverflow (design-approved 2026-08-29, see TODO.md) - replaces the
            old flat mini-sprite-strip; a fixed 240x84px box regardless of roster
            size, centered in the remaining space between the identity column and
            the controls pill. */}
        <div className="flex-1 flex items-center justify-center">
          <TeamCoverflow pokemon={team.pokemon} resolveSprite={spriteCacheState.resolveSprite} />
        </div>

        {/* Pill-shaped controls cluster (header/controls rework leg 2, see
            TODO.md) - only Edit and Expand stay always-visible; everything else
            (Validate/Export/Export Image/Export PDF/Delete) moved into
            TeamOverflowMenu.tsx's "⋮" dropdown. Icons/layout pulled verbatim
            from the approved mockup's Main.dc.html/Overflow.dc.html artboards. */}
        <div className="flex items-center gap-0.5 bg-zinc-800 border border-zinc-700 rounded-full p-1 shrink-0">
          {/* Edit Button */}
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
            className={`w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-accent-gold hover:bg-zinc-700 transition-colors cursor-pointer ${
              isEditingTeam ? 'bg-zinc-700 text-accent-gold' : ''
            }`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>

          <span className="w-px h-[18px] bg-zinc-700 mx-0.5" />

          {/* Expand/Collapse Toggle Button */}
          <button
            onClick={() => {
              const nextExpanded = !isExpanded;
              setIsExpanded(nextExpanded);
              if (!nextExpanded) {
                setIsEditingTeam(false);
              }
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer ${
              isExpanded ? 'bg-zinc-700 text-zinc-200' : ''
            }`}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <span className="w-px h-[18px] bg-zinc-700 mx-0.5" />

          {/* Overflow ("More") Menu - Validate/Export/Export Image/Export PDF/Delete */}
          <TeamOverflowMenu
            team={team}
            rulesetId={toRegulationId(team.format)}
            onExport={() => setIsExportOpen(true)}
            onExportImage={() => setIsImageExportOpen(true)}
            onExportPdf={() => setIsPdfExportOpen(true)}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* EXPANDED VIEW CONTAINER - RENDERS THE INDIVIDUAL EXPANDED POKEMON CARDS
          @container: the grid below snaps its column count off THIS element's own
          width (a CSS container query), not the browser viewport - viewport-based
          breakpoints were the original bug, since raw viewport width crossing 1280px
          doesn't mean the sidebar-reduced content area actually has room for 6 real
          280px columns. */}
      {isExpanded && (
        <div className="@container p-6 border-t border-zinc-800/60 bg-zinc-900/10 rounded-b-xl">
          {/* Two clean states, not a continuous reflow: 3 columns (2x3 for a full
              6-mon roster) until the container itself is wide enough for 6 real
              ~280px columns (6*280px + 5*1rem gaps = 1760px), then snaps to 6 (1x6).
              @[1760px]: is a container-query variant (keyed off the @container
              ancestor above), not a viewport media query - unlike the old
              xl:grid-cols-6 this can't misfire from raw viewport width alone. */}
          <div className="grid grid-cols-3 @[1760px]:grid-cols-6 gap-4 w-full">
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
                  className="w-full h-full min-h-[280px] flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer"
                >
                  <span className="text-sm font-semibold">+ Add Pokémon</span>
                </button>
              )
            )}
          </div>

          {/* Strategy Notes - team-level free text (Team.notes), same "local state + save
              on blur" pattern as the name/author fields above. Hidden entirely when not
              editing and no notes are set, same as the author field's empty-chrome rule.
              Placed after the roster grid (not before) so the team's visual composition
              is always the first thing seen when expanding a card. */}
          {(isEditingTeam || team.notes) && (
            <div className="mt-4">
              {isEditingTeam ? (
                <textarea
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  onBlur={async () => {
                    if (localNotes !== (team.notes || '')) {
                      await updateTeam(team.id, { notes: localNotes.trim() || undefined });
                    }
                  }}
                  placeholder="Strategy notes, game plan, matchup tips..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-600 outline-none focus:border-accent-gold resize-y"
                />
              ) : (
                <p className="text-sm text-zinc-400 whitespace-pre-wrap border-l-2 border-zinc-700 pl-3">{team.notes}</p>
              )}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isExportOpen && (
          <ExportTeamModal
            pokemonList={team.pokemon.map(p => p.showdownData)}
            title="Export Team"
            onClose={() => setIsExportOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isImageExportOpen && (
          <TeamExportImageModal
            team={team}
            gameDataState={gameDataState}
            spriteCacheState={spriteCacheState}
            onClose={() => setIsImageExportOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPdfExportOpen && (
          <TeamSheetPdfModal
            team={team}
            teamsState={teamsState}
            settingsState={settingsState}
            onClose={() => setIsPdfExportOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
