import { useState } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Team, SpeciesRosterEntry, SavedPokemonEntry, type ImportedPokemonInfo } from '../types/pokemon';
import { toMotionDragProps, useGridReorder, type GridReorderHandlers } from '../hooks/useGridReorder';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../hooks/useSettings';
import type { UseSavedPokemonReturn } from '../hooks/useSavedPokemon';
import type { UseVgcPastesCacheReturn } from '../hooks/useVgcPastesCache';
import type { UseVgcRealSetsCacheReturn } from '../hooks/useVgcRealSetsCache';
import { useRosterActions } from '../hooks/useRosterActions';
import { toRegulationId } from '../utils/pokemonRules';
import { getRegulationTheme } from '../config/pokemonTheme';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import { getTotalSP, MAX_TOTAL_SP } from '../utils/evTotal';
import { getMegaApiSlug } from '../config/megaEvolution';
import { getCachedMegaSprite, useMegaSpritePrefetch } from '../hooks/useMegaSprite';
import { CARD_EXPAND_ENTER_TRANSITION, CARD_EXPAND_EXIT_TRANSITION, DRAG_REORDER_TRANSITION } from '../config/motion';
import PokemonCard from './PokemonCard';
import AddPokemonStatTable from './AddPokemonStatTable';
import TeamOverflowMenu from './TeamOverflowMenu';
import RegulationBadge from './RegulationBadge';
import ExportTeamModal from './ExportTeamModal';
import TeamExportImageModal from './TeamExportImageModal';
import TeamSheetPdfModal from './TeamSheetPdfModal';
import ContextMenu from './ContextMenu';
import { copyTeamToClipboard, readTeamFromClipboard, readPokemonFromClipboard } from '../utils/clipboardPayload';
import { buildPastedTeam } from '../utils/teamPaste';
import { cloneSavedPokemon } from '../utils/clonePokemon';

