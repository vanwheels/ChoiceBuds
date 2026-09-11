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
 * "+ New Build" (Box Tab Leg 2, see TODO.md): a dashed tile, same
 * TeamCard.tsx/SpeciesPickerCard shape as "+ Add Pokémon" on a team, except
 * it has no team/slot to write into - species -> useRosterActions.ts's
 * buildSlot (same usage-based default a fresh roster slot gets) ->
 * SaveToLibraryDialog's name prompt -> addSavedPokemonBatch, then
 * toggleCardExpansion opens the brand-new entry straight into edit. The
 * entry's id is generated up front (rather than left to
 * addSavedPokemonBatch's own default) specifically so it's known before the
 * save resolves and can be handed to toggleCardExpansion the instant it does.
 * useRosterActions needs an `updateTeam` to construct (only used by its
 * other actions - swapSlot/addSlot/etc - none of which this page calls), so
 * a no-op stub stands in; buildSlot itself never touches it.
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { ImportedPokemonInfo, SpeciesRosterEntry } from '../types/pokemon';
import type { UseSavedPokemonReturn } from '../hooks/useSavedPokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../hooks/useSettings';
import { useRosterActions } from '../hooks/useRosterActions';
import { toRegulationId } from '../utils/pokemonRules';
import BoxCard from './BoxCard';
import SpeciesPickerCard from './SpeciesPickerCard';
import SaveToLibraryDialog from './SaveToLibraryDialog';

interface BoxPageProps {
  savedPokemonState: UseSavedPokemonReturn;
  gameDataState: UseGameDataReturn;
  databaseState: UseDatabaseReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
}

// buildSlot never calls updateTeam - see the header comment above.
const NOOP_UPDATE_TEAM = async () => false;

export default function BoxPage({ savedPokemonState, gameDataState, databaseState, speciesRosterState, spriteCacheState, settingsState }: BoxPageProps) {
  const rulesetId = toRegulationId(settingsState.settings.defaultRegulation);
  const rosterActions = useRosterActions(
    NOOP_UPDATE_TEAM,
    databaseState.getCachedEntry,
    databaseState.setCacheEntry,
    gameDataState.getEnrichedSpeciesOptions,
    gameDataState.getChampionsUsage
  );

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isBuildingSpecies, setIsBuildingSpecies] = useState(false);
  // Holds the freshly-built Pokémon and its pre-generated id between
  // buildSlot resolving and the save-name dialog closing - see header comment.
  const [pendingNewBuild, setPendingNewBuild] = useState<{ id: string; pokemon: ImportedPokemonInfo } | null>(null);

  const handleSelectNewSpecies = async (species: SpeciesRosterEntry) => {
    setIsPickerOpen(false);
    setIsBuildingSpecies(true);
    try {
      const pokemon = await rosterActions.buildSlot(species.name);
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

  // Same species-then-label sort CalcSavedSetsModal.tsx uses for its own
  // management list, for consistent browsing order across both surfaces.
  const sortedEntries = [...savedPokemonState.savedPokemon].sort((a, b) => {
    const speciesCompare = a.pokemon.showdownData.species.localeCompare(b.pokemon.showdownData.species);
    return speciesCompare !== 0 ? speciesCompare : a.label.localeCompare(b.label);
  });

  return (
    <div className="h-full flex flex-col">
      <header className="bg-zinc-800 border-b border-zinc-700 px-6 py-4" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
        <h2 className="text-2xl font-bold text-zinc-100">Box</h2>
        <p className="text-sm text-zinc-400 mt-1">
          {sortedEntries.length} saved {sortedEntries.length === 1 ? 'build' : 'builds'}
        </p>
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
          <div className="flex flex-wrap gap-4 items-start">
            {isPickerOpen ? (
              <SpeciesPickerCard
                roster={speciesRosterState.roster}
                rulesetId={rulesetId}
                resolveSprite={spriteCacheState.resolveSprite}
                onSelect={handleSelectNewSpecies}
                onClose={() => setIsPickerOpen(false)}
              />
            ) : (
              <button
                onClick={() => setIsPickerOpen(true)}
                disabled={isBuildingSpecies}
                className="w-[280px] min-h-[280px] flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >
                <span className="text-sm font-semibold">{isBuildingSpecies ? 'Building…' : '+ New Build'}</span>
              </button>
            )}

            {sortedEntries.length === 0 && (
              <div className="flex flex-col justify-center text-zinc-400 px-2 min-h-[280px]">
                <p className="text-lg">No saved builds yet</p>
                <p className="text-sm mt-2">Save a Pokémon to the library from Teams or Calc, or start one with "+ New Build"</p>
              </div>
            )}

            {sortedEntries.map(entry => (
              <BoxCard
                key={entry.id}
                entry={entry}
                isExpanded={savedPokemonState.expandedCardIds.has(entry.id)}
                onToggleExpand={() => savedPokemonState.toggleCardExpansion(entry.id)}
                onUpdatePokemon={(updates) => savedPokemonState.updateSavedPokemon(entry.id, updates)}
                onRename={(label) => savedPokemonState.renameSavedPokemon(entry.id, label)}
                onDuplicate={() => savedPokemonState.duplicateSavedPokemon(entry.id)}
                onDelete={() => savedPokemonState.deleteSavedPokemon(entry.id)}
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
        {pendingNewBuild && (
          <SaveToLibraryDialog
            pokemon={pendingNewBuild.pokemon}
            resolveSprite={spriteCacheState.resolveSprite}
            onSave={handleSaveNewBuild}
            onClose={() => setPendingNewBuild(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
