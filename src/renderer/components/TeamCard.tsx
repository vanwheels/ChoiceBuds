import { useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  Team,
  SpeciesRosterEntry,
  SavedPokemonEntry,
  type ImportedPokemonInfo,
} from '../types/pokemon';
import {
  toMotionDragProps,
  useGridReorder,
  type GridReorderHandlers,
} from '../hooks/useGridReorder';
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
import { useMegaSpritePrefetch } from '../hooks/useMegaSprite';
import { getMegaApiSlug } from '../config/megaEvolution';
import { DRAG_REORDER_TRANSITION } from '../config/motion';
import TeamCardHeader from './TeamCardHeader';
import TeamCardRosterGrid from './TeamCardRosterGrid';
import TeamCardOverlays from './TeamCardOverlays';
import {
  copyTeamToClipboard,
  readTeamFromClipboard,
  readPokemonFromClipboard,
} from '../utils/clipboardPayload';
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
  // Always enabled now that regulation is its own sort key rather than raw
  // array order - a filtered view is one contiguous group, so a drag within
  // it is well-defined (see Leg 8/Leg 5 in TODO.md's Web Bug Sweep).
  reorderHandlers: GridReorderHandlers;
}

export default function TeamCard({
  team,
  onDelete,
  teamsState,
  databaseState,
  gameDataState,
  speciesRosterState,
  spriteCacheState,
  settingsState,
  savedPokemonState,
  vgcPastesState,
  vgcRealSetsState,
  reorderHandlers,
}: TeamCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Collapse-flicker fix (Team Card Collapse Animation Flicker Leg 1, see
  // TODO.md): col-span-full used to be driven directly off isExpanded, so
  // toggling it off snapped this card's grid column back to a single column
  // the instant the button was clicked - before the expanded content's own
  // height/fade exit transition (TeamCardRosterGrid.tsx's cardExpandVariants)
  // had actually finished. That left the still-collapsing content squeezed
  // into the narrower single-column width (re-triggering its own @container
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
  // Resync off the team.name/author/notes props themselves during render,
  // same "prevProp" shape as StatsColumn.tsx's localEVs fix (see TODO.md's
  // Web Bug Sweep Leg 1) - the onBlur handlers below already set these
  // local values on a user edit, so this only catches an *externally*
  // applied change (a sync pull overwriting team with another device's
  // data). Without this, a stale local value compared against the freshly-
  // synced team.notes/author/name on the next blur reads as "changed" and
  // writes the stale pre-sync text straight back over the synced value -
  // this was the actual cause of "notes don't sync across platforms": the
  // sync pull itself worked, but the open card's textarea silently
  // clobbered it again the next time it lost focus.
  const [prevPropTeamName, setPrevPropTeamName] = useState(team.name);
  if (team.name !== prevPropTeamName) {
    setPrevPropTeamName(team.name);
    setLocalTeamName(team.name);
  }
  const [prevPropAuthor, setPrevPropAuthor] = useState(team.author || '');
  if ((team.author || '') !== prevPropAuthor) {
    setPrevPropAuthor(team.author || '');
    setLocalAuthor(team.author || '');
  }
  const [prevPropNotes, setPrevPropNotes] = useState(team.notes || '');
  if ((team.notes || '') !== prevPropNotes) {
    setPrevPropNotes(team.notes || '');
    setLocalNotes(team.notes || '');
  }
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImageExportOpen, setIsImageExportOpen] = useState(false);
  const [isPdfExportOpen, setIsPdfExportOpen] = useState(false);
  // Teams-list drag source (Touch Drag-and-Drop: Framer Motion Reorder Leg 1,
  // see TODO.md) - only the grip handle in TeamCardHeader.tsx starts a drag
  // (dragListener is off on the Reorder.Item this card returns), same
  // "handle-only, not the whole header" gate Leg 1's prior native-DnD
  // implementation established.
  const dragControls = useDragControls();
  // Roster reorder within this team (Touch Drag-and-Drop: Framer Motion
  // Reorder Leg 1, see TODO.md) - local visual order of pokemon ids, synced
  // from team.pokemon below via the "adjust state during render" pattern
  // (CalcTeamTray.tsx's preferredTeamId uses the same shape) rather than an
  // effect, so a live drag's own setOrderedPokemonIds calls (fired
  // continuously by Reorder.Group's onReorder) aren't immediately clobbered
  // by re-syncing against team.pokemon on every incidental re-render - only
  // a real add/remove/reorder-from-elsewhere changes rosterIdsKey below.
  const rosterIdsKey = team.pokemon.map((p) => p.id).join('|');
  const [orderedPokemonIds, setOrderedPokemonIds] = useState(() => team.pokemon.map((p) => p.id));
  const [prevRosterIdsKey, setPrevRosterIdsKey] = useState(rosterIdsKey);
  if (rosterIdsKey !== prevRosterIdsKey) {
    setPrevRosterIdsKey(rosterIdsKey);
    setOrderedPokemonIds(team.pokemon.map((p) => p.id));
  }
  const { containerRef: rosterGridRef, getHandlers: getRosterHandlers } = useGridReorder({
    orderedIds: orderedPokemonIds,
    setOrderedIds: setOrderedPokemonIds,
    onCommit: (ids) => {
      const reordered = ids
        .map((oid) => team.pokemon.find((pk) => pk.id === oid))
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
  // from the header's team-level one, opened from the grid container
  // itself; PokemonCard's own per-slot context menu stops propagation so a
  // right-click that lands on an actual card never also opens this one.
  const [pokemonContextMenuPos, setPokemonContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  // Warms useMegaSprite.ts's shared id/URL cache so TeamCardHeader.tsx's mini
  // sprite strip (a plain .map(), not a per-item component - Rules of Hooks
  // forbids useMegaSprite itself there) can read a Mega form's real sprite
  // via getCachedMegaSprite instead of always falling back to the base
  // species - same pattern SpeedTiersPage.tsx uses, see that hook's own doc
  // comment. Only this team's own held-stone slugs, not every Mega: one of
  // these per team card, all at once, was ~81 lookups per team on page load
  // and drew PokeAPI 429s.
  useMegaSpritePrefetch(
    team.pokemon.flatMap((p) => {
      const slug = getMegaApiSlug(p.showdownData.item, p.showdownData.species);
      return slug ? [slug] : [];
    }),
  );
  const { updateTeam, addTeam } = teamsState;
  const rosterActions = useRosterActions(
    updateTeam,
    databaseState.getCachedEntry,
    databaseState.setCacheEntry,
    gameDataState.getEnrichedSpeciesOptions,
    gameDataState.getChampionsUsage,
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
  const teamSpeciesSeen = new Set(team.pokemon.map((p) => p.showdownData.species.toLowerCase()));
  const addPickerRoster = speciesRosterState.roster.filter(
    (s) => !teamSpeciesSeen.has(s.name.toLowerCase()),
  );
  const addPickerSavedPokemon = savedPokemonState.savedPokemon.filter(
    (e) => !teamSpeciesSeen.has(e.pokemon.showdownData.species.toLowerCase()),
  );

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
    await addTeam(
      buildPastedTeam(
        pasted,
        teamsState.teams.map((t) => t.name),
      ),
    );
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

  const rulesetId = toRegulationId(team.format);
  const regulationTheme = getRegulationTheme(rulesetId);

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
    // dragListener is off - only the grip handle in TeamCardHeader.tsx starts
    // a drag.
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
      }`}
    >
      <TeamCardHeader
        team={team}
        resolveSprite={spriteCacheState.resolveSprite}
        onContextMenu={handleTeamContextMenu}
        onFormatChange={(format) => updateTeam(team.id, { format })}
        onVisibilityChange={(visibility) => updateTeam(team.id, { visibility })}
        localTeamName={localTeamName}
        onTeamNameChange={setLocalTeamName}
        onTeamNameBlur={async () => {
          if (localTeamName !== team.name) {
            await updateTeam(team.id, { name: localTeamName });
          }
        }}
        localAuthor={localAuthor}
        onAuthorChange={setLocalAuthor}
        onAuthorBlur={async () => {
          if (localAuthor !== (team.author || '')) {
            await updateTeam(team.id, { author: localAuthor.trim() || undefined });
          }
        }}
        onToggleFavorite={() => updateTeam(team.id, { favorite: !team.favorite })}
        onGripPointerDown={(e) => dragControls.start(e)}
        isExpanded={isExpanded}
        onToggleExpand={() => {
          const next = !isExpanded;
          setIsExpanded(next);
          // Expanding: claim the full-width column immediately, before
          // the content grows into it. Collapsing: isFullWidth is left
          // alone here and only cleared once the collapse animation has
          // actually finished (TeamCardRosterGrid.tsx's onExitComplete).
          if (next) setIsFullWidth(true);
        }}
        rulesetId={rulesetId}
        onExport={() => setIsExportOpen(true)}
        onExportImage={() => setIsImageExportOpen(true)}
        onExportPdf={() => setIsPdfExportOpen(true)}
        onDelete={onDelete}
      />

      <TeamCardRosterGrid
        isExpanded={isExpanded}
        onExitComplete={() => setIsFullWidth(false)}
        rosterGridRef={rosterGridRef}
        onPokemonAreaContextMenu={handlePokemonAreaContextMenu}
        orderedPokemonIds={orderedPokemonIds}
        team={team}
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
        getRosterHandlers={getRosterHandlers}
        onAddPokemonClick={() => setIsAddPickerOpen(true)}
        localNotes={localNotes}
        onNotesChange={setLocalNotes}
        onNotesBlur={async () => {
          if (localNotes !== (team.notes || '')) {
            await updateTeam(team.id, { notes: localNotes.trim() || undefined });
          }
        }}
      />

      <TeamCardOverlays
        team={team}
        rulesetId={rulesetId}
        teamsState={teamsState}
        gameDataState={gameDataState}
        spriteCacheState={spriteCacheState}
        settingsState={settingsState}
        getCachedEntry={databaseState.getCachedEntry}
        contextMenuPos={contextMenuPos}
        onCloseContextMenu={() => setContextMenuPos(null)}
        onCopyTeam={handleCopyTeam}
        onPasteTeam={handlePasteTeam}
        pokemonContextMenuPos={pokemonContextMenuPos}
        onClosePokemonContextMenu={() => setPokemonContextMenuPos(null)}
        onPasteNewPokemon={handlePasteNewPokemon}
        isAddPickerOpen={isAddPickerOpen}
        onCloseAddPicker={() => setIsAddPickerOpen(false)}
        addPickerRoster={addPickerRoster}
        resolveSprite={spriteCacheState.resolveSprite}
        onSelectSpecies={handleAddSpecies}
        addPickerSavedPokemon={addPickerSavedPokemon}
        onSelectSaved={handleAddSavedEntry}
        isExportOpen={isExportOpen}
        onCloseExport={() => setIsExportOpen(false)}
        isImageExportOpen={isImageExportOpen}
        onCloseImageExport={() => setIsImageExportOpen(false)}
        isPdfExportOpen={isPdfExportOpen}
        onClosePdfExport={() => setIsPdfExportOpen(false)}
      />
    </motion.div>
  );
}
