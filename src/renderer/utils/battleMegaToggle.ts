/**
 * Pure toggle logic for Battle.megaEvolvedIds (see types/battle.ts) - split
 * out of RecordMatchForm.tsx so the real VGC rule it encodes (at most one
 * Mega Evolution per side per battle) is unit-testable without React.
 */

/**
 * Force-marks `pokemonId` Mega Evolved, clearing any other id already
 * marked on the same side (`sideRosterIds`) first. Idempotent if
 * `pokemonId` is already the side's mark - used by the Battle Logger's
 * opponent X/Y/Z picker to switch an already-marked Pokemon to a different
 * Mega form (same id, newly revealed item), where a plain toggle would just
 * unmark it instead of reassigning the form.
 */
export function setMegaEvolvedForSide(
  prev: string[],
  pokemonId: string,
  sideRosterIds: string[],
): string[] {
  const sideIds = new Set(sideRosterIds);
  return [...prev.filter((id) => !sideIds.has(id)), pokemonId];
}

/**
 * Marks `pokemonId` Mega Evolved, clearing any other id already marked on
 * the same side (`sideRosterIds`) first; re-clicking an already-marked id
 * unmarks it instead.
 */
export function toggleMegaEvolvedIds(
  prev: string[],
  pokemonId: string,
  sideRosterIds: string[],
): string[] {
  if (prev.includes(pokemonId)) return prev.filter((id) => id !== pokemonId);
  return setMegaEvolvedForSide(prev, pokemonId, sideRosterIds);
}
