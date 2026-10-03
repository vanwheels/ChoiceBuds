/**
 * TeamsPage.tsx - Primary Teams Interface Portal View
 * Header controls with format filters and Add New Team button
 * Displays team cards in a vertical stream layout
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { RegulationLabel, VgcPasteTeamRow } from '../types/pokemon';
import { sortTeamsByFavorite } from '../utils/teamSort';
import { useGridReorder } from '../hooks/useGridReorder';
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
import { useVgcPastesCache } from '../hooks/useVgcPastesCache';
import { useVgcRealSetsCache } from '../hooks/useVgcRealSetsCache';
import { useMobileHeaderActions } from '../hooks/useMobileHeaderActions';
import ImportTeamModal from './ImportTeamModal';
import VgcPasteCatalogModal from './VgcPasteCatalogModal';
import TeamCard from './TeamCard';
import ContextMenu from './ContextMenu';
import MobileFilterPopover from './MobileFilterPopover';
import MobileTeamsList from './MobileTeamsList';
import { PlusIcon, CompassIcon, FilterIcon } from './icons/SidebarIcons';


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
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  // Set when a VgcPasteCatalogModal row's "Import" button is picked - passed
  // through to ImportTeamModal as catalogRow (the whole row, not just its
  // pokepast.es URL, so the modal can prefer the row's own
  // description/owner over the paste's own title/author - see
  // ImportTeamModal.tsx's applyPokepasteData), cleared once that modal
  // closes (see its onClose below) so a later plain "Add New Team" open
  // doesn't inherit a stale prefill.
  const [importPrefillRow, setImportPrefillRow] = useState<VgcPasteTeamRow | null>(null);
  const vgcPastesState = useVgcPastesCache();
  // Mounted once here (not per-PokemonCard) and threaded down through
  // TeamCard - a roster can hold up to 6 cards, and a per-card instance of
  // either hook would race on its own persisted-cache writes, same reasoning
  // as CalcPage.tsx's own shared mount (see docs/investigations/
  // team-builder-real-sets-scope.md and RealSetsButton.tsx).
  const vgcRealSetsState = useVgcRealSetsCache();
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

  // Teams-list reorder (Touch Drag-and-Drop: Framer Motion Reorder Leg 1,
  // see TODO.md) - local visual order of team ids for the Reorder.Group
  // below, synced from sortedTeams via the "adjust state during render"
  // pattern (CalcTeamTray.tsx's preferredTeamId uses the same shape) rather
  // than an effect, since sortedTeams is a fresh array every render and an
  // effect keyed on it directly would re-fire (and stomp a live drag's own
  // in-progress reorder) on every incidental re-render, not just a real
  // change. Only meaningful with no format filter active - dragging a
  // partial view has no well-defined "moved to the very end" target, so
  // TeamCard.tsx's grip handle is disabled via canReorder below whenever
  // activeFilter isn't 'All'.
  const sortedTeamIdsKey = sortedTeams.map(t => t.id).join('|');
  const [orderedTeamIds, setOrderedTeamIds] = useState(() => sortedTeams.map(t => t.id));
  const [prevSortedTeamIdsKey, setPrevSortedTeamIdsKey] = useState(sortedTeamIdsKey);
  if (sortedTeamIdsKey !== prevSortedTeamIdsKey) {
    setPrevSortedTeamIdsKey(sortedTeamIdsKey);
    setOrderedTeamIds(sortedTeams.map(t => t.id));
  }
  const canReorderTeams = activeFilter === 'All';
  const { containerRef: teamsGridRef, getHandlers: getTeamHandlers } = useGridReorder({
    orderedIds: orderedTeamIds,
    setOrderedIds: setOrderedTeamIds,
    onCommit: ids => teamsState.setTeamOrder(ids),
  });

  // Format filter buttons configuration
  const filterButtons: FormatFilter[] = ['All', 'Reg M-A', 'Reg M-B', 'Reg M-C'];

  // Mobile Compact Top Bar: Teams & Box leg (see TODO.md) - publishes this
  // page's title/action buttons into Sidebar.tsx's mobile top bar in place
  // of the stacked <header> below, which is hidden entirely below `md`.
  // Team count/subtitle intentionally doesn't carry over to the compact bar
  // (not part of the scoped icon layout) - the whole point was reclaiming
  // that vertical space.
  useMobileHeaderActions(
    'teams',
    'My Teams',
    <>
      <button
        onClick={() => setIsImportModalOpen(true)}
        aria-label="Add New Team"
        className="flex items-center justify-center rounded-lg p-2 text-accent-gold transition-colors cursor-pointer hover:bg-zinc-700"
      >
        <PlusIcon />
      </button>
      <button
        onClick={() => setIsCatalogModalOpen(true)}
        aria-label="Browse Sample Teams"
        className="flex items-center justify-center rounded-lg p-2 text-zinc-300 transition-colors cursor-pointer hover:bg-zinc-700"
      >
        <CompassIcon />
      </button>
      <MobileFilterPopover label="Filter teams" icon={<FilterIcon />} isActive={activeFilter !== 'All'}>
        <div className="flex flex-col gap-1">
          {filterButtons.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-2 rounded-md text-left text-sm font-medium transition-colors ${
                activeFilter === filter
                  ? 'bg-accent-gold text-zinc-900'
                  : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </MobileFilterPopover>
    </>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header Control Bar - desktop/tablet only (`md` and up). Below `md`
          this is replaced entirely by Sidebar.tsx's mobile top bar, fed via
          useMobileHeaderActions above (Mobile Compact Top Bar leg, see
          TODO.md) - a stacked header here ate 1/4+ of a phone screen's
          height before any team content rendered. */}
      <header className="hidden md:block bg-zinc-800 border-b border-zinc-700 px-8 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">My Teams</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {filteredTeams.length} {filteredTeams.length === 1 ? 'team' : 'teams'}
              {activeFilter !== 'All' && ` in ${activeFilter}`}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Browse Sample Teams Button - VGCPastes real-team catalog (TODO.md's VGCPastes Sample Team Catalog leg) */}
            <button
              onClick={() => setIsCatalogModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors font-medium"
            >
              <span>Browse Sample Teams</span>
            </button>

            {/* Add New Team Button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-gold hover:bg-accent-gold-deep text-zinc-900 rounded-lg transition-colors font-medium"
            >
              <span className="text-xl">+</span>
              <span>Add New Team</span>
            </button>
          </div>
        </div>

        {/* Format Filter Buttons */}
        <div className="flex gap-2 mt-4 flex-wrap">
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
      <div className="flex-1 overflow-y-auto px-4 md:px-0 py-6 @container" style={{ scrollbarGutter: 'stable' }} onContextMenu={handleContentContextMenu}>
        {/* min-h-[calc(100%+1px)] - guarantees this scroll container always
            has at least 1px of real overflow (Responsive Layout Audit
            follow-up, see TODO.md). Confirmed live on iPhone Safari: when a
            short team list's content height happens to exactly match this
            container's own height (one empty team, nothing else), touch-
            scroll gets stuck/unresponsive even though there's technically
            nothing to scroll to - a bottom-padding attempt at this didn't
            work, since padding still counts toward "content height" and
            scrollHeight only ever exceeds clientHeight when content
            genuinely exceeds the container's own (flex-determined) height,
            not from adding more space *inside* that same box. A percentage-
            based min-height on this direct child, deliberately 1px over
            100% of its (definite, flex-1-sized) parent, forces exactly
            that - real, permanent, imperceptible overflow regardless of how
            little actual content exists, without the dead space a fixed
            large padding would add. */}
        <div className="min-h-[calc(100%+1px)]">
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
          <>
          {/* Compact team-preview list - mobile only (Full-Screen Swipeable
              Pokémon Card + Teams List View Leg 1, see TODO.md). Renders
              instead of the desktop Reorder.Group grid below, not a
              responsive variant of it - no drag-reorder here (out of scope,
              see MobileTeamsList.tsx's header), tapping a row opens
              MobileTeamSwipeOverlay.tsx at index 0. */}
          <div className="md:hidden">
            <MobileTeamsList
              teams={sortedTeams}
              teamsState={teamsState}
              databaseState={databaseState}
              gameDataState={gameDataState}
              speciesRosterState={speciesRosterState}
              spriteCacheState={spriteCacheState}
              settingsState={settingsState}
              savedPokemonState={savedPokemonState}
              vgcPastesState={vgcPastesState}
              vgcRealSetsState={vgcRealSetsState}
            />
          </div>

          <div
            ref={teamsGridRef}
            className="hidden md:grid grid-cols-1 @[1700px]:grid-cols-2 gap-4 w-full"
          >
            {/* Responsive teams grid (carousel/grid rework leg 4, see TODO.md):
                1 column by default, 2 once this wrapper's own @container width
                (not viewport width - the sidebar eats into that) clears
                1700px, capped at 2 no matter how wide the window gets
                (explicit user call, see the Window-sizing entry in TODO.md) -
                no 3rd-column tier for ultrawide monitors. Retuned from 1360px
                (Team Card Padding at Certain Window Sizes, see TODO.md/
                COMPLETED.md): that number was tuned against the old 3D
                coverflow's fixed 240px box, and Team Header Sprite Strip leg 1
                (see TODO.md) later reverted the header to a flat sprite strip
                whose own shrink-0 content is ~376px wide (6 * 56px sprites +
                5 * 8px gaps) without the breakpoint ever being re-verified
                against it - so a 2-column card's header (identity column +
                sprite strip + controls pill) had a real floor of ~751px
                live-measured via run-desktop, well past what 1360px/2 could
                give it, and silently overflowed/squished at every window size
                between the old 1360px trigger and ~1670px where two columns
                actually fit. 1700px is that live-measured floor plus the same
                ~50px+ buffer style as the original tuning. Note this halves
                the width available to each TeamCard's own Pokemon
                grid once 2 columns activate - TeamCard.tsx's 3-vs-6-column
                snap (see its own comment) is tuned against realistic
                single-column widths, not this 2-column state, so 2 teams
                side-by-side may render 2x3 even where 1 team alone would
                reach 1x6. */}
            {orderedTeamIds.map(id => {
              const team = sortedTeams.find(t => t.id === id);
              if (!team) return null;
              return (
                <TeamCard
                  key={id}
                  team={team}
                  onDelete={() => teamsState.deleteTeam(team.id)}
                  teamsState={teamsState}
                  databaseState={databaseState}
                  gameDataState={gameDataState}
                  speciesRosterState={speciesRosterState}
                  spriteCacheState={spriteCacheState}
                  settingsState={settingsState}
                  savedPokemonState={savedPokemonState}
                  vgcPastesState={vgcPastesState}
                  vgcRealSetsState={vgcRealSetsState}
                  canReorder={canReorderTeams}
                  reorderHandlers={getTeamHandlers(id)}
                />
              );
            })}
          </div>
          </>
        )}
        </div>
      </div>

      {/* Import Team Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <ImportTeamModal
            onClose={() => {
              setIsImportModalOpen(false);
              setImportPrefillRow(null);
            }}
            onImport={teamsState.addTeam}
            databaseState={databaseState}
            savedPokemonState={savedPokemonState}
            resolveSprite={spriteCacheState.resolveSprite}
            existingTeamNames={teamsState.teams.map(team => team.name)}
            defaultRegulation={settingsState.settings.defaultRegulation}
            catalogRow={importPrefillRow ?? undefined}
            syncUsername={settingsState.settings.syncUsername}
          />
        )}
      </AnimatePresence>

      {/* VGCPastes Sample Team Catalog Modal */}
      <AnimatePresence>
        {isCatalogModalOpen && (
          <VgcPasteCatalogModal
            onClose={() => setIsCatalogModalOpen(false)}
            onPickPaste={(row) => {
              setIsCatalogModalOpen(false);
              setImportPrefillRow(row);
              setIsImportModalOpen(true);
            }}
            vgcPastesState={vgcPastesState}
            defaultRegulation={settingsState.settings.defaultRegulation}
            speciesRosterState={speciesRosterState}
            spriteCacheState={spriteCacheState}
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
