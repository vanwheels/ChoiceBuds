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
 * Falinks, Scovillain, Crabominable, Feraligatr, Meganium, Emboar, Drampa,
 * Dragalge, Eelektross, Audino, Glimmora, Malamar, Skarmory, Starmie,
 * Chandelure, Delphox, Greninja, Hawlucha, Clefable, Dragonite, Excadrill,
 * Floette, Froslass, Pyroar, Scolipede, Scrafty, Staraptor, Victreebel,
 * Chesnaught) - none of those have a real-game post-Mega ability to verify
 * against, so they're intentionally left out rather than guessed. Only the
 * standard, long-stable mainline Mega Evolutions below are encoded - this
 * project's own earlier Champions audit already confirmed core mechanics
 * like the type chart are unchanged from mainline, so this general
 * Pokemon knowledge is safe to hand-author without a Champions-specific
 * source. For every species below with no listed entry, Mega-ing still
 * swaps the sprite (see hooks/useMegaSprite.ts) - just not the ability.
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
  'metagross-mega': 'Tough Claws',
  'pidgeot-mega': 'No Guard',
  'pinsir-mega': 'Aerilate',
  'sableye-mega': 'Magic Bounce',
  'sceptile-mega': 'Lightning Rod',
  'scizor-mega': 'Technician',
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
