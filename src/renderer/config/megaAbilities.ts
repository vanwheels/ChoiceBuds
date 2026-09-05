/**
 * Mega Evolution -> Guaranteed Ability (Battle Logger)
 * Mega Evolving replaces a Pokemon's ability with a single fixed one (no
 * 50/50 like a base form's normal/hidden split) - e.g. Charizard-Y is
 * always Drought, never anything else. Used by useBattleLogActions.ts's
 * setMegaEvolved to update the mon's known ability (and, for a weather/
 * terrain ability, the field itself) the moment Mega is declared.
 *
 * PROVENANCE: mainline Mega Evolutions are hand-authored from general
 * Pokemon knowledge (this project's own earlier Champions audit already
 * confirmed core mechanics like the type chart are unchanged from
 * mainline, so this is safe to encode without a Champions-specific source
 * for those entries). Every Champions-invented Mega form (species not part
 * of any mainline Mega Evolution line) is verified against an in-game or
 * datamine-derived source instead - see the two provenance groups below.
 * `config/megaEvolution.ts`'s MEGA_STONE_TO_SPECIES is the full roster this
 * table is checked against; for every species below with no listed entry,
 * Mega-ing still swaps the sprite (see hooks/useMegaSprite.ts) - just not
 * the ability.
 *
 * Group 1 - confirmed via Showdown's `champions` mod (2026-09-01, per
 * CLAUDE.md's sixth Showdown-mod exception): Eelektross/Eelevate first,
 * then Feraligatr/Dragonize, Meganium/Mega Sol, Excadrill/Piercing Drill,
 * Pyroar/Fire Mane, Scovillain/Spicy Spray by reading each Mega forme's
 * `abilities.0` field directly out of `data/pokedex.ts`. See
 * `docs/investigations/champions-showdown-mod-audit.md`'s Leg 3 for the
 * source entries. That mod only lists 13 ability overrides total, all
 * accounted for by this group - it had nothing further to give for the
 * remaining Champions-invented Megas below.
 *
 * Group 2 - the remaining ~29 species (Raichu X/Y, Meowstic, Barbaracle,
 * Chimecho, Golurk, Falinks, Crabominable, Emboar, Drampa, Dragalge,
 * Audino, Glimmora, Malamar, Skarmory, Starmie, Chandelure, Delphox,
 * Greninja, Hawlucha, Clefable, Dragonite, Floette, Froslass, Scolipede,
 * Scrafty, Staraptor, Victreebel, Chesnaught), resolved 2026-09-01 (the
 * "Remaining Champions Mega Ability Audit" backlog item) once Showdown's
 * mod ran dry. Cross-checked per-species against two independent sources:
 * Kotaku's "Pokémon Champions Guide: All The New Legends: Z-A Mega
 * Evolution Abilities" (a single article enumerating every entry in this
 * group) and Serebii's per-species Champions Pokedex pages
 * (serebii.net/pokedex-champions/<species>/), which agreed on every one of
 * the 29 - including several with no name-theming to guess from (Golurk ->
 * Unseen Fist, Chandelure -> Infiltrator, Meowstic -> Trace, Drampa ->
 * Berserk, Victreebel -> Innards Out). Audino was the one species missing
 * from the Kotaku list; Serebii alone confirmed Mega Audino -> Healer for
 * it. Floette is keyed `floette-mega` here (not `floette-eternal-mega`)
 * to match `@smogon/calc`'s own forme name, the same Floette/Floette-
 * Eternal substitution `megaEvolution.ts`'s CURATED_MEGA_FORM_SLUGS already
 * makes for the Calc tab - see that file's comment for why.
 *
 * Group 3 - Reg M-C (announced ahead of its 2026-09-08 6pm PST release, see
 * TODO.md's Regulation M-C Prep entry - pre-release, no Serebii/Kotaku
 * source exists yet the way Groups 1/2 have):
 * - `baxcalibur-mega`/`golisopod-mega`/`salamence-mega` are sourced from
 *   `@smogon/calc` 0.11.0's bundled species dex (`ZA_PATCH`'s `abilities.0`
 *   field) - the same trust level Group 1 gives that library elsewhere, but
 *   unlike Group 1 this hasn't been independently cross-checked against a
 *   second source yet, since none exists pre-release. Salamence-Mega
 *   (Aerilate) is the one already-known mainline value of the three.
 * - `absol-mega-z`/`garchomp-mega-z`/`lucario-mega-z` are Absol/Garchomp/
 *   Lucario's new confirmed "Mega Z" forms - a genuine second Mega for each,
 *   not a Mega-then-something-else. Their abilities (Sharpness/Levitate/
 *   Aura Guard respectively) are user-confirmed reveals, deliberately NOT
 *   taken from `@smogon/calc`'s own bundled `abilities.0` for these 3
 *   entries - that field just duplicates each species' *ordinary* Mega
 *   ability (Magic Bounce/Sand Force/Adaptability), stale placeholder data
 *   from before Reg M-C's real abilities were revealed (see
 *   `config/megaEvolution.ts`'s CURATED_MEGA_FORM_SLUGS comment). Re-verify
 *   all 6 of this group's abilities once Reg M-C ships and a second source
 *   exists to cross-check against.
 */
