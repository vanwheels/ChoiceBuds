/**
 * Shared lookups for resolving a BattleAction's side+pokemonId back to a
 * displayable Pokemon - used by TurnLog and the field panels so both
 * resolve actors/targets identically.
 */

import type { Battle, BattleAction, BattleSide, BroughtPokemonSnapshot, OpponentPokemonEntry } from '../types/pokemon';
import { isProtectFamilyMove } from '../config/protectMoves';

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

/**
 * Protect-family moves share one consecutive-use fail counter in the real
 * game - a repeat use (the same Pokemon's action in the immediately
 * preceding turn was also a non-failed protect-family move) is when the
 * "Failed?" chip in TurnLog should actually show; a first use never fails
 * from the counter, so no chip is shown then.
 */
export function isRepeatProtectUse(battle: Battle, turnNumber: number, action: BattleAction): boolean {
  if (!isProtectFamilyMove(action.move)) return false;
  const prevTurn = battle.turns.find(t => t.number === turnNumber - 1);
  if (!prevTurn) return false;
  return prevTurn.actions.some(a => a.pokemonId === action.pokemonId && isProtectFamilyMove(a.move) && !a.failed);
}
