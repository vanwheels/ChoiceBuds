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
 * for at all: the 22 species Regulation M-B added, plus Floette.
 *
 * RE-AUDITED 2026-09-01 (Champions Data Leg 4a): re-ran that same live
 * coverage check against the full current legal roster (235 unique
 * species/form slugs, resolving each one's real PokeAPI slug first -
 * several of the 22 don't resolve under their bare dex name, e.g.
 * `gourgeist` needs `gourgeist-average`, `pyroar` needs `pyroar-male`).
 * Result: PokeAPI has since back-filled all 22 of the Reg M-B species -
 * **Floette is now the only species left in this file's scope.** This
 * means `CHAMPIONS_MOVEPOOL_ADDITIONS`/`CHAMPIONS_MOVEPOOL_REMOVALS`'s
 * entries for every species below other than Floette (which has none) are
 * very likely dead code now - not pruned this session, since a user with
 * an already-cached (`NEVER_EXPIRES`) `hasChampionsMoveData: false` entry
 * from before their backfill would still hit this table's corrections
 * until that cache entry is invalidated some other way, and no such
 * invalidation path exists today. Flagged as a follow-up in TODO.md rather
 * than deleted outright.
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
 *
 * EXPANDED 2026-09-01 (Champions Data Leg 4a, see
 * docs/investigations/champions-showdown-mod-audit.md for the full trail):
 * sourced from `smogon/pokemon-showdown`'s `data/mods/champions/moves.ts`
 * (project policy exception #6) - of its 259 move entries, 194 carry only
 * an `isNonstandard: "Past"` flag with no other field changed, meaning
 * (since a mod file only lists deltas from mainline) Champions removed
 * each one relative to mainline SV. An earlier pass (Leg 1's heads-up)
 * assumed this flag meant "absent from the game" and found 16 counter-
 * examples (signature moves like Shell Trap/Turtonator still confirmed
 * live via `championsMoveOverrides.ts`), concluding the flag actually
 * means "not TM/Tutor-teachable" and that porting the list wholesale was
 * unsafe. That concern turned out to assume this array applies to every
 * species - it doesn't (see the header comment above): it's only ever
 * consulted for species PokeAPI hasn't "champions"-tagged yet, and Leg 4a's
 * live re-audit found that's just Floette today. So the only real safety
 * question was "does removing any of these 194 moves take something away
 * from Floette specifically" - checked directly against Floette's own SV
 * learnset (`pokemon-species` `moves`, filtered to the `scarlet-violet`
 * version group and split by learn method): Leg 4a found 5 of the 194 are
 * moves Floette learns by level-up in mainline SV (`vine-whip`, `tackle`,
 * `razor-leaf`, `fairy-wind`, `magical-leaf`) and excluded all 5 from this
 * list on the assumption that a `moves.ts` "Past" flag only means
 * "not TM/Tutor-teachable," not "absent." Leg 4b (below) found stronger,
 * species-scoped evidence that assumption was wrong for all 5 - they're
 * included below now. `double-shock` and `revival-blessing` were also
 * dropped from the candidate set - Bulbapedia's per-move pages (cross-
 * checked per Leg 4a's investigation) list both as available in Champions,
 * disagreeing with the Past flag; excluding them costs nothing today since
 * neither is in Floette's learnset regardless, but keeps this list honest
 * for whenever its scope next changes (e.g. a future species losing its
 * champions tag). `v-create` (Victini's signature move) is included -
 * Victini isn't on this app's legal roster at all (see
 * `utils/pokemonRules.ts`), so the signature-move collision the Leg 1
 * heads-up worried about doesn't apply.
 *
 * EXPANDED AGAIN 2026-09-01 (Champions Data Leg 4b): audited this file's
 * two per-species maps against a *second*, independent Showdown source -
 * `data/mods/champions/learnsets.ts`, not `moves.ts`. Unlike `moves.ts`'s
 * blanket Past-flag list, this file gives each of 232 species (every
 * species Champions' moveset differs from mainline for) its own complete,
 * standalone Champions movepool - no inheritance, every entry a full
 * replacement (confirmed: only one `inherit: true` species in the whole
 * file, `floetteeternal`, an unrelated Eternal Flower form override; bare
 * `floette` has no entry at all, meaning Showdown's mod applies no delta to
 * regular Floette beyond what `moves.ts`/this file already handle).
 * Cross-checked all 22 Reg M-B species by computing, per species, its real
 * PokeAPI all-time movepool (the same baseline `fetchSpeciesLearnset`
 * itself uses when `hasChampionsMoveData` is false - the full historical
 * moveset across every version group PokeAPI has ever recorded, not just
 * `scarlet-violet`) with this file's `GLOBALLY_REMOVED_MOVES`/`ADDITIONS`/
 * `REMOVALS` applied, then diffed the result against that species' real
 * Showdown-mod entry. `annihilape` (a Gen 9-native species with no legacy-
 * game moves in its all-time pool at all) matched exactly. The other 21
 * species turned up real per-species gaps - not applied here, since Leg 4a
 * already confirmed PokeAPI has back-filled real `champions`-tagged move
 * data for all 22, making their entries in this file dead code today (see
 * the "Prune Dead `championsMovepoolChanges.ts` Per-Species Entries"
 * TODO.md item) - spending further effort perfecting confirmed-dead-code
 * accuracy isn't worthwhile until that item resolves one way or the other.
 * Full per-species discrepancy tables are recorded in
 * `docs/investigations/champions-showdown-mod-audit.md`'s Leg 4b section
 * for whoever resolves that item next.
 *
 * What *did* come out of this pass as a live fix: aggregating every
 * species' "our correction expects this move present, Showdown's mod says
 * it's absent" gaps and keeping only the moves absent from literally every
 * one of the 232 tracked species (not just gaps specific to one species'
 * own restricted movepool) surfaced 46 more moves missing from
 * `GLOBALLY_REMOVED_MOVES` - added below. All 5 of Leg 4a's Floette
 * carve-out moves (`vine-whip`, `tackle`, `razor-leaf`, `fairy-wind`,
 * `magical-leaf`) are among the 46: none of them appear anywhere in
 * `learnsets.ts`'s 232 species, including species that plainly would have
 * kept them if Champions left their movepool untouched (e.g. multiple
 * Grass-types elsewhere in the file with no reason to lose Vine Whip
 * otherwise). That's stronger, species-scoped evidence than `moves.ts`'s
 * blanket Past flag, so Leg 4a's carve-out is superseded - all 5 are
 * globally removed now, meaning Floette loses them like every other
 * species. (Moves like `toxic`/`attract`/`doubleteam`/`swagger` also
 * showed up as "expected but absent" for several of the 22 species, but
 * DO appear elsewhere in `learnsets.ts` for other species - e.g. `swagger`
 * is confirmed present for `annihilape` - so those are real per-species
 * removals, not global ones, and were left for the per-species dead-code
 * question above rather than added here.)
 *
 * LEG 6 UPDATE (2026-09-01): the "Floette" this file's Leg 4a/4b passes
 * audited was the wrong species. `utils/pokemonRules.ts`'s roster entry has
 * been corrected from `floette` to `floette-eternal` - Champions' real
 * legal Floette is the Eternal Flower form (see
 * `docs/investigations/champions-showdown-mod-audit.md`'s Leg 5/6
 * sections). Re-ran the `hasChampionsMoveData` check directly against
 * PokeAPI's `floette-eternal` resource: unlike bare `floette` (0
 * champions-tagged moves), `floette-eternal` already carries 41
 * champions-tagged moves (all via the `train`/Move Reminder learn method).
 * That means `hasChampionsMoveData` resolves `true` for the species this
 * app actually uses now, so `useGameData.ts::applyMovepoolChangesIfNeeded`
 * never calls into this file for it - same as the 22 Reg M-B species Leg 4a
 * already found.
 *
 * PRUNE (2026-09-01, "Prune Dead championsMovepoolChanges.ts Entries" Leg
 * 1): with every current-roster species confirmed above to already have
 * real PokeAPI champions move data, `CHAMPIONS_MOVEPOOL_ADDITIONS`/
 * `CHAMPIONS_MOVEPOOL_REMOVALS`'s per-species rows (the 22 Reg M-B species;
 * Floette had none) were confirmed-dead code and are removed below - both
 * maps are now empty. `GLOBALLY_REMOVED_MOVES` and the
 * `applyChampionsMovepoolChanges`/`applyMovepoolChangesIfNeeded` gate
 * mechanism are kept alive as-is despite being unreachable for today's
 * roster too: Regulation M-C (drops 2026-09-08) adds new species that will
 * very likely hit this same "PokeAPI hasn't back-filled its champions tag
 * yet" gap the 22 M-B species originally did, so the fallback path itself
 * still needs to exist for whoever populates its per-species maps next -
 * it's the M-B-specific data that was dead, not the mechanism. See
 * `useGameData.ts::getCachedSpeciesLearnset`'s companion self-heal fix from
 * the same leg: a cached `hasChampionsMoveData: false` entry now forces a
 * re-fetch instead of trusting a stale `NEVER_EXPIRES` false forever.
 *
 * REG M-C Z-A-EXCLUSIVE MOVEPOOL AUDIT, Leg 1 (2026-09-30): re-ran this
 * same hasChampionsMoveData live check against the full current legal
 * roster (266 roster entries, 262 unique PokeAPI resources, per
 * utils/pokemonRules.ts's REG_MA/REG_MB/REG_MC species lists) rather than
 * just the hand-picked indicator species (Rillaboom/Baxcalibur/Salamence)
 * TODO.md had been re-checking. Result: all 22 Reg M-B species plus Floette
 * remain correctly back-filled (0 zero-tag species outside Reg M-C,
 * confirming the PRUNE above is still accurate) - the *entire* 25-species
 * Reg M-C addition is the zero-tag set, with no exceptions and no species
 * outside Reg M-C newly regressing. Squawkabilly has no bare PokeAPI
 * resource (see utils/pokemonRules.ts) so all 4 plumage-color varieties
 * were queried/keyed identically below - purely cosmetic, same move data.
 *
 * For each of the 25, computed its real PokeAPI all-time movepool (every
 * version group PokeAPI has ever recorded, the same `fetchSpeciesLearnset`
 * fallback baseline Leg 4b used) with `GLOBALLY_REMOVED_MOVES` applied, then
 * diffed the result against that species' real `data/mods/champions/
 * learnsets.ts` entry (raw-fetched, not summarized - same discipline as
 * every prior leg in docs/investigations/champions-showdown-mod-audit.md).
 * All 25 species have their own `learnsets.ts` entry (none use `inherit:
 * true`), so this is the same complete-standalone-movepool comparison Leg 4b
 * proved sound on annihilape/the 22 Reg M-B species.
 *
 * This supersedes the 5 single-move entries added piecemeal during Reg M-C
 * Prep (baxcalibur/rillaboom/cinderace/pincurchin/golisopod) with the full
 * per-species gap lists the real methodology turns up - each of those 5
 * original single-move entries is confirmed present in its species' fuller
 * list below. One exception: Golisopod's `superpower` isn't in Showdown's
 * `learnsets.ts` entry for it at all (same as it was absent from Golisopod's
 * PokeAPI all-time movepool when that entry was first added) - kept as a
 * manually-preserved addition since it was a direct, dated user confirmation
 * - a reminder that Showdown's `learnsets.ts`, like `moves.ts`'s "Past" flag
 * (Leg 4a), may simply not capture every real in-game-teachable move. The
 * much longer
 * per-species removal lists below (e.g. Wigglytuff's 22) are the same shape
 * Leg 4b already found for the 22 Reg M-B species (see that leg's table in
 * the investigation doc) - old-game egg/tutor-only moves in PokeAPI's
 * all-time baseline that Champions' own narrower tutor/TM catalogue doesn't
 * carry forward for that specific species. Spot-checked that frequently-
 * removed moves like `attract`/`toxic` are genuine per-species removals, not
 * globally absent from Champions: `attract` still appears as a learnable
 * move for 73 other `learnsets.ts` species, `toxic` for 31, so both were
 * correctly left out of `GLOBALLY_REMOVED_MOVES` and handled per-species
 * here instead, same reasoning Leg 4b already established.
 */

const GLOBALLY_REMOVED_MOVES = [
  'absorb', 'acid', 'aeroblast', 'arm-thrust', 'aromatherapy', 'astonish',
  'attack-order', 'aurora-beam', 'behemoth-bash', 'behemoth-blade', 'bide', 'blazing-torque',
  'bleakwind-storm', 'blue-flare', 'bolt-strike', 'branch-poke', 'brine', 'bubble',
  'bubble-beam', 'burning-bulwark', 'camouflage', 'captivate', 'celebrate', 'chip-away',
  'chloroblast', 'clamp', 'collision-course', 'combat-torque', 'confide', 'confusion',
  'constrict', 'conversion', 'conversion-2', 'court-change', 'crush-grip', 'cut',
  'dark-void', 'defend-order', 'defense-curl', 'diamond-storm', 'disarming-voice', 'doodle',
  'doom-desire', 'double-kick', 'dragon-ascent', 'dragon-breath', 'dragon-energy', 'dream-eater',
  'drum-beating', 'dual-chop', 'dynamax-cannon', 'echoed-voice', 'electro-drift', 'embargo',
  'ember', 'esper-wing', 'fairy-wind', 'false-surrender', 'false-swipe', 'feint-attack',
  'fiery-wrath', 'fillet-away', 'fire-pledge', 'flame-wheel', 'flash', 'fleur-cannon',
  'floral-healing', 'force-palm', 'foresight', 'freeze-shock', 'freezing-glare', 'frustration',
  'fury-attack', 'fury-cutter', 'fury-swipes', 'fusion-bolt', 'fusion-flare', 'glacial-lance',
  'glaciate', 'glaive-rush', 'grass-pledge', 'growl', 'gust', 'hail',
  'happy-hour', 'harden', 'headbutt', 'heart-swap', 'hidden-power', 'hold-back',
  'hold-hands', 'hone-claws', 'horn-attack', 'hydro-steam', 'hyperspace-fury', 'hyperspace-hole',
  'ice-burn', 'incinerate', 'ion-deluge', 'ivy-cudgel', 'jaw-lock', 'judgment',
  'jungle-healing', 'laser-focus', 'leafage', 'leer', 'lick', 'lucky-chant',
  'lunar-blessing', 'lunar-dance', 'luster-purge', 'magical-leaf', 'magical-torque', 'magma-storm',
  'malignant-chain', 'mega-drain', 'mega-punch', 'metal-claw', 'metronome', 'mighty-cleave',
  'milk-drink', 'mimic', 'miracle-eye', 'mirror-move', 'mist', 'mist-ball',
  'moongeist-beam', 'mud-bomb', 'mud-sport', 'mystical-power', 'natural-gift', 'nature-power',
  'noxious-torque', 'ominous-wind', 'order-up', 'origin-pulse', 'overdrive', 'pay-day',
  'peck', 'photon-geyser', 'play-nice', 'poison-gas', 'poison-sting', 'poison-tail',
  'powder-snow', 'power-up-punch', 'precipice-blades', 'present', 'prismatic-laser', 'psybeam',
  'psyblade', 'psycho-boost', 'psystrike', 'psywave', 'punishment', 'pursuit',
  'pyro-ball', 'rage', 'razor-leaf', 'relic-song', 'retaliate', 'return',
  'revenge', 'roar-of-time', 'rock-climb', 'rock-smash', 'rock-throw', 'rollout',
  'ruination', 'sacred-fire', 'sand-attack', 'sandsear-storm', 'scratch', 'secret-power',
  'secret-sword', 'seed-flare', 'shadow-force', 'shift-gear', 'shock-wave', 'shore-up',
  'signal-beam', 'silk-trap', 'sketch', 'skull-bash', 'sky-uppercut', 'slam',
  'slash', 'sludge', 'smog', 'smokescreen', 'snatch', 'spacial-rend',
  'spark', 'splash', 'springtide-storm', 'steam-eruption', 'steamroller', 'stomp',
  'strange-steam', 'strength', 'sunsteel-strike', 'supersonic', 'surging-strikes', 'swift',
  'tachyon-cutter', 'tackle', 'tail-glow', 'tail-whip', 'take-down', 'take-heart',
  'tar-shot', 'telekinesis', 'teleport', 'tera-blast', 'tera-starstorm', 'thunder-cage',
  'thunder-shock', 'thunderclap', 'thunderous-kick', 'triple-kick', 'twister', 'v-create',
  'venom-drench', 'vice-grip', 'victory-dance', 'vine-whip', 'water-gun', 'water-pledge',
  'wicked-blow', 'wicked-torque', 'wildbolt-storm', 'wing-attack', 'withdraw', 'work-up',
  'zing-zap',
];

// Full per-species sweep (Reg M-C Z-A-Exclusive Movepool Audit, Leg 1,
// 2026-09-30) - see the header comment's matching dated section for the
// methodology. Covers all 25 Reg M-C-added species, the only species on the
// current roster with hasChampionsMoveData still false; supersedes the 5
// single-move entries hand-added during Reg M-C Prep (baxcalibur/rillaboom/
// cinderace/pincurchin/golisopod - each confirmed still present in its
// fuller list below). Squawkabilly has no bare PokeAPI resource, so all 4
// plumage-color varieties are keyed identically (purely cosmetic - see
// utils/pokemonRules.ts). Re-check (and prune, same as the 22 Reg M-B
// species before them) once PokeAPI back-fills real "champions"-tagged move
// data for these 25 - `useGameData.ts::getCachedSpeciesLearnset`'s
// `hasChampionsMoveData !== true` self-heal already forces that re-fetch
// rather than trusting a stale cached `false` forever.
export const CHAMPIONS_MOVEPOOL_ADDITIONS: Record<string, string[]> = {
  wigglytuff: ['heal-pulse', 'moonblast', 'perish-song', 'wish'],
  persian: ['flail', 'slash'],
  'persian-alola': ['flail', 'flatter', 'parting-shot', 'slash'],
  farfetchd: ['slash', 'trailblaze'],
  swalot: ['acid-armor', 'clear-smog', 'corrosive-gas', 'destiny-bond', 'skitter-smack', 'stuff-cheeks'],
  salamence: ['dragon-rush', 'slash', 'thrash'],
  gogoat: ['megahorn', 'milk-drink'],
  // superpower is absent from Showdown's learnsets.ts entry for Golisopod
  // too (same as it was absent from PokeAPI's all-time movepool when this
  // entry was first added 2026-09-09) - kept as a manually-preserved
  // addition on the strength of the original direct user confirmation
  // rather than dropped for lacking a written source. The other 10 are new,
  // Showdown-confirmed findings from this sweep.
  golisopod: ['agility', 'aqua-jet', 'chilling-water', 'double-hit', 'gunk-shot', 'night-slash', 'pounce', 'slash', 'superpower', 'u-turn', 'wide-guard'],
  rillaboom: ['drum-beating'],
  cinderace: ['court-change', 'pyro-ball'],
  thievul: ['double-team', 'first-impression', 'howl', 'knock-off', 'quick-guard', 'roar', 'torment', 'trailblaze'],
  'toxtricity-amped': ['overdrive', 'shift-gear', 'zap-cannon'],
  'toxtricity-low-key': ['overdrive', 'parabolic-charge'],
  grapploct: ['chilling-water', 'circle-throw', 'mach-punch', 'pain-split', 'seismic-toss', 'soak', 'storm-throw', 'sucker-punch'],
  perrserker: ['aerial-ace', 'bite', 'bulk-up', 'covet', 'flail', 'flash-cannon', 'night-slash', 'slash', 'spikes', 'thunder-wave'],
  sirfetchd: ['aerial-ace', 'counter', 'covet', 'curse', 'double-edge', 'feather-dance', 'feint', 'flail', 'night-slash', 'quick-attack', 'quick-guard', 'simple-beam', 'sky-attack', 'slash'],
  pincurchin: ['zing-zap'],
  'indeedee-male': ['wish'],
  'indeedee-female': ['alluring-voice', 'sing', 'wish'],
  pawmot: ['fake-out', 'mach-punch', 'sweet-kiss', 'wish'],
  'squawkabilly-green-plumage': ['lunge', 'seed-bomb'],
  'squawkabilly-blue-plumage': ['lunge', 'seed-bomb'],
  'squawkabilly-yellow-plumage': ['lunge', 'seed-bomb'],
  'squawkabilly-white-plumage': ['lunge', 'seed-bomb'],
  mabosstiff: ['destiny-bond', 'focus-energy', 'jaw-lock'],
  baxcalibur: ['aqua-tail', 'dragon-rush', 'freeze-dry', 'frost-breath', 'glaive-rush'],
};

export const CHAMPIONS_MOVEPOOL_REMOVALS: Record<string, string[]> = {
  wigglytuff: ['ally-switch', 'attract', 'charge-beam', 'counter', 'curse', 'detect', 'double-slap', 'double-team', 'dynamic-punch', 'heal-bell', 'magic-coat', 'minimize', 'mud-slap', 'nightmare', 'pound', 'recycle', 'role-play', 'seismic-toss', 'submission', 'swagger', 'toxic', 'zap-cannon'],
  persian: ['attract', 'curse', 'detect', 'mud-slap', 'night-slash', 'nightmare', 'swagger', 'torment', 'toxic', 'zap-cannon'],
  'persian-alola': ['attract', 'last-resort', 'swagger', 'torment', 'toxic'],
  farfetchd: ['defog', 'detect', 'double-edge', 'double-team', 'last-resort', 'mud-slap', 'pluck', 'psych-up', 'razor-wind', 'reflect', 'swagger', 'tailwind', 'toxic', 'trump-card', 'whirlwind'],
  'mr-mime': ['aerial-ace', 'barrier', 'counter', 'covet', 'curse', 'double-edge', 'double-slap', 'double-team', 'dynamic-punch', 'focus-punch', 'follow-me', 'infestation', 'magic-coat', 'meditate', 'mud-slap', 'nightmare', 'pound', 'psych-up', 'seismic-toss', 'submission', 'swagger', 'toxic', 'wake-up-slap', 'zap-cannon'],
  swalot: ['attract', 'block', 'counter', 'double-team', 'dynamic-punch', 'explosion', 'infestation', 'nightmare', 'pound', 'swagger', 'wring-out'],
  salamence: ['air-cutter', 'aqua-tail', 'attract', 'defog', 'double-team', 'refresh', 'swagger', 'toxic'],
  gogoat: ['attract', 'bounce', 'double-team', 'swagger', 'toxic'],
  golisopod: ['aerial-ace', 'double-team', 'endeavor', 'frost-breath', 'knock-off', 'pain-split', 'psych-up', 'swagger', 'toxic', 'water-pulse'],
  rillaboom: ['attract', 'darkest-lariat'],
  cinderace: ['ally-switch', 'attract'],
  inteleon: ['attract', 'pound', 'safeguard'],
  'toxtricity-amped': ['attract'],
  'toxtricity-low-key': ['attract'],
  grapploct: ['octazooka', 'submission'],
  perrserker: ['attract'],
  pincurchin: ['attract'],
  'indeedee-male': ['ally-switch', 'attract'],
  'indeedee-female': ['ally-switch', 'attract', 'expanding-force', 'gravity', 'psychic-noise', 'psycho-shift'],
  mabosstiff: ['charm'],
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

/**
 * Post-launch balance-patch move removals - a different kind of correction
 * than CHAMPIONS_MOVEPOOL_ADDITIONS/REMOVALS above. Those two are gated
 * behind `hasChampionsMoveData` in useGameData.ts (only consulted when
 * PokeAPI has zero "champions"-tagged moves for a species) because they're
 * sourced from a mixed-reliability community spreadsheet/Showdown mod that
 * PokeAPI's own tag data is trusted to supersede once it exists (see this
 * file's header, the Sharpedo/Thief case). A patch removal below is
 * different in kind: it's a specific, dated fact the user confirmed
 * directly (not a stale table PokeAPI might already have right), correcting
 * for a balance change that landed *after* whatever snapshot PokeAPI's own
 * champions-tag data reflects. PokeAPI has no mechanism to ever un-teach a
 * post-launch patch removal on its own, tagged or not - so this is applied
 * unconditionally in useGameData.ts's applyMovepoolChangesIfNeeded,
 * regardless of hasChampionsMoveData.
 *
 * archaludon ADDED 2026-09-09 (provided directly by the user): lost access
 * to Mirror Coat and Metal Burst in Champions. PokeAPI's champions-tagged
 * data for Archaludon still includes both as of this writing (confirmed
 * live) - expected, since PokeAPI has no way to know about a patch that
 * postdates its own snapshot.
 */
export const CHAMPIONS_PATCH_MOVEPOOL_REMOVALS: Record<string, string[]> = {
  archaludon: ['mirror-coat', 'metal-burst'],
};

export function applyChampionsPatchRemovals(speciesSlug: string, moves: string[]): string[] {
  const removals = CHAMPIONS_PATCH_MOVEPOOL_REMOVALS[speciesSlug];
  if (!removals || removals.length === 0) return moves;
  const removeSet = new Set(removals);
  return moves.filter(move => !removeSet.has(move));
}