interface TeamCardProps {
  team: Team;
  onDelete?: () => void;
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
  savedPokemonState: UseSavedPokemonReturn;
  /** Shared single instances (mounted once in TeamsPage.tsx) threaded down
      to each PokemonCard - see PokemonCard.tsx's own prop doc for why. */
  vgcPastesState: UseVgcPastesCacheReturn;
  vgcRealSetsState: UseVgcRealSetsCacheReturn;
  // Teams-list reorder (Touch Drag-and-Drop: Framer Motion Reorder Leg 1,
  // see TODO.md) - TeamsPage.tsx owns the Reorder.Group's local order state
  // (it wraps every TeamCard), so this card only starts/commits its own drag.
  // canReorder is false while a format filter is hiding any teams (dragging
  // against a partial view has no well-defined "moved to the very end"
  // target) - same gate shape as BoxCard.tsx's own isCustomOrder check.
  canReorder: boolean;
  reorderHandlers: GridReorderHandlers;
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

export default function TeamCard({ team, onDelete, teamsState, databaseState, gameDataState, speciesRosterState, spriteCacheState, settingsState, savedPokemonState, vgcPastesState, vgcRealSetsState, canReorder, reorderHandlers }: TeamCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Collapse-flicker fix (Team Card Collapse Animation Flicker Leg 1, see
  // TODO.md): col-span-full used to be driven directly off isExpanded, so
  // toggling it off snapped this card's grid column back to a single column
  // the instant the button was clicked - before the expanded content's own
  // height/fade exit transition (cardExpandVariants below) had actually
  // finished. That left the still-collapsing content squeezed into the
  // narrower single-column width (re-triggering its own @container
  // grid-cols-3/6 breakpoint mid-animation) while framer's layout="position"
  // on the outer motion.div FLIP-animated the sibling cards into their
  // post-collapse positions using the already-final (narrow) layout - the
  // width snap and the still-tall content produced the reported flicker.
  // isFullWidth now stays true for the whole exit transition and only drops
  // once AnimatePresence's onExitComplete fires below, so the grid reflow
  // that moves other cards happens after this card is actually done
  // shrinking, not before.
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [localTeamName, setLocalTeamName] = useState(team.name);
  const [localAuthor, setLocalAuthor] = useState(team.author || '');
  const [localNotes, setLocalNotes] = useState(team.notes || '');
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImageExportOpen, setIsImageExportOpen] = useState(false);
  const [isPdfExportOpen, setIsPdfExportOpen] = useState(false);
  // Teams-list drag source (Touch Drag-and-Drop: Framer Motion Reorder Leg 1,
  // see TODO.md) - only the grip handle below starts a drag (dragListener is
  // off on the Reorder.Item this card returns), same "handle-only, not the
  // whole header" gate Leg 1's prior native-DnD implementation established.
  const dragControls = useDragControls();
  // Roster reorder within this team (Touch Drag-and-Drop: Framer Motion
  // Reorder Leg 1, see TODO.md) - local visual order of pokemon ids, synced
  // from team.pokemon below via the "adjust state during render" pattern
  // (CalcTeamTray.tsx's preferredTeamId uses the same shape) rather than an
  // effect, so a live drag's own setOrderedPokemonIds calls (fired
  // continuously by Reorder.Group's onReorder) aren't immediately clobbered
  // by re-syncing against team.pokemon on every incidental re-render - only
  // a real add/remove/reorder-from-elsewhere changes rosterIdsKey below.
  const rosterIdsKey = team.pokemon.map(p => p.id).join('|');
  const [orderedPokemonIds, setOrderedPokemonIds] = useState(() => team.pokemon.map(p => p.id));
  const [prevRosterIdsKey, setPrevRosterIdsKey] = useState(rosterIdsKey);
  if (rosterIdsKey !== prevRosterIdsKey) {
    setPrevRosterIdsKey(rosterIdsKey);
    setOrderedPokemonIds(team.pokemon.map(p => p.id));
  }
  const { containerRef: rosterGridRef, getHandlers: getRosterHandlers } = useGridReorder({
    orderedIds: orderedPokemonIds,
    setOrderedIds: setOrderedPokemonIds,
    onCommit: ids => {
      const reordered = ids
        .map(oid => team.pokemon.find(pk => pk.id === oid))
        .filter((pk): pk is ImportedPokemonInfo => pk !== undefined);
      teamsState.updateTeam(team.id, { pokemon: reordered });
    },
  });
  // Quick Copy/Paste Pokémon & Teams via Right-Click (Leg 1, see TODO.md) -
  // same click-coordinates ContextMenu pattern PokemonCard.tsx already
  // established for its own right-click menu.
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  // "Paste Pokémon" anywhere within the roster grid, not just onto an
  // existing PokemonCard (Leg 2, see TODO.md) - a separate menu/position
  // from the header's team-level one above, opened from the grid container
  // itself; PokemonCard's own per-slot context menu stops propagation so a
  // right-click that lands on an actual card never also opens this one.
  const [pokemonContextMenuPos, setPokemonContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  // Warms useMegaSprite.ts's shared id/URL cache so the mini sprite strip
  // below (a plain .map(), not a per-item component - Rules of Hooks forbids
  // useMegaSprite itself there) can read a Mega form's real sprite via
  // getCachedMegaSprite instead of always falling back to the base species -
  // same pattern SpeedTiersPage.tsx uses, see that hook's own doc comment.
  useMegaSpritePrefetch();
  const { updateTeam, addTeam } = teamsState;
  const rosterActions = useRosterActions(
    updateTeam,
    databaseState.getCachedEntry,
    databaseState.setCacheEntry,
    gameDataState.getEnrichedSpeciesOptions,
    gameDataState.getChampionsUsage
  );

  const handleAddSpecies = async (species: SpeciesRosterEntry, itemOverride?: string) => {
    setIsAddPickerOpen(false);
    await rosterActions.addSlot(team, species.name, itemOverride);
  };

  // Species Clause: no legal team fields the same species twice, so once a
  // species is already on this team it's removed from both the "+ Add
  // Pokémon" picker's plain-roster results and its "From Box" results
  // entirely, rather than left pickable-again with only the post-hoc
  // Validate Team warning to catch it (TeamCard Add-Pokémon: No
  // Species-Clause Dedupe, see TODO.md) - same fix shape as Battle Logger's
  // opponent-roster picker (see COMPLETED.md's Duplicate Pokémon Selectable
  // entry), applied here to both of this picker's add paths.
  const teamSpeciesSeen = new Set(team.pokemon.map(p => p.showdownData.species.toLowerCase()));
  const addPickerRoster = speciesRosterState.roster.filter(s => !teamSpeciesSeen.has(s.name.toLowerCase()));
  const addPickerSavedPokemon = savedPokemonState.savedPokemon.filter(e => !teamSpeciesSeen.has(e.pokemon.showdownData.species.toLowerCase()));

  // "+ Add Pokémon" picking a Box result instead of a bare species (Box
  // Tab: Add from Box via Add Pokémon Search, see TODO.md) - same
  // clone-and-append `cloneSavedPokemon` already gives a fresh clipboard
  // paste (handlePasteNewPokemon below) or AddToTeamDialog.tsx's own pick.
  const handleAddSavedEntry = async (entry: SavedPokemonEntry) => {
    setIsAddPickerOpen(false);
    await updateTeam(team.id, { pokemon: [...team.pokemon, cloneSavedPokemon(entry.pokemon)] });
  };

  // Right-click opens the Copy/Paste Team context menu (Quick Copy/Paste
  // Pokémon & Teams via Right-Click Leg 1, see TODO.md) - same pattern
  // PokemonCard.tsx already established for its own per-Pokémon menu.
  // stopPropagation (Leg 2) keeps this from also bubbling up into
  // TeamsPage.tsx's own anywhere-in-empty-space paste menu.
  const handleTeamContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleCopyTeam = async () => {
    await copyTeamToClipboard(team);
  };

  // Paste always creates a brand-new team (prepended via addTeam, same as a
  // fresh import) rather than overwriting whichever team's card the paste
  // was triggered from - pasting a whole team is a "duplicate from
  // clipboard" operation, not a per-slot in-place replace the way a single
  // Pokémon paste is. See utils/teamPaste.ts::buildPastedTeam for the fresh
  // id/name/favorite handling (Leg 2, see TODO.md) - format/notes/author/
  // battle team number/name are the only fields still carried over verbatim.
  // Silently a no-op if the clipboard doesn't hold a ChoiceBuds Team payload.
  const handlePasteTeam = async () => {
    const pasted = await readTeamFromClipboard();
    if (!pasted) return;
    await addTeam(buildPastedTeam(pasted, teamsState.teams.map(t => t.name)));
  };

  // "Paste Pokémon" anywhere within the roster grid (Leg 2, see TODO.md) -
  // appends a new slot from the clipboard rather than replacing an existing
  // one (there's no specific slot to target when the right-click didn't
  // land on a PokemonCard) - same room gate the "+ Add Pokémon" trigger
  // uses. Silently a no-op past that if the team's already full or the
  // clipboard doesn't hold a ChoiceBuds Pokémon payload.
  const handlePokemonAreaContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setPokemonContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handlePasteNewPokemon = async () => {
    if (team.pokemon.length >= 6) return;
    const pasted = await readPokemonFromClipboard();
    if (!pasted) return;
    const newPokemon = { ...pasted, id: crypto.randomUUID() };
    await updateTeam(team.id, { pokemon: [...team.pokemon, newPokemon] });
  };

  // Teams-list reorder via framer-motion's Reorder.Item (Touch Drag-and-Drop:
  // Framer Motion Reorder Leg 1, see TODO.md) - scoped to a dedicated
  // grip-handle button in the controls pill rather than the whole header
  // (an always-draggable collapsed header was tried once and reverted for
  // making every header click/drag ambiguous - see Leg 1's COMPLETED.md
  // entry). dragListener is off on the Reorder.Item this card returns, so
  // only this handler starts a drag, and only when canReorder allows it.
  const handleGripPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!canReorder) return;
    dragControls.start(e);
  };

