/**
 * Pure toggle logic for Battle.megaEvolvedIds (see types/battle.ts) - split
 * out of RecordMatchForm.tsx so the real VGC rule it encodes (at most one
 * Mega Evolution per side per battle) is unit-testable without React. Marks
 * `pokemonId` Mega Evolved, clearing any other id already marked on the
 * same side (`sideRosterIds`) first; re-clicking an already-marked id
 * unmarks it instead.
 */
export function toggleMegaEvolvedIds(
  prev: string[],
  pokemonId: string,
  sideRosterIds: string[],
): string[] {
  if (prev.includes(pokemonId)) return prev.filter((id) => id !== pokemonId);
  const sideIds = new Set(sideRosterIds);
  return [...prev.filter((id) => !sideIds.has(id)), pokemonId];
}
