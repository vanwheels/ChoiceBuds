/**
 * calcExport.ts - Calc Sandbox Pokemon -> ShowdownPokemon
 * Inverse of calcTeamImport.ts::teamPokemonToCalcUpdates - builds the raw
 * Showdown-format shape from a CalcPokemonState so it can be enriched via
 * services/pokeapi.ts::enrichPokemonWithAPI (to save into
 * useSavedPokemon.ts's store) or formatted via services/parser.ts::
 * formatShowdownText (for a plain-text export). `sps` copies directly into
 * `evs` with no /4 or *4 conversion - see calcTeamImport.ts's own note on
 * why this app's ShowdownPokemon.evs field is SP-native, not real 0-252 EVs.
 */

import type { ShowdownPokemon } from '../types/pokemon';
import type { CalcPokemonState } from '../hooks/useDamageCalc';

export function calcStateToShowdownPokemon(state: CalcPokemonState): ShowdownPokemon {
  return {
    species: state.species,
    gender: state.gender || undefined,
    item: state.item || undefined,
    ability: state.ability || undefined,
    level: state.level,
    shiny: false,
    gigantamax: false,
    happiness: 255,
    nature: state.nature,
    evs: {
      hp: state.sps.hp,
      attack: state.sps.atk,
      defense: state.sps.def,
      specialAttack: state.sps.spa,
      specialDefense: state.sps.spd,
      speed: state.sps.spe,
    },
    moves: state.moves.map(m => m.name).filter(Boolean),
  };
}
