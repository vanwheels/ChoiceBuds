/**
 * Mega Evolution -> Guaranteed Ability (Battle Logger)
 * Mega Evolving replaces a Pokemon's ability with a single fixed one (no
 * 50/50 like a base form's normal/hidden split) - e.g. Charizard-Y is
 * always Drought, never anything else. Used by useBattleLogActions.ts's
 * setMegaEvolved to update the mon's known ability (and, for a weather/
 * terrain ability, the field itself) the moment Mega is declared.
 *
 * DELIBERATELY INCOMPLETE: config/megaEvolution.ts's MEGA_STONE_TO_SPECIES
 * mixes real mainline Mega Evolutions with Mega forms Pokemon Champions
 * itself invented (Raichu X/Y, Meowstic, Barbaracle, Chimecho, Golurk,
 * Falinks, Crabominable, Emboar, Drampa, Dragalge, Audino, Glimmora,
 * Malamar, Skarmory, Starmie, Chandelure, Delphox, Greninja, Hawlucha,
 * Clefable, Dragonite, Floette, Froslass, Scolipede, Scrafty, Staraptor,
 * Victreebel, Chesnaught) - most of those still have no real-game post-Mega
 * ability to verify against, so they're intentionally left out rather than
 * guessed. Only the standard, long-stable mainline Mega Evolutions plus
 * Champions-invented Megas whose ability has actually been confirmed are
 * encoded - this project's own earlier Champions audit already confirmed
 * core mechanics like the type chart are unchanged from mainline, so this
 * general Pokemon knowledge is safe to hand-author without a
 * Champions-specific source for the mainline entries. For every species
 * below with no listed entry, Mega-ing still swaps the sprite (see
 * hooks/useMegaSprite.ts) - just not the ability.
 *
 * Eelektross (Regulation M-B) was confirmed first, cross-checked against
 * Serebii's Champions Pokedex and the reveal itself. The other five below
 * (Feraligatr, Meganium, Excadrill, Pyroar, Scovillain) were confirmed
 * 2026-09-01 by reading each Mega forme's `abilities.0` field directly out
 * of Showdown's `data/pokedex.ts` (per CLAUDE.md's sixth Showdown-mod
 * exception) - ladder-verified rather than guessed from name-theming, which
 * is just as well since two of them (Dragonize on a Water/Dragon Feraligatr,
 * Mega Sol on a Grass/Fairy Meganium) don't telegraph from the name the way
 * Piercing Drill/Excadrill, Fire Mane/Pyroar, and Spicy Spray/Scovillain do.
 * See `docs/investigations/champions-showdown-mod-audit.md` for the source
 * abilities.ts entries these came from.
 */
export const MEGA_ABILITIES: Record<string, string> = {
  'abomasnow-mega': 'Snow Warning',
  'absol-mega': 'Magic Bounce',
  'aerodactyl-mega': 'Tough Claws',
  'aggron-mega': 'Filter',
  'alakazam-mega': 'Trace',
  'altaria-mega': 'Pixilate',
  'ampharos-mega': 'Mold Breaker',
  'banette-mega': 'Prankster',
  'beedrill-mega': 'Adaptability',
  'blastoise-mega': 'Mega Launcher',
  'blaziken-mega': 'Speed Boost',
  'camerupt-mega': 'Sheer Force',
  'charizard-mega-x': 'Tough Claws',
  'charizard-mega-y': 'Drought',
  'eelektross-mega': 'Eelevate',
  'excadrill-mega': 'Piercing Drill',
  'feraligatr-mega': 'Dragonize',
  'gallade-mega': 'Inner Focus',
  'garchomp-mega': 'Sand Force',
  'gardevoir-mega': 'Pixilate',
  'gengar-mega': 'Shadow Tag',
  'glalie-mega': 'Refrigerate',
  'gyarados-mega': 'Mold Breaker',
  'heracross-mega': 'Skill Link',
  'houndoom-mega': 'Solar Power',
  'kangaskhan-mega': 'Parental Bond',
  'lopunny-mega': 'Scrappy',
  'lucario-mega': 'Adaptability',
  'manectric-mega': 'Intimidate',
  'mawile-mega': 'Huge Power',
  'medicham-mega': 'Pure Power',
  'meganium-mega': 'Mega Sol',
  'metagross-mega': 'Tough Claws',
  'pidgeot-mega': 'No Guard',
  'pinsir-mega': 'Aerilate',
  'pyroar-mega': 'Fire Mane',
  'sableye-mega': 'Magic Bounce',
  'sceptile-mega': 'Lightning Rod',
  'scizor-mega': 'Technician',
  'scovillain-mega': 'Spicy Spray',
  'sharpedo-mega': 'Strong Jaw',
  'slowbro-mega': 'Shell Armor',
  'steelix-mega': 'Sand Force',
  'swampert-mega': 'Swift Swim',
  'tyranitar-mega': 'Sand Stream',
  'venusaur-mega': 'Thick Fat',
};

export function getMegaAbility(megaSlug: string | null): string | undefined {
  if (!megaSlug) return undefined;
  return MEGA_ABILITIES[megaSlug];
}
