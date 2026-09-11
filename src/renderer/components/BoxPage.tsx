/**
 * BoxPage.tsx - Saved Builds Library Browser
 *
 * Box Tab Leg 1 (see TODO.md's Saved Builds Box milestone). A discoverable
 * home for useSavedPokemon.ts's flat library outside the Calc page (which
 * only exposes it via CalcSavedSetsModal, reachable solely by already
 * knowing a species has a saved match there). Every entry renders as a
 * BoxCard.tsx, collapsed by default (sprite + label), expanding in place to
 * a full editable card on click - no fixed pagination/page-size, a plain
 * flex-wrap so collapsed tiles and one or more wider expanded cards reflow
 * together in the same continuous grid (decided 2026-09-10 over a
 * PC-box-style paginated layout).
 *
 * No team/format to derive a ruleset from (unlike TeamCard.tsx's roster
 * slots), so rulesetId falls back to the app's own defaultRegulation
 * setting, same source CalcPage.tsx uses for its own ruleset-less context.
 *
 * "+ New Build" (Box Tab Leg 2, see TODO.md): a dashed tile that opens
 * AddPokemonStatTable.tsx as a modal (Add Pokémon: Sortable Base-Stat Table
 * Leg 2, see TODO.md - previously SpeciesPickerCard.tsx, same swap
 * TeamCard.tsx's own "+ Add Pokémon" trigger got in that milestone's Leg 1),
 * except it has no team/slot to write into - species -> useRosterActions.ts's
 * buildSlot (same usage-based default a fresh roster slot gets) ->
 * SaveToLibraryDialog's name prompt -> addSavedPokemonBatch, then
 * toggleCardExpansion opens the brand-new entry straight into edit. The
 * entry's id is generated up front (rather than left to
 * addSavedPokemonBatch's own default) specifically so it's known before the
 * save resolves and can be handed to toggleCardExpansion the instant it does.
 * useRosterActions needs an `updateTeam` to construct (only used by its
 * other actions - swapSlot/addSlot/etc - none of which this page calls), so
 * a no-op stub stands in; buildSlot itself never touches it. No `savedPokemon`/
 * `onSelectSaved` passed through - same circular-flow reasoning
 * SpeciesPickerCard.tsx's header comment used to give for why this call site
 * never passed them.
 *
 * "Add to Team…" (Box Tab Leg 4, see TODO.md): a BoxCard's context menu
 * opens AddToTeamDialog, tracked here the same `useState` shape as
 * `pendingNewBuild` above (which entry's dialog is open, not a boolean -
 * only one can be open at a time). Picking a team there clones the entry's
 * pokemon (`utils/clonePokemon.ts::cloneSavedPokemon`, the same clone
 * TeamCard.tsx::handlePasteNewPokemon uses for a clipboard paste) and
 * appends it via `teamsState.updateTeam` - a copy, not a move, so the Box
 * entry itself is untouched.
 *
 * Right-click-to-import (Box Tab Leg 5, see TODO.md): a right-click
 * anywhere in the grid container opens a two-item menu, same
 * click-coordinates `ContextMenu` and grid-level-paste pattern
 * `TeamCard.tsx`'s Leg 2 roster grid already established (`BoxCard.tsx`'s
 * own per-entry context menu stops propagation so a right-click landing on
 * an actual card never also opens this one). "Paste Pokémon" is a straight
 * port of `TeamCard.tsx::handlePasteNewPokemon` - `readPokemonFromClipboard`
 * + a fresh id - calling `addSavedPokemonBatch` instead of `updateTeam`, and
 * with no 6-slot room gate since Box has no roster-size constraint. "Paste
 * Showdown Text" reuses the same `parseShowdownText` ->
 * `enrichPokemonWithAPI` pipeline `ImportTeamModal.tsx`'s import path uses,
 * one Box entry per successfully-parsed block, but skips that modal's
 * saved-build review step entirely - both items commit immediately with no
 * confirmation dialog, and unparseable/empty clipboard content is a silent
 * no-op either way (matches the existing Paste Pokémon/Paste Team
 * convention elsewhere in the app; there's no toast system to surface an
 * error).
 *
 * Sort-mode toggle (Box Tab: Reorder Leg 7, see TODO.md): Alphabetical
 * (this page's original always-on species+label sort, still the default)
 * vs. Custom order, persisted as `settingsState.settings.boxSortMode`.
 * Custom order is plain array order in `savedPokemonState.savedPokemon`
 * itself - no dedicated order field, same as `TeamsDatabase.teams` via
 * `reorderTeam` - so in Custom mode the grid renders that array as-is and
 * `BoxCard.tsx`'s drag handles call `reorderSavedPokemon` to rearrange it.
 * The very first switch to Custom mode seeds that array order from the
 * current Alphabetical view (`handleSetSortMode` below) so flipping modes
 * doesn't visually jump the grid; `settingsState.settings.boxCustomOrderSeeded`
 * gates that to a one-time seed so a later toggle back to Custom never
 * clobbers an already-dragged order.
 *
 * Search (Box Tab: Search Leg 8, see TODO.md): a plain text input next to
 * the sort-mode toggle, filtering `displayedEntries` *after* sort-mode
 * selection is applied - so in Custom mode the surviving matches still
 * render in whatever drag order they hold in the underlying array, just
 * with non-matching entries hidden rather than removed. Reordering while
 * filtered isn't given any special handling: `BoxCard.tsx`'s drag handles
 * always insert the dragged entry immediately before the drop target in
 * the full underlying array (see `reorderSavedPokemon`), same well-defined
 * behavior as an unfiltered drag - it's just less visually obvious which
 * index a drop lands on while some entries in between are hidden.
 * Search behavior is a straight port of `SpeciesPickerCard.tsx`'s own
 * '#tag'-chain resolution (no '#tag' -> plain substring match against
 * label OR species; one or more '#tag's -> type -> move -> ability
 * resolution per tag, ANDed together, matched against the entry's
 * underlying species) rather than a reimplementation, so the two search
 * bars behave identically.
 *
 * Favoriting (Box Tab: Favoriting Leg 1, see TODO.md): `SavedPokemonEntry.
 * favorite`, toggled via `BoxCard.tsx`'s own corner-star buttons, sorts
 * favorited entries to the top of `sortedEntries` - applied after either
 * Alphabetical or Custom ordering (`utils/savedPokemonSort.ts`'s
 * `sortSavedPokemonByFavorite`), same composition point/precedent as
 * `TeamsPage.tsx` layering `teamSort.ts`'s `sortTeamsByFavorite` over its
 * own base sort.
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { BoxSortMode, ImportedPokemonInfo, SavedPokemonEntry, SpeciesRosterEntry } from '../types/pokemon';
import type { UseSavedPokemonReturn } from '../hooks/useSavedPokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../hooks/useSettings';
import type { UseTeamsReturn } from '../hooks/useTeams';
import { useRosterActions } from '../hooks/useRosterActions';
import { usePokemonTypeFilter } from '../hooks/usePokemonTypeFilter';
import { usePokemonMoveFilter, isMoveResolved } from '../hooks/usePokemonMoveFilter';
import { usePokemonAbilityFilter } from '../hooks/usePokemonAbilityFilter';
import { parseTagFilters } from '../utils/tagSearch';
import { ALL_TYPES } from '../config/typeEffectiveness';
import { normalizeNameForAPI } from '../services/pokeapiService';
import { toRegulationId } from '../utils/pokemonRules';
import { readPokemonFromClipboard } from '../utils/clipboardPayload';
import { parseShowdownText } from '../services/parser';
import { enrichPokemonWithAPI } from '../services/pokeapi';
import { sortSavedPokemonByFavorite } from '../utils/savedPokemonSort';
import BoxCard from './BoxCard';
import AddPokemonStatTable from './AddPokemonStatTable';
import SaveToLibraryDialog from './SaveToLibraryDialog';
import AddToTeamDialog from './AddToTeamDialog';
import ContextMenu from './ContextMenu';

interface BoxPageProps {
  savedPokemonState: UseSavedPokemonReturn;
  gameDataState: UseGameDataReturn;
  databaseState: UseDatabaseReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
  teamsState: UseTeamsReturn;
}

// buildSlot never calls updateTeam - see the header comment above.
const NOOP_UPDATE_TEAM = async () => false;

// Same species-then-label sort CalcSavedSetsModal.tsx uses for its own
// management list - Alphabetical mode's own sort, and also what seeds Custom
// mode's array order the first time it's switched to (see header comment).
function sortAlphabetically(entries: SavedPokemonEntry[]): SavedPokemonEntry[] {
  return [...entries].sort((a, b) => {
    const speciesCompare = a.pokemon.showdownData.species.localeCompare(b.pokemon.showdownData.species);
    return speciesCompare !== 0 ? speciesCompare : a.label.localeCompare(b.label);
  });
}

export default function BoxPage({ savedPokemonState, gameDataState, databaseState, speciesRosterState, spriteCacheState, settingsState, teamsState }: BoxPageProps) {
  const rulesetId = toRegulationId(settingsState.settings.defaultRegulation);
  const rosterActions = useRosterActions(
    NOOP_UPDATE_TEAM,
    databaseState.getCachedEntry,
    databaseState.setCacheEntry,
    gameDataState.getEnrichedSpeciesOptions,
    gameDataState.getChampionsUsage
  );

  const [search, setSearch] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isBuildingSpecies, setIsBuildingSpecies] = useState(false);
  // Holds the freshly-built Pokémon and its pre-generated id between
  // buildSlot resolving and the save-name dialog closing - see header comment.
  const [pendingNewBuild, setPendingNewBuild] = useState<{ id: string; pokemon: ImportedPokemonInfo } | null>(null);
  // Which Box entry's "Add to Team…" dialog is open - see header comment.
  const [addToTeamEntryId, setAddToTeamEntryId] = useState<string | null>(null);
  // Grid-level "Paste Pokémon"/"Paste Showdown Text" menu (Leg 5, see
  // header comment above).
  const [pasteContextMenuPos, setPasteContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handleSelectNewSpecies = async (species: SpeciesRosterEntry, itemOverride?: string) => {
    setIsPickerOpen(false);
    setIsBuildingSpecies(true);
    try {
      const pokemon = await rosterActions.buildSlot(species.name, itemOverride);
      setPendingNewBuild({ id: crypto.randomUUID(), pokemon });
    } finally {
      setIsBuildingSpecies(false);
    }
  };

  const handleSaveNewBuild = async (label: string): Promise<boolean> => {
    if (!pendingNewBuild) return false;
    const success = await savedPokemonState.addSavedPokemonBatch([pendingNewBuild.pokemon], [label], [pendingNewBuild.id]);
    if (success) savedPokemonState.toggleCardExpansion(pendingNewBuild.id);
    return success;
  };

  const sortMode = settingsState.settings.boxSortMode;
  // Custom mode renders savedPokemon's own array order as-is (BoxCard.tsx's
  // drag handles rearrange that array directly via reorderSavedPokemon) -
  // Alphabetical mode re-derives species-then-label order every render, same
  // as CalcSavedSetsModal.tsx's own management list, for consistent browsing
  // order across both surfaces.
  // Favorites-first applies after either Alphabetical or Custom ordering
  // (Box Tab: Favoriting, see TODO.md) - same composition point/precedent as
  // TeamsPage.tsx layering sortTeamsByFavorite over its own base sort.
  const sortedEntries = sortSavedPokemonByFavorite(
    sortMode === 'custom'
      ? savedPokemonState.savedPokemon
      : sortAlphabetically(savedPokemonState.savedPokemon)
  );

  // Search (see header comment) - a straight port of
  // SpeciesPickerCard.tsx's own '#tag'-chain resolution, applied to each
  // entry's underlying species instead of a roster species name.
  const tags = parseTagFilters(search).filter(t => t.length > 0);
  const isTypeTag = (t: string): boolean => (ALL_TYPES as readonly string[]).includes(t);
  const typeTags = tags.filter(isTypeTag);
  const normalizedNonTypeTags = tags.filter(t => !isTypeTag(t)).map(normalizeNameForAPI);

  const typeMembers = usePokemonTypeFilter(typeTags);
  const moveMembers = usePokemonMoveFilter(normalizedNonTypeTags);
  const moveFailedTags = normalizedNonTypeTags.filter(t => isMoveResolved(t) && moveMembers.get(t) === null);
  const abilityMembers = usePokemonAbilityFilter(moveFailedTags);

  // Resolves one tag to its matching species set, or null while it's still
  // in flight somewhere along the type -> move -> ability chain.
  function resolvedSetForTag(tag: string): Set<string> | null {
    if (isTypeTag(tag)) return typeMembers.get(tag) ?? null;
    const normalized = normalizeNameForAPI(tag);
    const moveSet = moveMembers.get(normalized) ?? null;
    if (moveSet !== null) return moveSet;
    if (isMoveResolved(normalized)) return abilityMembers.get(normalized) ?? null;
    return null;
  }

  const tagSets = tags.map(resolvedSetForTag);
  const anyTagPending = tagSets.some(set => set === null);

  const matchesTags = (speciesName: string): boolean =>
    anyTagPending ? false : tagSets.every(set => set!.has(speciesName.toLowerCase()));

  const displayedEntries = tags.length === 0
    ? sortedEntries.filter(entry =>
        entry.label.toLowerCase().includes(search.toLowerCase()) ||
        entry.pokemon.showdownData.species.toLowerCase().includes(search.toLowerCase())
      )
    : sortedEntries.filter(entry => matchesTags(entry.pokemon.showdownData.species));

  const isSearching = search.trim().length > 0;

  const handleSetSortMode = async (mode: BoxSortMode) => {
    if (mode === 'custom' && !settingsState.settings.boxCustomOrderSeeded) {
      // First-ever switch to Custom: seed the stored array order from the
      // current Alphabetical view so the grid doesn't visually jump, then
      // never do this again (see header comment).
      const alphabeticalIds = sortAlphabetically(savedPokemonState.savedPokemon).map(e => e.id);
      await savedPokemonState.setSavedPokemonOrder(alphabeticalIds);
      await settingsState.updateSettings({ boxSortMode: mode, boxCustomOrderSeeded: true });
    } else {
      await settingsState.updateSettings({ boxSortMode: mode });
    }
  };

  const addToTeamEntry = addToTeamEntryId
    ? savedPokemonState.savedPokemon.find(e => e.id === addToTeamEntryId) ?? null
    : null;

  const handleAddToTeam = async (teamId: string, cloned: ImportedPokemonInfo): Promise<boolean> => {
    const team = teamsState.teams.find(t => t.id === teamId);
    if (!team) return false;
    return teamsState.updateTeam(teamId, { pokemon: [...team.pokemon, cloned] });
  };

  const handleGridContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPasteContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  // "Paste Pokémon" (Leg 5) - straight port of
  // TeamCard.tsx::handlePasteNewPokemon, minus its 6-slot room gate (Box has
  // no roster-size constraint). Silently a no-op if the clipboard doesn't
  // hold a ChoiceBuds Pokémon payload.
  const handlePastePokemon = async () => {
    const pasted = await readPokemonFromClipboard();
    if (!pasted) return;
    await savedPokemonState.addSavedPokemonBatch([{ ...pasted, id: crypto.randomUUID() }]);
  };

  // "Paste Showdown Text" (Leg 5) - same parse -> enrich pipeline
  // ImportTeamModal.tsx's import path uses, minus its saved-build review
  // step; one Box entry per successfully-parsed block. Silently a no-op if
  // the clipboard is empty or doesn't parse as Showdown text.
  const handlePasteShowdownText = async () => {
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      return;
    }
    if (!text.trim()) return;

    const parseResult = parseShowdownText(text);
    if (!parseResult.success || parseResult.pokemon.length === 0) return;

    const enriched: ImportedPokemonInfo[] = [];
    for (const pokemon of parseResult.pokemon) {
      enriched.push(await enrichPokemonWithAPI(pokemon, databaseState.getCachedEntry, databaseState.setCacheEntry));
    }
    await savedPokemonState.addSavedPokemonBatch(enriched);
  };

  return (
    <div className="h-full flex flex-col">
      <header className="bg-zinc-800 border-b border-zinc-700 px-6 py-4" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Box</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {displayedEntries.length} saved {displayedEntries.length === 1 ? 'build' : 'builds'}
            </p>
          </div>

          <div className="flex gap-2 items-center">
            {/* Search (Box Tab: Search Leg 8, see TODO.md) - same '#tag'
                chain SpeciesPickerCard.tsx's own search bar supports. */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search builds... (#fire, #dragon dance, ...)"
              className="w-64 px-3 py-2 text-sm text-white bg-zinc-700 border border-zinc-600 rounded-lg outline-none focus:border-accent-gold placeholder:text-zinc-500"
            />

            {/* Sort-mode toggle (Box Tab: Reorder Leg 7, see TODO.md) - same
                pill-button filter style TeamsPage.tsx uses for its format
                filters. */}
            {(['alphabetical', 'custom'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => handleSetSortMode(mode)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  sortMode === mode
                    ? 'bg-accent-gold text-zinc-900'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                {mode === 'alphabetical' ? 'Alphabetical' : 'Custom order'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6" style={{ scrollbarGutter: 'stable' }}>
        {savedPokemonState.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-zinc-400">Loading box...</div>
          </div>
        ) : savedPokemonState.error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-400">Error: {savedPokemonState.error}</div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 items-start" onContextMenu={handleGridContextMenu}>
            <button
              onClick={() => setIsPickerOpen(true)}
              disabled={isBuildingSpecies}
              className="w-[280px] min-h-[280px] flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              <span className="text-sm font-semibold">{isBuildingSpecies ? 'Building…' : '+ New Build'}</span>
            </button>

            {displayedEntries.length === 0 && (
              <div className="flex flex-col justify-center text-zinc-400 px-2 min-h-[280px]">
                {isSearching ? (
                  <p className="text-lg">
                    {tags.length > 0 && anyTagPending ? 'Loading…' : 'No builds match search'}
                  </p>
                ) : (
                  <>
                    <p className="text-lg">No saved builds yet</p>
                    <p className="text-sm mt-2">Save a Pokémon to the library from Teams or Calc, or start one with "+ New Build"</p>
                  </>
                )}
              </div>
            )}

            {displayedEntries.map(entry => (
              <BoxCard
                key={entry.id}
                entry={entry}
                isExpanded={savedPokemonState.expandedCardIds.has(entry.id)}
                onToggleExpand={() => savedPokemonState.toggleCardExpansion(entry.id)}
                onUpdatePokemon={(updates) => savedPokemonState.updateSavedPokemon(entry.id, updates)}
                onAddToTeam={() => setAddToTeamEntryId(entry.id)}
                onRename={(label) => savedPokemonState.renameSavedPokemon(entry.id, label)}
                onDuplicate={() => savedPokemonState.duplicateSavedPokemon(entry.id)}
                onToggleFavorite={() => savedPokemonState.toggleSavedPokemonFavorite(entry.id)}
                onDelete={() => savedPokemonState.deleteSavedPokemon(entry.id)}
                onReorder={(draggedId, targetId) => savedPokemonState.reorderSavedPokemon(draggedId, targetId)}
                sortMode={sortMode}
                gameDataState={gameDataState}
                rulesetId={rulesetId}
                resolveSprite={spriteCacheState.resolveSprite}
                showAnimatedSprites={settingsState.settings.showAnimatedSprites}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isPickerOpen && (
          <AddPokemonStatTable
            roster={speciesRosterState.roster}
            rulesetId={rulesetId}
            resolveSprite={spriteCacheState.resolveSprite}
            getCachedEntry={databaseState.getCachedEntry}
            onSelect={handleSelectNewSpecies}
            onClose={() => setIsPickerOpen(false)}
          />
        )}
        {pendingNewBuild && (
          <SaveToLibraryDialog
            pokemon={pendingNewBuild.pokemon}
            resolveSprite={spriteCacheState.resolveSprite}
            onSave={handleSaveNewBuild}
            onClose={() => setPendingNewBuild(null)}
          />
        )}
        {addToTeamEntry && (
          <AddToTeamDialog
            pokemon={addToTeamEntry.pokemon}
            teams={teamsState.teams}
            onAddToTeam={handleAddToTeam}
            onClose={() => setAddToTeamEntryId(null)}
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
              label: 'Paste Pokémon',
              onClick: handlePastePokemon,
              icon: (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 4.5h1.5a1.5 1.5 0 0 1 3 0H15a1 1 0 0 1 1 1V7H8V5.5a1 1 0 0 1 1-1Z" />
                  <path d="M8 6H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 18 6h-2" />
                </svg>
              ),
            },
            {
              label: 'Paste Showdown Text',
              onClick: handlePasteShowdownText,
              icon: (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3.5h9l4.5 4.5v12.5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4.5 20.5v-15A1.5 1.5 0 0 1 6 3.5Z" />
                  <path d="M9 12h6M9 15.5h6M9 8.5h2" />
                </svg>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
