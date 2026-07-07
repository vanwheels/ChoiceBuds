/**
 * Shared lookups for resolving a BattleAction's side+pokemonId back to a
 * displayable Pokemon - used by TurnLog, ActionEntryBar, and the field
 * panels so all three resolve actors/targets identically.
 */

import type { Battle, BattleSide, BroughtPokemonSnapshot, OpponentPokemonEntry } from '../types/pokemon';

export function findBattlePokemon(
  battle: Battle,
  side: BattleSide,
  pokemonId: string
): BroughtPokemonSnapshot | OpponentPokemonEntry | undefined {
  return side === 'player'
    ? battle.playerRoster.find(p => p.id === pokemonId)
    : battle.opponentRoster.find(p => p.id === pokemonId);
}

export function battlePokemonDisplayName(battle: Battle, side: BattleSide, pokemonId: string): string {
  const p = findBattlePokemon(battle, side, pokemonId);
  if (!p) return 'Unknown';
  if ('nickname' in p && p.nickname) return p.nickname;
  return p.species;
}
