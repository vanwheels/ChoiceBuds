/**
 * Champions Movepool Changes
 * Champions has given some species moves they can't learn in mainline
 * Scarlet/Violet (our only PokeAPI-sourced learnset source), and taken
 * others away. Sourced from a Reddit thread on v1.1 movepool changes
 * (screenshots provided directly by the user, since automated fetching of
 * reddit.com is blocked): r/stunfisk "Some movepool changes in Champions
 * Version 1.1".
 *
 * That thread also listed several "Relearns X" entries per species (e.g.
 * "Sceptile relearns Cross Poison") - those are deliberately NOT encoded
 * here. PokeAPI's per-species moves list already includes every learn
 * method (level-up/machine/tutor/egg/etc.) as one combined list, so a move
 * legitimately learnable via any mainline method - just gated behind the
 * in-game Move Reminder there - should already be present in our
 * `fetchSpeciesLearnset` results without needing an override. Only "(now)
 * learns X" (a move that isn't native to that species in mainline at all)
 * and "loses X" need encoding here.
 *
 * One entry from that thread was NOT included: Grimmsnarl "loses False
 * Surrender" - not a recognized Pokemon move in any known game, could be a
 * post error or an unfamiliar Champions-exclusive move. Left out rather
 * than encoding an unverified/possibly-fake move name; Grimmsnarl losing
 * Thunder Wave (the other half of that thread entry) is included since
 * that's a real, recognized move.
 *
 * The two balance nerfs also mentioned in that thread (Annihilape's "Rage
 * Punch" - almost certainly Rage Fist - and Gholdengo's Make It Rain) are
 * move-stat changes, not movepool changes - already covered in
 * championsMoveOverrides.ts, not duplicated here.
 *
 * INCOMPLETE - this is one thread's account of one patch (v1.1). No
 * comprehensive source exists yet; the community spreadsheet lead noted in
 * TODO.md remains unprocessed (full movepools, not a diff - would need
 * manual cross-referencing against PokeAPI's mainline data per species).
 * Applied at the read boundary in useGameData.ts's getSpeciesLearnset/
 * getCachedSpeciesLearnset, keyed by the same normalized species slug
 * normalizeSpeciesForAPI already produces.
 */

export const CHAMPIONS_MOVEPOOL_ADDITIONS: Record<string, string[]> = {
  'swampert': ['wave-crash'],
  'sceptile': ['earth-power'],
  'scolipede': ['leech-life', 'pounce', 'trailblazer'],
  'pyroar': ['scorching-sands'],
  'barbaracle': ['aqua-cutter', 'chilling-water'],
};

export const CHAMPIONS_MOVEPOOL_REMOVALS: Record<string, string[]> = {
  'scolipede': ['mortal-spin'],
  'annihilape': ['final-gambit'],
  'grimmsnarl': ['thunder-wave'],
  'scrafty': ['parting-shot'],
  'overqwil': ['mortal-spin'],
  'metagross': ['heavy-slam', 'knock-off'],
  'pyroar': ['earth-power'],
  'staraptor': ['knock-off'],
  'mawile': ['focus-punch', 'dazzling-gleam'],
  'malamar': ['octolock'],
};

export function applyChampionsMovepoolChanges(speciesSlug: string, moves: string[]): string[] {
  const additions = CHAMPIONS_MOVEPOOL_ADDITIONS[speciesSlug];
  const removals = CHAMPIONS_MOVEPOOL_REMOVALS[speciesSlug];
  if (!additions && !removals) return moves;

  const merged = new Set(moves);
  additions?.forEach(move => merged.add(move));
  removals?.forEach(move => merged.delete(move));
  return [...merged];
}
