import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import { getTotalSP, MAX_TOTAL_SP } from '../utils/evTotal';
import { getMegaApiSlug } from '../config/megaEvolution';
import { getCachedMegaSprite, useMegaSpritePrefetch } from '../hooks/useMegaSprite';
import { TEAMS_LIST_DRAG_TYPE, type TeamsListDragPayload } from '../utils/teamsListDragTypes';
import { CARD_EXPAND_ENTER_TRANSITION, CARD_EXPAND_EXIT_TRANSITION, DRAG_REORDER_TRANSITION } from '../config/motion';
import PokemonCard from './PokemonCard';
import SpeciesPickerCard from './SpeciesPickerCard';
import TeamOverflowMenu from './TeamOverflowMenu';
import RegulationBadge from './RegulationBadge';
import ExportTeamModal from './ExportTeamModal';
import TeamExportImageModal from './TeamExportImageModal';
import TeamSheetPdfModal from './TeamSheetPdfModal';

interface TeamCardProps {
  team: Team;
  onDelete?: () => void;
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
}

// Card expand/collapse (animation/motion leg 2, see TODO.md): animates height
// 0 -> 'auto' via Framer Motion rather than the design demo's plain-CSS
// grid-template-rows trick (Framer measures 'auto' natively, so no
// equivalent trick is needed in real React). `overflow: hidden` only holds
// while a transition is actually in flight - `transitionEnd` flips it back
// to 'visible' once fully expanded, otherwise it would permanently
// reintroduce the popover/tooltip clipping the parent card's own
// overflow-hidden removal (see the comment above the MINIMIZED VIEW
// CONTAINER ROW below) was specifically fixed to avoid.
const cardExpandVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    transition: CARD_EXPAND_EXIT_TRANSITION,
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    overflow: 'hidden',
    // Explicit height here too, not just overflow: live-tested opening the
    // Add Pokemon picker after the expand animation had already settled
    // showed the wrapper's inline height frozen at the pixel value Framer
    // measured during the transition rather than snapping back to real CSS
    // `auto` - so later content growth (the picker, the notes textarea,
    // adding/removing a Pokemon) overflowed past that stale height, got
    // painted over by the next team card in normal flow, and looked exactly
    // like the clipping bug the parent's own overflow-hidden removal (see
    // the comment above the MINIMIZED VIEW CONTAINER ROW below) was fixed to
    // avoid. Forcing both back explicitly once the transition ends closes
    // that gap.
    transitionEnd: { overflow: 'visible', height: 'auto' },
    transition: CARD_EXPAND_ENTER_TRANSITION,
  },
};

