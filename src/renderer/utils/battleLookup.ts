/**
 * Shared lookups for resolving a BattleAction's side+pokemonId back to a
 * displayable Pokemon - used by TurnLog and the field panels so both
 * resolve actors/targets identically.
 */

import type { Battle, BattleAction, BattleSide, BroughtPokemonSnapshot, OpponentPokemonEntry } from '../types/pokemon';
import { isProtectFamilyMove } from '../config/protectMoves';
import { isSwitchOutMove } from '../config/switchOutMoves';
import { getEffectivenessMultiplier } from '../config/typeEffectiveness';

/** Drops the `null` (empty-slot) entries from a fixed 2-slot active-id tuple - for call sites that just need "who's currently active", not slot position. */
export function compactActiveIds(ids: (string | null)[]): string[] {
  return ids.filter((id): id is string => id != null);
}

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

/**
 * Each active slot gets exactly one action per turn - a move OR a switch,
 * never both, never twice (a freshly-switched-in Pokemon can't also move
 * or switch again the same turn). Mega Evolving is folded into "acted"
 * too (a 'mega' phase action alone doesn't block this - the mon still
 * needs its move - but see canSwitchOutThisTurn for why it blocks
 * switching). Only looks at the current (last) turn.
 *
 * Turn 1 is an exception: the initial send-in of a battle's leads isn't a
 * choice made instead of moving (unlike a genuine mid-battle switch), so a
 * 'switch' phase action doesn't block acting while `turns.length === 1`.
 */
export function canActThisTurn(battle: Battle, pokemonId: string): boolean {
  const lastTurn = battle.turns[battle.turns.length - 1];
  if (!lastTurn) return true;
  const isInitialSendIn = lastTurn.number === 1;
  return !lastTurn.actions.some(a => a.pokemonId === pokemonId
    && (a.phase === 'move' || (a.phase === 'switch' && !isInitialSendIn)));
}

/**
 * Whether this Pokemon can still switch out this turn. False once they've
 * switched in or Mega Evolved this turn (an incoming switch, or a
 * committed Mega, IS the slot's action) - except turn 1's initial send-in,
 * same exception as canActThisTurn. If they've used a move, only true
 * when that move is a switch-out move (U-turn/Parting Shot/etc. - see
 * config/switchOutMoves.ts) and it didn't fail - the switch is a
 * continuation of that same action, not a second one.
 */
export function canSwitchOutThisTurn(battle: Battle, pokemonId: string): boolean {
  const lastTurn = battle.turns[battle.turns.length - 1];
  if (!lastTurn) return true;
  const isInitialSendIn = lastTurn.number === 1;
  const actions = lastTurn.actions.filter(a => a.pokemonId === pokemonId);
  if (actions.some(a => (a.phase === 'switch' && !isInitialSendIn) || a.phase === 'mega')) return false;
  const moveAction = actions.find(a => a.phase === 'move');
  if (!moveAction) return true;
  return isSwitchOutMove(moveAction.move) && !moveAction.failed;
}

/**
 * Type-effectiveness multiplier for a move against each target, looked up
 * via each target's real types (getEffectivenessMultiplier handles dual
 * typing). Used to attach BattleAction.effectiveness at log time - see
 * Battlefield.tsx.
 */
export function computeMoveEffectiveness(
  battle: Battle,
  moveType: string,
  targets: { side: BattleSide; pokemonId: string }[]
): { pokemonId: string; multiplier: number }[] {
  return targets.map(t => {
    const mon = findBattlePokemon(battle, t.side, t.pokemonId);
    return { pokemonId: t.pokemonId, multiplier: mon ? getEffectivenessMultiplier(moveType, mon.types) : 1 };
  });
}

/**
 * How many active slots a side must currently be filling - 2 unless
 * fewer than 2 of their brought Pokemon are still alive. For the
 * opponent this is a best-effort proxy off only what's been revealed
 * (opponentRoster), since we don't know their full bring-4 up front.
 */
export function requiredActiveCount(battle: Battle, side: BattleSide): number {
  const aliveCount = side === 'player'
    ? battle.broughtIds.filter(id => !battle.playerFaintedIds.includes(id)).length
    : battle.opponentRoster.filter(o => !o.fainted).length;
  return Math.min(2, aliveCount);
}