  const regulationTheme = getRegulationTheme(toRegulationId(team.format));

  return (
    // layout="position" (leg 4, see TODO.md): animates this card sliding to its
    // new grid slot when setTeamOrder changes team order (position delta only -
    // NOT plain `layout`, which would also try to FLIP-animate the col-span-full
    // width/height change on expand and fight the EXPANDED VIEW CONTAINER's own
    // height animation below for the same box). Reorder.Item (Touch
    // Drag-and-Drop: Framer Motion Reorder Leg 1, see TODO.md) provides this
    // same FLIP behavior itself, replacing the old plain motion.div +
    // layout="position" pairing - value must match whatever identity
    // TeamsPage.tsx's Reorder.Group tracks its items by (team.id).
    // dragListener is off - only the grip handle below starts a drag.
    <motion.div
      layout="position"
      drag
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0}
      data-reorder-id={team.id}
      dragListener={false}
      dragControls={dragControls}
      transition={DRAG_REORDER_TRANSITION}
      {...toMotionDragProps(reorderHandlers)}
      className={`bg-zinc-900/40 border border-zinc-800/80 border-l-4 ${regulationTheme.accentBorder} rounded-xl transition-[background-color,border-color,box-shadow,opacity] ${
      isFullWidth ? 'col-span-full' : ''
    }`}>