export default function TeamCard({ team, onDelete, teamsState, databaseState, gameDataState, speciesRosterState, spriteCacheState, settingsState }: TeamCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localTeamName, setLocalTeamName] = useState(team.name);
  const [localAuthor, setLocalAuthor] = useState(team.author || '');
  const [localNotes, setLocalNotes] = useState(team.notes || '');
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImageExportOpen, setIsImageExportOpen] = useState(false);
  const [isPdfExportOpen, setIsPdfExportOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  // Warms useMegaSprite.ts's shared id/URL cache so the mini sprite strip
  // below (a plain .map(), not a per-item component - Rules of Hooks forbids
  // useMegaSprite itself there) can read a Mega form's real sprite via
  // getCachedMegaSprite instead of always falling back to the base species -
  // same pattern SpeedTiersPage.tsx uses, see that hook's own doc comment.
  useMegaSpritePrefetch();
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

  // Teams-list reorder via drag-and-drop (Always-On Editing Leg 2, see
  // TODO.md) - re-enabled, but scoped to a dedicated grip-handle button in
  // the controls pill rather than the whole header the way Leg 1 found it
  // (an always-draggable collapsed header was tried once and reverted for
  // making every header click/drag ambiguous). Only the handle itself is
  // `draggable`; this handler doesn't need its own gate since nothing else
  // triggers it. Same MIME-type-payload pattern as the Pokemon-within-a-team
  // reorder (utils/teamRosterDragTypes.ts). reorderTeam itself resolves the
  // drop against the full unfiltered teams array, so this works the same
  // whether TeamsPage.tsx is showing "All" or a filtered subset. Only the
  // drag *source* is gated to the handle - any card can still be dropped
  // onto as a target regardless of where the drag started.
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
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
    // layout="position" (leg 4, see TODO.md): animates this card sliding to its
    // new grid slot when reorderTeam changes team order (position delta only -
    // NOT plain `layout`, which would also try to FLIP-animate the col-span-full
    // width/height change on expand and fight the EXPANDED VIEW CONTAINER's own
    // height animation below for the same box).
    <motion.div
      layout="position"
      transition={DRAG_REORDER_TRANSITION}
      className={`bg-zinc-900/40 border border-zinc-800/80 border-l-4 ${regulationTheme.accentBorder} rounded-xl transition-all ${
      isExpanded ? 'col-span-full' : ''
    }`}>

      {/* MINIMIZED VIEW CONTAINER ROW - Enhanced Header with Controls */}
      {/* rounded-t-xl replaces the parent's old overflow-hidden clip (removed so
          tooltips/popovers from expanded cards below are never cut off) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`w-full flex flex-row items-center min-h-[116px] py-4 px-6 bg-zinc-950/40 rounded-t-xl transition-colors ${
          isDragOver ? 'ring-2 ring-inset ring-accent-gold' : ''
        }`}
        style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem' }}
      >
        {/* Identity column (header/controls rework leg 2, see TODO.md) - regulation
            badge, team name, and author all moved here from the old far-right
            button cluster, matching the approved mockup's left-column grouping. */}
        <div className="flex flex-col gap-1 min-w-[190px] max-w-[190px] shrink-0">
          <RegulationBadge team={team} onChange={(format) => updateTeam(team.id, { format })} />

          {/* Team name - permanently editable (Always-On Editing Leg 1, see
              TODO.md), no more isEditingTeam gate. Shows the raw stored
              team.name; no special-casing needed for the old Reg M-A/M-B/M-C
              display prefix (see Team Name Field Reg-Prefix Display in
              COMPLETED.md) - useTeams.ts's normalizeTeam strips it from
              team.name at the read boundary, so it's never present by the
              time this input reads it. */}
          <input
            type="text"
            value={localTeamName}
            onChange={(e) => setLocalTeamName(e.target.value)}
            onBlur={async () => {
              if (localTeamName !== team.name) {
                await updateTeam(team.id, { name: localTeamName });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            placeholder="Untitled Team"
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

          {/* Author - team-level metadata, not per-Pokemon. Pokepaste pages carry one; a plain
              Showdown export doesn't, so this stays manually editable either way. Permanently
              editable (Always-On Editing Leg 1, see TODO.md) - the placeholder covers the
              empty-chrome case the old hide-when-empty behavior used to handle. */}
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
        </div>

        {/* Mini sprite strip (Team Header Sprite Strip leg 1, see TODO.md) -
            flat, non-animated row of species sprites, reverted from the 3D
            coverflow (design-approved 2026-08-29, see TeamCoverflow.tsx's
            history): the perspective/scaling on off-center sprites actively
            hurt the quick species recognition this strip exists for. Always
            reserves 6 slots (empty ones padded) so the strip's width - and
            therefore its centered position between the identity column and
            the controls pill - stays fixed regardless of roster size, same
            as the original pre-coverflow strip. Sprites sized up from that
            strip's 32px to 56px since the 2-column layout's taller header
            (min-h-[116px] above, grown to fit the coverflow) affords more
            room than the strip needs at its old size. Note this strip's
            content width (6 * 56px + 5 * 8px gaps = 376px) is well past the
            coverflow's old fixed 240px box that TeamsPage.tsx's 2-column
            breakpoint comment measured its floor against - that breakpoint
            hasn't been re-verified live against this new width. */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-row items-center gap-2">
            {Array.from({ length: 6 }, (_, idx) => team.pokemon?.[idx]).map((p, idx) => {
              if (!p) return <div key={idx} className="w-14 h-14 shrink-0" />;
              // Same "own Mega Stone" gate PokemonCard.tsx's main sprite
              // uses - see config/megaEvolution.ts.
              const megaApiSlug = getMegaApiSlug(p.showdownData.item, p.showdownData.species);
              const megaSprite = megaApiSlug ? getCachedMegaSprite(megaApiSlug) : null;
              const spriteUrl = megaSprite
                ? (p.showdownData.shiny ? megaSprite.shinySpriteUrl : megaSprite.spriteUrl)
                : getPixelSpriteUrl(p.pokedexNumber, p.showdownData.species, p.showdownData.gender || 'M', p.showdownData.shiny);
              // Over-cap SP warning (Speed Tiers Save Override: Over-Cap SP
              // Warning, see TODO.md) - surfaced here too, not just on the
              // expanded PokemonCard, so the overage is visible without
              // expanding the team card at all.
              const totalSP = getTotalSP(p.showdownData.evs);
              const isOverSPCap = totalSP > MAX_TOTAL_SP;
              return (
                <div key={idx} className="relative w-14 h-14 shrink-0">
                  <img
                    src={spriteCacheState.resolveSprite(spriteUrl)}
                    alt={p.showdownData.species}
                    className="w-14 h-14 object-contain [image-rendering:pixelated]"
                  />
                  {isOverSPCap && (
                    <span
                      title={`${p.showdownData.nickname || p.showdownData.species}: total SP (${totalSP}) exceeds the ${MAX_TOTAL_SP} cap`}
                      className="absolute -top-1 -right-1 text-[9px] font-bold leading-none px-1 py-0.5 rounded bg-red-600 text-white border border-red-400"
                    >
                      ⚠
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pill-shaped controls cluster (header/controls rework leg 2, see
            TODO.md) - the Edit button that used to live here is gone
            (Always-On Editing Leg 1, see TODO.md): field-level edits no
            longer need a mode toggle to unlock. The Drag handle re-adds Leg
            1's other structural gate (drag-reorder) with its own
            always-visible trigger (Always-On Editing Leg 2); delete-slot,
            swap, and add-Pokemon get theirs down in the roster grid instead,
            since they're per-Pokemon/per-slot rather than team-level.
            Everything else (Validate/Export/Export Image/Export PDF/Delete)
            still lives in TeamOverflowMenu.tsx's "⋮" dropdown. */}
        <div className="flex items-center gap-0.5 bg-zinc-800 border border-zinc-700 rounded-full p-1 shrink-0">
          {/* Drag handle (Always-On Editing Leg 2, see TODO.md) - draggable
              is scoped to just this button, not the whole header, so
              dragging can't fight with clicking the name/author inputs or
              the Expand/overflow buttons (an always-draggable header was
              tried and reverted for exactly that ambiguity - see Leg 1's
              COMPLETED.md entry). Same grip-icon glyph as PokemonCard.tsx's
              per-slot handle. */}
          <div
            draggable
            onDragStart={handleDragStart}
            title="Drag to reorder"
            className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors cursor-grab"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <circle cx="9" cy="6" r="1.4" />
              <circle cx="15" cy="6" r="1.4" />
              <circle cx="9" cy="12" r="1.4" />
              <circle cx="15" cy="12" r="1.4" />
              <circle cx="9" cy="18" r="1.4" />
              <circle cx="15" cy="18" r="1.4" />
            </svg>
          </div>

          <span className="w-px h-[18px] bg-zinc-700 mx-0.5" />

          {/* Expand/Collapse Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
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
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="expanded-content"
            className="@container"
            variants={cardExpandVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
          >
            <div className="p-6 border-t border-zinc-800/60 bg-zinc-900/10 rounded-b-xl">
              {/* Two clean states, not a continuous reflow: 3 columns (2x3 for a full
                  6-mon roster) until the container itself is wide enough, then snaps to
                  6 (1x6). The original 1760px breakpoint (6*280px + 5*1rem gaps, treating
                  280px as a hard requirement rather than PokemonCard's actual max-w-[280px]
                  cap) was never reachable on a real laptop. Measured live via run-desktop
                  (see TODO.md) on the reporter's actual setup - 14" MacBook, sidebar
                  expanded (default), 2 real teams, single-column Teams-page layout - this
                  grid only gets 1043px of real container width, well short of even a first
                  attempted 1100px breakpoint. 1040px (a small margin under that measured
                  number) is what's actually reachable there; cards land around ~160px wide
                  at 6 columns, confirmed live to still clear PokemonCard's ~158px
                  fixed-content floor (134px sprite box + padding) without squishing.
                  Doesn't help a 13" MacBook (measured 818px there, sidebar expanded) - not
                  a target device for this fix. @[1040px]: is a container-query variant
                  (keyed off the @container ancestor above), not a viewport media query -
                  unlike the old xl:grid-cols-6 this can't misfire from raw viewport width
                  alone. */}
              <div className="grid grid-cols-3 @[1040px]:grid-cols-6 gap-4 w-full">
                {team.pokemon && team.pokemon.map((p, idx) => (
                  <PokemonCard
                    key={p.id}
                    pokemon={p}
                    team={team}
                    pokemonIndex={idx}
                    updateTeam={updateTeam}
                    gameDataState={gameDataState}
                    speciesRosterState={speciesRosterState}
                    spriteCacheState={spriteCacheState}
                    rosterActions={rosterActions}
                    showAnimatedSprites={settingsState.settings.showAnimatedSprites}
                  />
                ))}

                {/* Add-Pokémon trigger (Always-On Editing Leg 2, see TODO.md) -
                    restores the same dashed-box button Leg 1 left disabled, just
                    gated on roster room instead of isEditingTeam now that there's
                    no edit mode to gate behind. */}
                {team.pokemon.length < 6 && (
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
                      className="w-full max-w-[280px] h-full min-h-[280px] flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer"
                    >
                      <span className="text-sm font-semibold">+ Add Pokémon</span>
                    </button>
                  )
                )}
              </div>

              {/* Strategy Notes - team-level free text (Team.notes), same "local state + save
                  on blur" pattern as the name/author fields above. Permanently editable
                  (Always-On Editing Leg 1, see TODO.md) - the placeholder covers the
                  empty-chrome case the old hide-when-empty behavior used to handle.
                  Placed after the roster grid (not before) so the team's visual composition
                  is always the first thing seen when expanding a card. */}
              <div className="mt-4">
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExportOpen && (
          <ExportTeamModal
            pokemonList={team.pokemon.map(p => p.showdownData)}
            title="Export Team"
            pasteTitle={team.name}
            pasteAuthor={team.author}
            pasteNotes={team.notes}
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
    </motion.div>
  );
}
