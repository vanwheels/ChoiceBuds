/**
 * Switch-Out Moves (Battle Logger)
 * These are the one exception to "using a move consumes the slot's action
 * for the turn, same as switching does" - using one of these IS the move
 * action, but it's immediately followed by picking who comes in, and (like
 * Protect) it can fail rather than actually swap - see
 * utils/battleLookup.ts's canSwitchOutThisTurn and TurnLog.tsx's Failed
 * chip.
 */

export const SWITCH_OUT_MOVES: string[] = [
  'u-turn', 'volt-switch', 'flip-turn', 'parting-shot',
  'baton-pass', 'chilly-reception', 'shed-tail', 'teleport',
];

export function isSwitchOutMove(move: string | undefined): boolean {
  if (!move) return false;
  return SWITCH_OUT_MOVES.includes(move.toLowerCase().trim().replace(/\s+/g, '-'));
}
