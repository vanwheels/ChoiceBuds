/**
 * calcTeamImport.ts - Load a Saved Team's Pokemon Into the Calc Sandbox
 * Pure mapping from the Teams tab's own data shape (ImportedPokemonInfo/
 * ShowdownPokemon) to the Calc tab's CalcPokemonState - powers the "Load
 * from Team" tray on CalcPokemonPanel.tsx (see TODO.md's Kaizo-inspired
 * team-dropdown item). Species/item/ability/move names are copied as-is
 * (no fuzzy resolution against @smogon/calc's own name list) - Showdown
 * export text already uses the same canonical English names @smogon/calc
 * expects, and a rare mismatch just surfaces as a normal per-move error in
 * the result panel (the same graceful failure any hand-typed freeform name
 * already gets), not a crash.
 *
 * `evs` on ShowdownPokemon is misleadingly named - the Team Builder already
 * enforces the same 0-32-per-stat/66-total Stat Point caps Champions uses
 * (see StatsColumn.tsx), so these copy directly into CalcPokemonState.sps
 * with no /4 or *4 conversion, unlike spsToEvs in useDamageCalc.ts (which
 * converts SP into @smogon/calc's own traditional-EV internals).
 */

import type { NatureName, StatsTable } from '@smogon/calc/dist/data/interface';
import type { ImportedPokemonInfo } from '../types/pokemon';
import type { CalcPokemonState, CalcMoveSlot } from '../hooks/useDamageCalc';

const ZERO_STATS: StatsTable = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const MOVE_SLOT_COUNT = 4;

export function teamPokemonToCalcUpdates(p: ImportedPokemonInfo): Partial<CalcPokemonState> {
  const sd = p.showdownData;
  const moves: CalcMoveSlot[] = Array.from({ length: MOVE_SLOT_COUNT }, (_, i) => ({
    name: sd.moves[i] || '',
    isCrit: false,
  }));

  return {
    species: sd.species,
    gender: sd.gender === 'M' || sd.gender === 'F' || sd.gender === 'N' ? sd.gender : '',
    level: sd.level || 50,
    item: sd.item || '',
    ability: sd.ability || '',
    nature: (sd.nature || 'Hardy') as NatureName,
    status: '',
    sps: {
      hp: sd.evs.hp, atk: sd.evs.attack, def: sd.evs.defense,
      spa: sd.evs.specialAttack, spd: sd.evs.specialDefense, spe: sd.evs.speed,
    },
    boosts: { ...ZERO_STATS },
    moves,
  };
}
