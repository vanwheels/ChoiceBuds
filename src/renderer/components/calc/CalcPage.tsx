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

import { useDamageCalc, ALL_REGULATION_IDS } from '../../hooks/useDamageCalc';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import { getRegulationLabel } from '../../utils/pokemonRules';
import CalcPokemonPanel from './CalcPokemonPanel';
import CalcMoveGrid from './CalcMoveGrid';
import CalcFieldPanel from './CalcFieldPanel';
import CalcResultPanel from './CalcResultPanel';

interface CalcPageProps {
  gameDataState: UseGameDataReturn;
  teamsState: UseTeamsReturn;
  spriteCacheState: UseSpriteCacheReturn;
}

export default function CalcPage({ gameDataState, teamsState, spriteCacheState }: CalcPageProps) {
  const calcState = useDamageCalc(gameDataState);
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end gap-2">
        {ALL_REGULATION_IDS.map(id => (
          <button
            key={id}
            onClick={() => setRegulationId(id)}
            className={`px-3 py-1 text-xs font-bold uppercase tracking-wide rounded transition-colors cursor-pointer ${
              regulationId === id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
        />
        <CalcMoveGrid
          title="Pokémon 2's Moves"
          moves={pokemon2.moves}
          results={p2Results}
          moveOptions={pokemon2MoveOptions}
          selectedIndex={selectedResult?.side === 'p2' ? selectedResult.index : null}
          onChangeMove={setPokemon2Move}
          onSelect={(index) => setSelectedResult({ side: 'p2', index })}
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
          formes={pokemon1Formes}
          baseStats={pokemon1BaseStats}
          boostedStats={pokemon1BoostedStats}
          natureEffect={pokemon1NatureEffect}
          teams={teamsState.teams}
          resolveSprite={spriteCacheState.resolveSprite}
          onChange={setPokemon1}
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
          formes={pokemon2Formes}
          baseStats={pokemon2BaseStats}
          boostedStats={pokemon2BoostedStats}
          natureEffect={pokemon2NatureEffect}
          teams={teamsState.teams}
          resolveSprite={spriteCacheState.resolveSprite}
          onChange={setPokemon2}
        />
      </div>

      <p className="text-center text-[10px] text-gray-600">Powered by @smogon/calc</p>
    </div>
  );
}
