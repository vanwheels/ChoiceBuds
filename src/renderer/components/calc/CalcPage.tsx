/**
 * CalcPage.tsx - Champions Damage Calculator Tab
 * Layout matches the real calc.pokemonshowdown.com Champions mode: two
 * move grids (one per Pokémon) up top, a shared result detail panel below
 * them, then a 3-column row (Pokémon 1 | Field | Pokémon 2). Not yet wired
 * into the teams database - see useDamageCalc.ts.
 */

import type { UseDamageCalcReturn } from '../../hooks/useDamageCalc';
import { ALL_REGULATION_IDS } from '../../hooks/useDamageCalc';
import { getRegulationLabel } from '../../utils/pokemonRules';
import CalcPokemonPanel from './CalcPokemonPanel';
import CalcMoveGrid from './CalcMoveGrid';
import CalcFieldPanel from './CalcFieldPanel';
import CalcResultPanel from './CalcResultPanel';

interface CalcPageProps {
  calcState: UseDamageCalcReturn;
}

export default function CalcPage({ calcState }: CalcPageProps) {
  const {
    regulationId, setRegulationId,
    pokemon1, pokemon2, setPokemon1, setPokemon2, setPokemon1Move, setPokemon2Move,
    field, setField, setPokemon1Side, setPokemon2Side,
    speciesOptions, pokemon1MoveOptions, pokemon2MoveOptions, itemOptions, abilityOptions, natureOptions,
    pokemon1Formes, pokemon2Formes,
    p1Results, p2Results, selectedResult, setSelectedResult, selectedEntry,
  } = calcState;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">Damage Calculator</h1>
          <p className="text-sm text-gray-400 mt-1">Champions · powered by @smogon/calc</p>
        </div>
        <div className="flex gap-2">
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
      </div>

      <div className="flex flex-wrap gap-4">
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

      <div className="flex flex-wrap gap-4">
        <CalcPokemonPanel
          title="Pokémon 1"
          state={pokemon1}
          speciesOptions={speciesOptions}
          itemOptions={itemOptions}
          abilityOptions={abilityOptions}
          natureOptions={natureOptions}
          formes={pokemon1Formes}
          onChange={setPokemon1}
        />
        <CalcFieldPanel
          field={field}
          onChangeField={setField}
          onChangePokemon1Side={setPokemon1Side}
          onChangePokemon2Side={setPokemon2Side}
        />
        <CalcPokemonPanel
          title="Pokémon 2"
          state={pokemon2}
          speciesOptions={speciesOptions}
          itemOptions={itemOptions}
          abilityOptions={abilityOptions}
          natureOptions={natureOptions}
          formes={pokemon2Formes}
          onChange={setPokemon2}
        />
      </div>
    </div>
  );
}
