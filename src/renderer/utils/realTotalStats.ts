/**
 * realTotalStats.ts - Lazy @smogon/calc bridge for StatsColumn's "Real Total"
 * display mode (Base + SP + Nature at Lv50, max IVs, no stage boost - Team
 * Builder has no battle stage-boost concept - see TODO.md's Team Builder
 * Stat Display: SP / Base / Real Total Toggle entry).
 *
 * Split into its own module rather than importing @smogon/calc directly in
 * StatsColumn.tsx, so the heavy runtime `Pokemon` class only enters the
 * bundle via a dynamic `import()` fired the first time a card is flipped to
 * this display mode - mirrors services/teamSheetPdf.ts's own lazy-load shape
 * (TeamSheetPdfModal.tsx dynamically imports that whole service on click
 * rather than statically importing @smogon/calc into a component that
 * always renders). `rawStats` is the same base+nature+EVs math
 * useDamageCalc.ts and teamSheetPdf.ts's own computeRealStats already rely
 * on, via the same SP->EV conversion (utils/championsStats.ts).
 */
import { Generations, Pokemon } from '@smogon/calc';
import type { NatureName, StatsTable } from '@smogon/calc/dist/data/interface';
import type { EVSpread, PokemonStats } from '../types/pokemon';
import { MAX_IVS, spsToEvs, resolveCalcSpecies } from './championsStats';

const GEN_NUM = 9;

interface RealTotalInputs {
  level: number;
  gender?: 'M' | 'F' | 'N' | '';
  nature?: string;
  evs: EVSpread;
}

function evSpreadToStatsTable(evs: EVSpread): StatsTable {
  return {
    hp: evs.hp, atk: evs.attack, def: evs.defense,
    spa: evs.specialAttack, spd: evs.specialDefense, spe: evs.speed,
  };
}

/**
 * Real computed stats (base + Nature + Stat Points, level 50, max IVs, no
 * in-battle stage boost) for one Pokémon's current showdownData. Returns
 * null if @smogon/calc doesn't recognize the species/nature - the caller
 * renders that as unavailable rather than a stale/wrong number.
 */
export function computeRealTotalStats(species: string, inputs: RealTotalInputs): PokemonStats | null {
  try {
    const gen = Generations.get(GEN_NUM);
    const calcPokemon = new Pokemon(gen, resolveCalcSpecies(species), {
      level: inputs.level || 50,
      gender: inputs.gender === 'M' || inputs.gender === 'F' || inputs.gender === 'N' ? inputs.gender : undefined,
      nature: (inputs.nature || 'Hardy') as NatureName,
      evs: spsToEvs(evSpreadToStatsTable(inputs.evs)),
      ivs: MAX_IVS,
    });
    const raw = calcPokemon.rawStats;
    return {
      hp: raw.hp, attack: raw.atk, defense: raw.def,
      specialAttack: raw.spa, specialDefense: raw.spd, speed: raw.spe,
    };
  } catch {
    return null;
  }
}
