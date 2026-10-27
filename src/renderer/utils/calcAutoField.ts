/**
 * Calc auto weather/terrain: decides what a species/ability change should do
 * to the shared field. Pure so the doubles speed-order rule is unit-testable
 * without React; useDamageCalc applies the result as a one-shot write, which
 * is what lets a manual chip click override it until the next species/ability
 * change.
 */

import type { GameType, Weather, Terrain } from '@smogon/calc/dist/data/interface';
import { getFieldSettingEffect } from '../config/fieldSettingAbilities';

export interface AutoFieldInput {
  /** The side whose species/ability just changed. */
  changedSide: 'p1' | 'p2';
  p1Ability: string;
  p2Ability: string;
  /** Speed with no field applied: weather-dependent speed abilities would otherwise make the order depend on the very weather being decided. */
  p1Speed: number | null;
  p2Speed: number | null;
  gameType: GameType;
}

export interface AutoFieldUpdates {
  weather?: Weather;
  terrain?: Terrain;
}

/**
 * Only keys a setter actually claims are returned - a changed Pokemon with no
 * setter never clears the field. Doubles: when both sides set the same kind
 * of condition, the slower one wins (it enters last); a tie, and all of
 * Singles, go to the side that just changed.
 */
export function resolveAutoField(input: AutoFieldInput): AutoFieldUpdates {
  const { changedSide, gameType } = input;
  const other = changedSide === 'p1' ? 'p2' : 'p1';
  const abilityOf = (side: 'p1' | 'p2') => (side === 'p1' ? input.p1Ability : input.p2Ability);
  const speedOf = (side: 'p1' | 'p2') => (side === 'p1' ? input.p1Speed : input.p2Speed);

  const changedEffect = getFieldSettingEffect(abilityOf(changedSide));
  const otherEffect = getFieldSettingEffect(abilityOf(other));

  const updates: AutoFieldUpdates = {};
  for (const kind of ['weather', 'terrain'] as const) {
    const mine = changedEffect?.kind === kind ? changedEffect : null;
    const theirs = otherEffect?.kind === kind ? otherEffect : null;
    const winner = pickWinner(mine, theirs, gameType, speedOf(changedSide), speedOf(other));
    if (!winner) continue;
    if (winner.kind === 'weather') updates.weather = winner.weather;
    else updates.terrain = winner.terrain;
  }
  return updates;
}

function pickWinner<T>(
  mine: T | null,
  theirs: T | null,
  gameType: GameType,
  mySpeed: number | null,
  theirSpeed: number | null,
): T | null {
  if (!mine || !theirs) return mine;
  if (gameType === 'Doubles' && mySpeed !== null && theirSpeed !== null && theirSpeed < mySpeed) {
    return theirs;
  }
  return mine;
}
