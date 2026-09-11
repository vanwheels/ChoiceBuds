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
 * "+ New Build" (species picker, buildSlot-based default, name-prompt,
 * auto-expand-into-edit) is deliberately out of scope for this leg - see
 * TODO.md's Box Tab Leg 2 item.
 */

import type { UseSavedPokemonReturn } from '../hooks/useSavedPokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../hooks/useSettings';
import { toRegulationId } from '../utils/pokemonRules';
import BoxCard from './BoxCard';

interface BoxPageProps {
  savedPokemonState: UseSavedPokemonReturn;
  gameDataState: UseGameDataReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
}

export default function BoxPage({ savedPokemonState, gameDataState, spriteCacheState, settingsState }: BoxPageProps) {
  const rulesetId = toRegulationId(settingsState.settings.defaultRegulation);

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
        ) : sortedEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
            <p className="text-lg">No saved builds yet</p>
            <p className="text-sm mt-2">Save a Pokémon to the library from Teams or Calc to see it here</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 items-start">
            {sortedEntries.map(entry => (
              <BoxCard
                key={entry.id}
                entry={entry}
                isExpanded={savedPokemonState.expandedCardIds.has(entry.id)}
                onToggleExpand={() => savedPokemonState.toggleCardExpansion(entry.id)}
                onUpdatePokemon={(updates) => savedPokemonState.updateSavedPokemon(entry.id, updates)}
                gameDataState={gameDataState}
                rulesetId={rulesetId}
                resolveSprite={spriteCacheState.resolveSprite}
                showAnimatedSprites={settingsState.settings.showAnimatedSprites}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
