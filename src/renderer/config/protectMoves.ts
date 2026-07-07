/**
 * Protect-Family Moves (Battle Logger)
 * All of these share one consecutive-use fail counter in the real game -
 * using any one of them after another protect-family move (that didn't
 * fail) the turn before sharply raises the odds of failure. TurnLog uses
 * this to decide when to surface the "Failed?" chip (only on a repeat use,
 * never on a first use - see utils/battleLookup.ts's isRepeatProtectUse).
 */

export const PROTECT_FAMILY_MOVES: string[] = [
  'protect', 'detect', 'kings-shield', 'spiky-shield', 'baneful-bunker',
  'obstruct', 'silk-trap', 'burning-bulwark', 'wide-guard', 'quick-guard',
  'crafty-shield', 'mat-block',
];

export function isProtectFamilyMove(move: string | undefined): boolean {
  if (!move) return false;
  return PROTECT_FAMILY_MOVES.includes(move.toLowerCase().trim().replace(/\s+/g, '-'));
}
