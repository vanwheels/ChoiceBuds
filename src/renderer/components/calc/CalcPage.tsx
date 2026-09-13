/**
 * CalcPage.tsx - Champions Damage Calculator Tab
 * Layout matches the real calc.pokemonshowdown.com Champions mode: two
 * move grids (one per Pokémon) up top, a shared result detail panel below
 * them, then a 3-column row (Pokémon 1 | Field | Pokémon 2). Not yet wired
 * into the teams database - see useDamageCalc.ts.
 *
 * useDamageCalc (and its @smogon/calc import - the heaviest dependency in
 * the app) is instantiated here rather than in App.tsx specifically so that
 * this whole module stays behind App.tsx's React.lazy() boundary - a
 * Teams-only session never has to parse/load the calc engine.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useDamageCalc, ALL_REGULATION_IDS } from '../../hooks/useDamageCalc';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseDatabaseReturn } from '../../hooks/useDatabase';
import type { UseSavedPokemonReturn } from '../../hooks/useSavedPokemon';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../../hooks/useSettings';
import { getRegulationLabel, toRegulationId } from '../../utils/pokemonRules';
import CalcPokemonPanel from './CalcPokemonPanel';
import CalcMoveGrid from './CalcMoveGrid';
import CalcFieldPanel from './CalcFieldPanel';
import CalcResultPanel from './CalcResultPanel';
import CalcSavedSetsModal from './CalcSavedSetsModal';

interface CalcPageProps {
  gameDataState: UseGameDataReturn;
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  savedPokemonState: UseSavedPokemonReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
  /** Set once by a Battle Log opponent tile's "Calc" trigger (Regular Calc Battle Log Integration Leg 1) - applied to pokemon2 by the effect below, then cleared via onPrefillApplied so it doesn't reapply on unrelated re-renders. Undefined/null outside that flow (e.g. the plain floating launcher). */
  pendingPrefill?: { species: string } | null;
  onPrefillApplied?: () => void;
}