export const MEGA_ABILITIES: Record<string, string> = {
  'abomasnow-mega': 'Snow Warning',
  'absol-mega': 'Magic Bounce',
  'absol-mega-z': 'Sharpness',
  'aerodactyl-mega': 'Tough Claws',
  'aggron-mega': 'Filter',
  'alakazam-mega': 'Trace',
  'altaria-mega': 'Pixilate',
  'ampharos-mega': 'Mold Breaker',
  'audino-mega': 'Healer',
  'banette-mega': 'Prankster',
  'barbaracle-mega': 'Tough Claws',
  'baxcalibur-mega': 'Thermal Exchange',
  'beedrill-mega': 'Adaptability',
  'blastoise-mega': 'Mega Launcher',
  'blaziken-mega': 'Speed Boost',
  'camerupt-mega': 'Sheer Force',
  'chandelure-mega': 'Infiltrator',
  'charizard-mega-x': 'Tough Claws',
  'charizard-mega-y': 'Drought',
  'chesnaught-mega': 'Bulletproof',
  'chimecho-mega': 'Levitate',
  'clefable-mega': 'Magic Bounce',
  'crabominable-mega': 'Iron Fist',
  'delphox-mega': 'Levitate',
  'dragalge-mega': 'Regenerator',
  'dragonite-mega': 'Multiscale',
  'drampa-mega': 'Berserk',
  'eelektross-mega': 'Eelevate',
  'emboar-mega': 'Mold Breaker',
  'excadrill-mega': 'Piercing Drill',
  'falinks-mega': 'Defiant',
  'feraligatr-mega': 'Dragonize',
  'floette-mega': 'Fairy Aura',
  'froslass-mega': 'Snow Warning',
  'gallade-mega': 'Inner Focus',
  'garchomp-mega': 'Sand Force',
  'garchomp-mega-z': 'Levitate',
  'gardevoir-mega': 'Pixilate',
  'gengar-mega': 'Shadow Tag',
  'glalie-mega': 'Refrigerate',
  'glimmora-mega': 'Adaptability',
  'golisopod-mega': 'Emergency Exit',
  'golurk-mega': 'Unseen Fist',
  'greninja-mega': 'Protean',
  'gyarados-mega': 'Mold Breaker',
  'hawlucha-mega': 'No Guard',
  'heracross-mega': 'Skill Link',
  'houndoom-mega': 'Solar Power',
  'kangaskhan-mega': 'Parental Bond',
  'lopunny-mega': 'Scrappy',
  'lucario-mega': 'Adaptability',
  'lucario-mega-z': 'Aura Guard',
  'malamar-mega': 'Contrary',
  'manectric-mega': 'Intimidate',
  'mawile-mega': 'Huge Power',
  'medicham-mega': 'Pure Power',
  'meganium-mega': 'Mega Sol',
  'meowstic-mega': 'Trace',
  'metagross-mega': 'Tough Claws',
  'pidgeot-mega': 'No Guard',
  'pinsir-mega': 'Aerilate',
  'pyroar-mega': 'Fire Mane',
  'raichu-mega-x': 'Electric Surge',
  'raichu-mega-y': 'No Guard',
  'sableye-mega': 'Magic Bounce',
  'salamence-mega': 'Aerilate',
  'sceptile-mega': 'Lightning Rod',
  'scizor-mega': 'Technician',
  'scolipede-mega': 'Shell Armor',
  'scovillain-mega': 'Spicy Spray',
  'scrafty-mega': 'Intimidate',
  'sharpedo-mega': 'Strong Jaw',
  'skarmory-mega': 'Stalwart',
  'slowbro-mega': 'Shell Armor',
  'staraptor-mega': 'Contrary',
  'starmie-mega': 'Huge Power',
  'steelix-mega': 'Sand Force',
  'swampert-mega': 'Swift Swim',
  'tyranitar-mega': 'Sand Stream',
  'venusaur-mega': 'Thick Fat',
  'victreebel-mega': 'Innards Out',
};

export function getMegaAbility(megaSlug: string | null): string | undefined {
  if (!megaSlug) return undefined;
  return MEGA_ABILITIES[megaSlug];
}
