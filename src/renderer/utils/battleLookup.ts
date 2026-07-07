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

/**
 * Whether a switch-in ability effect (see config/onSwitchInAbilities.ts)
 * has already been applied for a Pokemon's current stint on the field -
 * looks for a note referencing the ability anywhere since its most recent
 * switch-phase action (not just the current turn, since the effect only
 * triggers once per switch-in, however many turns it's stayed active
 * since). If it's never explicitly logged switching in (e.g. active from
 * before logging started), defaults to "not yet applied" so the chip
 * stays available rather than silently hiding.
 */
export function hasAppliedAbilityEffectSinceSwitchIn(battle: Battle, pokemonId: string, ability: string): boolean {
  const allActions = battle.turns.flatMap(t => t.actions);
  let lastSwitchInIndex = -1;
  allActions.forEach((a, i) => { if (a.pokemonId === pokemonId && a.phase === 'switch') lastSwitchInIndex = i; });
  if (lastSwitchInIndex === -1) return false;
  const lowerAbility = ability.toLowerCase();
  return allActions.slice(lastSwitchInIndex + 1).some(a => a.pokemonId === pokemonId && a.note?.toLowerCase().includes(lowerAbility));
}

const STAT_DECREASE_NOTE = /^(Atk|Def|SpA|SpD|Spe) -\d/;

/**
 * Whether a reactive stat-raise ability (Defiant/Competitive - see
 * config/reactiveAbilities.ts) still has an unacknowledged trigger -
 * finds the most recent stat-decrease note logged for this pokemonId
 * (adjustStatStage/applyAbilityEffect both produce notes matching
 * STAT_DECREASE_NOTE) and checks whether a note referencing the reactive
 * ability has been logged for them since. Scoped to "since the last
 * lowering", not "since switch-in" - unlike a switch-in effect, Defiant
 * can legitimately re-trigger multiple times during one stint on the
 * field (once per new lowering), so switch-in-scoping would hide it after
 * the first trigger even though a later, separate lowering deserves its
 * own chip.
 */
export function hasUnappliedReactiveLowerEffect(battle: Battle, pokemonId: string, ability: string): boolean {
  const allActions = battle.turns.flatMap(t => t.actions);
  let lastDecreaseIndex = -1;
  allActions.forEach((a, i) => { if (a.pokemonId === pokemonId && a.note && STAT_DECREASE_NOTE.test(a.note)) lastDecreaseIndex = i; });
  if (lastDecreaseIndex === -1) return false;
  const lowerAbility = ability.toLowerCase();
  return !allActions.slice(lastDecreaseIndex + 1).some(a => a.pokemonId === pokemonId && a.note?.toLowerCase().includes(lowerAbility));
}