export default function CalcPage({
  gameDataState, teamsState, databaseState, savedPokemonState, spriteCacheState, settingsState,
  pendingPrefill, onPrefillApplied,
}: CalcPageProps) {
  const [isSavedSetsOpen, setIsSavedSetsOpen] = useState(false);
  // Computed inside each side's CalcPokemonPanel (that's where the fetched
  // ChampionsUsageEntry lives) and lifted up here purely to reach the move
  // grids above, which CalcPage renders as CalcPokemonPanel's siblings, not
  // its children - see CalcPokemonPanel.tsx's header comment.
  const [pokemon1MovePercentByName, setPokemon1MovePercentByName] = useState<Record<string, number>>({});
  const [pokemon2MovePercentByName, setPokemon2MovePercentByName] = useState<Record<string, number>>({});
  const calcState = useDamageCalc(gameDataState, toRegulationId(settingsState.settings.defaultRegulation));
  const {
    regulationId, setRegulationId,
    pokemon1, pokemon2, setPokemon1, setPokemon2, setPokemon1Move, setPokemon2Move,
    field, setField, setPokemon1Side, setPokemon2Side,
    speciesOptions, pokemon1MoveOptions, pokemon2MoveOptions, itemOptions, abilityOptions, natureOptions,
    pokemon1Formes, pokemon2Formes, pokemon1BaseStats, pokemon2BaseStats,
    pokemon1BoostedStats, pokemon2BoostedStats,
    pokemon1NatureEffect, pokemon2NatureEffect, pokemon1Speed, pokemon2Speed,
    p1Results, p2Results, selectedResult, setSelectedResult, selectedEntry,
  } = calcState;

  // One-shot prefill from a Battle Log opponent tile - fires once per
  // distinct pendingPrefill (a fresh object each trigger, see App.tsx's
  // openCalcPopup), then clears it immediately so it doesn't reapply on
  // this popup's later, unrelated re-renders.
  useEffect(() => {
    if (!pendingPrefill) return;
    setPokemon2({ species: pendingPrefill.species });
    onPrefillApplied?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrefill]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setIsSavedSetsOpen(true)}
          className="px-3 py-1 text-xs font-bold uppercase tracking-wide rounded transition-colors cursor-pointer bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
        >
          Saved Sets
        </button>
        {ALL_REGULATION_IDS.map(id => (
          <button
            key={id}
            onClick={() => setRegulationId(id)}
            className={`px-3 py-1 text-xs font-bold uppercase tracking-wide rounded transition-colors cursor-pointer ${
              regulationId === id ? 'bg-accent-gold text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {getRegulationLabel(id)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <CalcMoveGrid
          title="Pokémon 1's Moves"
          moves={pokemon1.moves}
          results={p1Results}
          moveOptions={pokemon1MoveOptions}
          selectedIndex={selectedResult?.side === 'p1' ? selectedResult.index : null}
          onChangeMove={setPokemon1Move}
          onSelect={(index) => setSelectedResult({ side: 'p1', index })}
          usagePercentByName={pokemon1MovePercentByName}
        />
        <CalcMoveGrid
          title="Pokémon 2's Moves"
          moves={pokemon2.moves}
          results={p2Results}
          moveOptions={pokemon2MoveOptions}
          selectedIndex={selectedResult?.side === 'p2' ? selectedResult.index : null}
          onChangeMove={setPokemon2Move}
          onSelect={(index) => setSelectedResult({ side: 'p2', index })}
          usagePercentByName={pokemon2MovePercentByName}
        />
      </div>

      <CalcResultPanel entry={selectedEntry} />

      <div className="flex flex-wrap gap-3">
        <CalcPokemonPanel
          title="Pokémon 1"
          state={pokemon1}
          speciesOptions={speciesOptions}
          itemOptions={itemOptions}
          abilityOptions={abilityOptions}
          natureOptions={natureOptions}
          moveOptions={pokemon1MoveOptions}
          formes={pokemon1Formes}
          baseStats={pokemon1BaseStats}
          boostedStats={pokemon1BoostedStats}
          natureEffect={pokemon1NatureEffect}
          teams={teamsState.teams}
          savedPokemonState={savedPokemonState}
          gameDataState={gameDataState}
          databaseState={databaseState}
          resolveSprite={spriteCacheState.resolveSprite}
          onChange={setPokemon1}
          onMoveUsageChange={setPokemon1MovePercentByName}
        />
        <CalcFieldPanel
          field={field}
          onChangeField={setField}
          onChangePokemon1Side={setPokemon1Side}
          onChangePokemon2Side={setPokemon2Side}
          pokemon1Ability={pokemon1.ability}
          pokemon2Ability={pokemon2.ability}
          pokemon1Speed={pokemon1Speed}
          pokemon2Speed={pokemon2Speed}
        />
        <CalcPokemonPanel
          title="Pokémon 2"
          state={pokemon2}
          speciesOptions={speciesOptions}
          itemOptions={itemOptions}
          abilityOptions={abilityOptions}
          natureOptions={natureOptions}
          moveOptions={pokemon2MoveOptions}
          formes={pokemon2Formes}
          baseStats={pokemon2BaseStats}
          boostedStats={pokemon2BoostedStats}
          natureEffect={pokemon2NatureEffect}
          teams={teamsState.teams}
          savedPokemonState={savedPokemonState}
          gameDataState={gameDataState}
          databaseState={databaseState}
          resolveSprite={spriteCacheState.resolveSprite}
          onChange={setPokemon2}
          onMoveUsageChange={setPokemon2MovePercentByName}
        />
      </div>

      <p className="text-center text-[10px] text-zinc-600">Powered by @smogon/calc</p>

      <AnimatePresence>
        {isSavedSetsOpen && (
          <CalcSavedSetsModal
            onClose={() => setIsSavedSetsOpen(false)}
            databaseState={databaseState}
            savedPokemonState={savedPokemonState}
            resolveSprite={spriteCacheState.resolveSprite}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
