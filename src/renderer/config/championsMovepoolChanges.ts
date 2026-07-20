/**
 * Champions Movepool Changes
 * Champions has given some species moves they can't learn in mainline
 * Scarlet/Violet (our only PokeAPI-sourced learnset source), and taken
 * others away.
 *
 * Sourced from the "Pokémon Ch." tab of the "Data Comparative Champions"
 * spreadsheet by RoiDadadou (see championsMoveOverrides.ts for full source
 * citation/credits) - fetched directly (not screenshots) via its CSV export
 * endpoint (`gviz/tq?tqx=out:csv&sheet=...`) and parsed programmatically,
 * 2026-07-07.
 *
 * SCOPE NARROWED 2026-07-19: PokeAPI added a real "champions" version group
 * (see `pokeapiService.ts::fetchSpeciesLearnset`) whose per-species move
 * tagging is now the trusted source wherever it's actually available -
 * `useGameData.ts` only applies this file's corrections when
 * `SpeciesLearnsetEntry.hasChampionsMoveData` is false, i.e. PokeAPI has
 * zero "champions"-tagged moves for that species yet. A live audit that day
 * (queried PokeAPI directly for all 231 legal species/varieties, see
 * TODO.md for the full trail) found PokeAPI's own tag is more reliable than
 * this spreadsheet where both exist - e.g. it correctly includes Thief for
 * Sharpedo (confirmed in-game by the user), while this file previously had
 * Thief listed as removed for Sharpedo, incorrectly. Applying both
 * unconditionally was actively introducing errors on species PokeAPI
 * already had right, so this file was pruned down to *only* the species
 * that live audit found PokeAPI hasn't back-filled "champions" move data
 * for at all: the 22 species Regulation M-B added, plus Floette. This
 * table needs re-auditing (or can likely be deleted outright) once PokeAPI
 * back-fills those too - re-run the same live coverage check
 * (`pokemon-species`/`pokemon` `champions`-tagged `version_group_details`)
 * against these species to check.
 *
 * The rest of the original spreadsheet-derived table (~185 other species)
 * was dropped, not just left unused - keeping unreachable entries around
 * would just be a trap for a future edit to accidentally wire back up.
 *
 * The user has separately flagged this spreadsheet's overall reliability
 * as mixed (see TODO.md) - even restricted to this file's current scope
 * (species PokeAPI hasn't covered yet), it's still a single unverified
 * community source. Re-check against Serebii/Bulbapedia/in-game
 * observation when in doubt about a specific entry - the Sharpedo/Thief
 * mistake above is proof this source does contain real errors.
 *
 * Applied at the read boundary in useGameData.ts's getSpeciesLearnset/
 * getCachedSpeciesLearnset, keyed by the same normalized species slug
 * normalizeSpeciesForAPI already produces - note this means 'pyroar' is
 * keyed as 'pyroar-male' here (PokeAPI has no bare "pyroar" slug, see
 * services/pokeapi.ts's formMappings).
 *
 * BLANKET RULE: Tera Blast does not exist in Pokemon Champions at all
 * (confirmed directly by the user, 2026-07-06 - not a per-species removal,
 * a game-wide absence). PokeAPI's Scarlet/Violet learnsets include it as a
 * universal TM move for nearly every species, so it's stripped
 * unconditionally below rather than needing a per-species entry.
 *
 * Hidden Power and Secret Power are also absent from Champions entirely
 * (confirmed directly by the user, 2026-07-19 - both are pre-Gen-9 TM/tutor
 * moves not present in Champions). Both only matter for the untagged
 * all-time-movepool fallback path this file's corrections are now scoped
 * to (see above) - PokeAPI's own "champions" tag, wherever present,
 * already excludes both correctly on its own.
 */

const GLOBALLY_REMOVED_MOVES = ['tera-blast', 'hidden-power', 'secret-power'];

export const CHAMPIONS_MOVEPOOL_ADDITIONS: Record<string, string[]> = {
  'annihilape': ['dynamic-punch'],
  'barbaracle': ['aqua-cutter', 'close-combat', 'waterfall'],
  'blaziken': ['high-jump-kick', 'superpower'],
  'dragalge': ['iron-tail', 'poison-jab'],
  'eelektross': ['iron-tail', 'psychic-fangs', 'rising-voltage', 'superpower', 'waterfall'],
  'falinks': ['beat-up', 'payback', 'seed-bomb', 'superpower'],
  'gholdengo': ['surf'],
  'grimmsnarl': ['power-whip', 'superpower'],
  'houndstone': ['swagger', 'zen-headbutt'],
  'malamar': ['poison-jab', 'zen-headbutt'],
  'metagross': ['cosmic-power', 'psycho-cut', 'self-destruct', 'steel-roller', 'swagger'],
  'pyroar-male': ['iron-tail', 'payback', 'scorching-sands'],
  'qwilfish': ['payback', 'steel-roller'],
  'sceptile': ['cross-poison', 'dragon-rush', 'earth-power', 'iron-tail'],
  'scolipede': ['gunk-shot', 'leech-life', 'trailblaze'],
  'scrafty': ['dynamic-punch', 'iron-tail'],
  'staraptor': ['blaze-kick', 'brick-break', 'bulk-up', 'focus-blast', 'roost', 'sky-attack', 'swagger'],
  'swampert': ['iron-tail', 'sludge-bomb', 'superpower', 'wave-crash'],
  'vileplume': ['attract', 'corrosive-gas'],
};

export const CHAMPIONS_MOVEPOOL_REMOVALS: Record<string, string[]> = {
  'annihilape': ['covet', 'final-gambit'],
  'barbaracle': ['aerial-ace', 'endeavor', 'hone-claws', 'infestation', 'laser-focus', 'nature-power', 'power-up-punch', 'smack-down', 'swagger', 'toxic', 'water-pulse'],
  'blaziken': ['fire-pledge'],
  'dragalge': ['poison-tail'],
  'gholdengo': ['thunder-wave'],
  'grimmsnarl': ['thunder-wave'],
  'mawile': ['charge-beam', 'counter', 'focus-punch', 'laser-focus', 'magnet-rise', 'metal-burst', 'pain-split', 'power-up-punch', 'psych-up', 'sing', 'super-fang', 'toxic'],
  'metagross': ['heavy-slam', 'hone-claws', 'knock-off'],
  'musharna': ['after-you', 'baton-pass', 'gravity', 'heal-bell', 'magic-coat', 'pain-split', 'psych-up', 'swagger', 'toxic'],
  'overqwil': ['brine', 'poison-tail'],
  'pyroar-male': ['work-up'],
  'qwilfish': ['brine', 'poison-tail'],
  'sceptile': ['grass-pledge'],
  'scolipede': ['aqua-tail', 'endeavor', 'infestation', 'poison-tail', 'swagger', 'venom-drench'],
  'swampert': ['water-pledge'],
};

export function applyChampionsMovepoolChanges(speciesSlug: string, moves: string[]): string[] {
  const additions = CHAMPIONS_MOVEPOOL_ADDITIONS[speciesSlug];
  const removals = CHAMPIONS_MOVEPOOL_REMOVALS[speciesSlug];

  const merged = new Set(moves);
  GLOBALLY_REMOVED_MOVES.forEach(move => merged.delete(move));
  additions?.forEach(move => merged.add(move));
  removals?.forEach(move => merged.delete(move));
  return [...merged];
}