      {/* MINIMIZED VIEW CONTAINER ROW - Enhanced Header with Controls */}
      {/* rounded-t-xl replaces the parent's old overflow-hidden clip (removed so
          tooltips/popovers from expanded cards below are never cut off) */}
      <div
        onContextMenu={handleTeamContextMenu}
        className="w-full flex flex-col md:flex-row md:items-center md:min-h-[116px] gap-3 md:gap-0 py-4 px-3 md:px-5 bg-zinc-950/40 rounded-t-xl transition-colors"
      >
        {/* Identity column (header/controls rework leg 2, see TODO.md) - regulation
            badge, team name, and author all moved here from the old far-right
            button cluster, matching the approved mockup's left-column grouping.
            Full width and its own stacked row below `md` (Responsive Layout
            Audit: Teams & Box Leg 1, see TODO.md) - the fixed 190px column
            this row shares with the sprite strip/controls pill has no room on
            a phone viewport, so below `md` each of the three becomes its own
            full-width row instead. */}
        <div className="flex flex-col gap-1 w-full md:min-w-[190px] md:max-w-[190px] md:shrink-0">
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
            hasn't been re-verified live against this new width. flex-wrap
            below `md` (Responsive Layout Audit: Teams & Box Leg 1, see
            TODO.md) - even a full-width mobile row isn't reliably wide
            enough for the strip's 376px content, so it wraps into 2 rows of
            3 there instead of overflowing. */}
        <div className="w-full md:flex-1 flex items-center justify-center">
          <div className="flex flex-row items-center gap-2 flex-wrap justify-center">
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
            still lives in TeamOverflowMenu.tsx's "⋮" dropdown. Centered as
            its own full-width row below `md` (Responsive Layout Audit:
            Teams & Box Leg 1, see TODO.md), same stacking as the identity
            column/sprite strip above it. */}
        <div className="flex items-center justify-center md:justify-start gap-0.5 bg-zinc-800 border border-zinc-700 rounded-full p-1 w-full md:w-auto shrink-0">
          {/* Favorite toggle (Favorite Teams, see TODO.md) - favorited teams
              always sort to the top of the Teams page (TeamsPage.tsx's own
              sort), independent of the drag-reorder position setTeamOrder
              persists. Plain updateTeam call, same as RegulationBadge's
              onChange above - no dedicated hook action needed for a
              single-field toggle. */}
          <button
            onClick={() => updateTeam(team.id, { favorite: !team.favorite })}
            title={team.favorite ? 'Unfavorite' : 'Favorite'}
            className={`w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
              team.favorite ? 'text-accent-gold hover:text-accent-gold-deep' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
            }`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill={team.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
            </svg>
          </button>

          <span className="w-px h-[18px] bg-zinc-700 mx-0.5" />

          {/* Drag handle (Always-On Editing Leg 2, see TODO.md) - scoped to
              just this button, not the whole header, so dragging can't fight
              with clicking the name/author inputs or the Expand/overflow
              buttons (an always-draggable header was tried and reverted for
              exactly that ambiguity - see Leg 1's COMPLETED.md entry). Same
              grip-icon glyph as PokemonCard.tsx's per-slot handle. Dimmed and
              inert while canReorder is false (a format filter is hiding some
              teams) - same disabled-affordance shape as BoxCard.tsx's own
              Alphabetical-mode gate. */}
          <div
            onPointerDown={handleGripPointerDown}
            title={canReorder ? 'Drag to reorder' : 'Clear the format filter to reorder teams'}
            className={`w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-full text-zinc-400 transition-colors select-none ${
              canReorder ? 'hover:text-zinc-200 hover:bg-zinc-700 cursor-grab' : 'opacity-40 cursor-not-allowed'
            }`}
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
            onClick={() => {
              const next = !isExpanded;
              setIsExpanded(next);
              // Expanding: claim the full-width column immediately, before
              // the content grows into it. Collapsing: isFullWidth is left
              // alone here and only cleared by onExitComplete below, once
              // the collapse animation has actually finished.
              if (next) setIsFullWidth(true);
            }}
            className={`w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer ${
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
      <AnimatePresence initial={false} onExitComplete={() => setIsFullWidth(false)}>
        {isExpanded && (
          <motion.div
            key="expanded-content"
            className="@container"
            variants={cardExpandVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
          >
            <div className="p-3 md:p-6 border-t border-zinc-800/60 bg-zinc-900/10 rounded-b-xl">
              {/* Column-count tiers, not a continuous reflow: 1 column on a
                  phone-narrow container, up through 2 and 3, until the
                  container is wide enough to snap to 6 (1x6). The original
                  1760px breakpoint (6*280px + 5*1rem gaps, treating 280px as
                  a hard requirement rather than PokemonCard's actual
                  max-w-[280px] cap) was never reachable on a real laptop.
                  Measured live via run-desktop (see TODO.md) on the
                  reporter's actual setup - 14" MacBook at 1512px, sidebar
                  expanded - this grid's container gets 1251px (after the
                  Team Card Grid Layout Re-check narrowed the sidebar to
                  176px and dropped TeamsPage's duplicated md:px-8 padding).
                  1220px keeps cards >= ~182px at 6 columns, the width
                  EditablePokemonCore's content (two side-by-side type
                  badges, move pills, the SP row) is sized to fit without
                  wrapping or overflowing. An earlier 1040px tier only
                  checked the sprite box's ~158px floor, so at ~170px the
                  second type badge wrapped (uneven card heights) and move
                  names/the SP badge overflowed. Doesn't help a 13" MacBook -
                  not a target device for
                  this fix. The 380px/600px tiers below (Responsive Layout
                  Audit: Teams & Box Leg 1, see TODO.md) were measured the
                  same way, live via run-desktop at a 375px phone viewport
                  with the drawer nav closed, against the same ~158-280px
                  PokemonCard footprint. @[Npx]: is a container-query variant
                  (keyed off the @container ancestor above), not a viewport
                  media query - unlike the old xl:grid-cols-6 this can't
                  misfire from raw viewport width alone. */}
              {/* 2D hit-test reorder (useGridReorder.ts, Web Reorder Jank Leg 2) -
                  items are keyed by pokemon id (orderedPokemonIds above), so
                  identity stays stable across drag re-renders. pokemonIndex
                  passed to each PokemonCard is its authoritative position in
                  team.pokemon (not its visual position here), since that's
                  what PokemonCard's own field edits index into; only the
                  drag-end commit uses the visual order. */}
              <div
                ref={rosterGridRef}
                className="grid grid-cols-1 @[380px]:grid-cols-2 @[600px]:grid-cols-3 @[1220px]:grid-cols-6 gap-4 w-full"
                onContextMenu={handlePokemonAreaContextMenu}
              >
                {orderedPokemonIds.map(id => {
                  const p = team.pokemon.find(pk => pk.id === id);
                  if (!p) return null;
                  return (
                    <PokemonCard
                      key={id}
                      pokemon={p}
                      team={team}
                      pokemonIndex={team.pokemon.indexOf(p)}
                      updateTeam={updateTeam}
                      gameDataState={gameDataState}
                      speciesRosterState={speciesRosterState}
                      spriteCacheState={spriteCacheState}
                      rosterActions={rosterActions}
                      getCachedEntry={databaseState.getCachedEntry}
                      savedPokemonState={savedPokemonState}
                      vgcPastesState={vgcPastesState}
                      vgcRealSetsState={vgcRealSetsState}
                      showAnimatedSprites={settingsState.settings.showAnimatedSprites}
                      reorderHandlers={getRosterHandlers(id)}
                    />
                  );
                })}

                {/* Add-Pokémon trigger (Always-On Editing Leg 2, see TODO.md) -
                    restores the same dashed-box button Leg 1 left disabled, just
                    gated on roster room instead of isEditingTeam now that there's
                    no edit mode to gate behind. Opens AddPokemonStatTable as a
                    modal (Add Pokémon: Sortable Base-Stat Table Leg 1, see
                    TODO.md) rather than swapping this slot's own content the way
                    SpeciesPickerCard used to - a sortable stat table needs more
                    width than a 280px grid slot affords. */}
                {team.pokemon.length < 6 && (
                  <button
                    onClick={() => setIsAddPickerOpen(true)}
                    className="w-full max-w-[280px] h-full min-h-[280px] flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-semibold">+ Add Pokémon</span>
                  </button>
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

      {contextMenuPos && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onClose={() => setContextMenuPos(null)}
          items={[
            {
              label: 'Copy Team',
              onClick: handleCopyTeam,
              icon: (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="11" height="11" rx="1.5" />
                  <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
                </svg>
              ),
            },
            {
              label: 'Paste as New Team',
              onClick: handlePasteTeam,
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

      {/* "Paste Pokémon" anywhere within the roster grid, distinct from the
          header's team-level menu above (Leg 2, see TODO.md). */}
      {pokemonContextMenuPos && (
        <ContextMenu
          x={pokemonContextMenuPos.x}
          y={pokemonContextMenuPos.y}
          onClose={() => setPokemonContextMenuPos(null)}
          items={[
            {
              label: 'Paste Pokémon',
              onClick: handlePasteNewPokemon,
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

      <AnimatePresence>
        {isAddPickerOpen && (
          <AddPokemonStatTable
            roster={addPickerRoster}
            rulesetId={toRegulationId(team.format)}
            resolveSprite={spriteCacheState.resolveSprite}
            getCachedEntry={databaseState.getCachedEntry}
            onSelect={handleAddSpecies}
            onClose={() => setIsAddPickerOpen(false)}
            savedPokemon={addPickerSavedPokemon}
            onSelectSaved={handleAddSavedEntry}
          />
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
