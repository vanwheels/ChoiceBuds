/**
 * VGC Data Configuration
 * Comprehensive lists of VGC-legal items and commonly used moves
 * Static config file per architecture rules - no inline data in components
 */

/**
 * The complete real Pokémon Champions item pool (hold items, Mega Stones,
 * berries) - sourced live from Serebii's dedicated items page, since this is
 * a smaller/different pool than mainline VGC (no Choice items, Assault Vest,
 * Safety Goggles, terrain seeds, etc. exist in this game):
 * https://www.serebii.net/pokemonchampions/items.shtml
 */
export const VGC_HOLD_ITEMS = [
  'Big Root',
  'Black Belt',
  'Black Glasses',
  'Bright Powder',
  'Charcoal',
  'Choice Scarf',
  'Damp Rock',
  'Dragon Fang',
  'Expert Belt',
  'Fairy Feather',
  'Focus Band',
  'Focus Sash',
  'Hard Stone',
  'Heat Rock',
  'Icy Rock',
  'Iron Ball',
  'King\'s Rock',
  'Leftovers',
  'Life Orb',
  'Light Ball',
  'Light Clay',
  'Magnet',
  'Mental Herb',
  'Metal Coat',
  'Metronome',
  'Miracle Seed',
  'Muscle Band',
  'Mystic Water',
  'Never-Melt Ice',
  'Poison Barb',
  'Quick Claw',
  'Scope Lens',
  'Sharp Beak',
  'Shed Shell',
  'Shell Bell',
  'Silk Scarf',
  'Silver Powder',
  'Smooth Rock',
  'Soft Sand',
  'Spell Tag',
  'Twisted Spoon',
  'White Herb',
  'Wide Lens',
  'Wise Glasses',
  'Zoom Lens',
] as const;

export const VGC_MEGA_STONES = [
  'Abomasite',
  'Absolite',
  'Aerodactylite',
  'Aggronite',
  'Alakazite',
  'Altarianite',
  'Ampharosite',
  'Audinite',
  'Banettite',
  'Barbaracite',
  'Beedrillite',
  'Blastoisinite',
  'Blazikenite',
  'Cameruptite',
  'Chandelurite',
  'Charizardite X',
  'Charizardite Y',
  'Chesnaughtite',
  'Chimechite',
  'Clefablite',
  'Crabominite',
  'Delphoxite',
  'Dragalgite',
  'Dragoninite',
  'Drampanite',
  'Eelektrossite',
  'Emboarite',
  'Excadrite',
  'Falinksite',
  'Feraligite',
  'Floettite',
  'Froslassite',
  'Galladite',
  'Garchompite',
  'Gardevoirite',
  'Gengarite',
  'Glalitite',
  'Glimmoranite',
  'Golurkite',
  'Greninjite',
  'Gyaradosite',
  'Hawluchanite',
  'Heracronite',
  'Houndoominite',
  'Kangaskhanite',
  'Lopunnite',
  'Lucarionite',
  'Malamarite',
  'Manectite',
  'Mawilite',
  'Medichamite',
  'Meganiumite',
  'Meowsticite',
  'Metagrossite',
  'Pidgeotite',
  'Pinsirite',
  'Pyroarite',
  'Raichunite X',
  'Raichunite Y',
  'Sablenite',
  'Sceptilite',
  'Scizorite',
  'Scolipite',
  'Scovillainite',
  'Scraftinite',
  'Sharpedonite',
  'Skarmorite',
  'Slowbronite',
  'Staraptite',
  'Starminite',
  'Steelixite',
  'Swampertite',
  'Tyranitarite',
  'Venusaurite',
  'Victreebelite',
] as const;

export const VGC_BERRIES = [
  'Aspear Berry',
  'Babiri Berry',
  'Charti Berry',
  'Cheri Berry',
  'Chesto Berry',
  'Chilan Berry',
  'Chople Berry',
  'Coba Berry',
  'Colbur Berry',
  'Haban Berry',
  'Kasib Berry',
  'Kebia Berry',
  'Leppa Berry',
  'Lum Berry',
  'Occa Berry',
  'Oran Berry',
  'Passho Berry',
  'Payapa Berry',
  'Pecha Berry',
  'Persim Berry',
  'Rawst Berry',
  'Rindo Berry',
  'Roseli Berry',
  'Shuca Berry',
  'Sitrus Berry',
  'Tanga Berry',
  'Wacan Berry',
  'Yache Berry',
] as const;

/**
 * The full item pool, flattened - existing consumers (useGameData's bulk
 * loader, etc.) iterate this without caring which category a name came from.
 */
export const VGC_ITEMS = [...VGC_HOLD_ITEMS, ...VGC_MEGA_STONES, ...VGC_BERRIES] as const;

export type ItemCategoryTag = 'hold-item' | 'mega-stone' | 'berry';

// Mirrors services/pokeapiService.ts's normalizeNameForAPI so map keys line
// up with ItemData.name exactly (that field is always this same slug form,
// e.g. "big-root", "charizardite-x", "kings-rock") without config/ importing
// from services/.
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-');
}

const ITEM_CATEGORY_MAP: Record<string, ItemCategoryTag> = Object.fromEntries([
  ...VGC_HOLD_ITEMS.map(name => [toSlug(name), 'hold-item' as const]),
  ...VGC_MEGA_STONES.map(name => [toSlug(name), 'mega-stone' as const]),
  ...VGC_BERRIES.map(name => [toSlug(name), 'berry' as const]),
]);

/** '#megastone', '#mega', '#berry', '#berries', '#holditem', '#item' all match their category */
const TAG_ALIASES: Record<string, ItemCategoryTag> = {
  megastone: 'mega-stone',
  mega: 'mega-stone',
  stone: 'mega-stone',
  berry: 'berry',
  berries: 'berry',
  holditem: 'hold-item',
  hold: 'hold-item',
  item: 'hold-item',
};

/** Matches an item name (any casing/spacing) against a '#tag' search query. */
export function itemMatchesTag(itemName: string, tag: string): boolean {
  const category = ITEM_CATEGORY_MAP[toSlug(itemName)];
  const resolvedTag = TAG_ALIASES[tag.replace(/[\s-]/g, '')];
  return !!category && !!resolvedTag && category === resolvedTag;
}

/**
 * Items that are used up (removed from the holder) the moment they trigger,
 * rather than persisting for the whole battle - every berry, plus the 3
 * hold items in this game's pool that are also one-time-use (Focus Sash,
 * Mental Herb, White Herb). Powers the Battle Logger's "consumed"
 * checkbox on the opponent item field - see components/battlelog/
 * OpponentRowFields.tsx.
 */
const CONSUMABLE_HOLD_ITEMS = ['Focus Sash', 'Mental Herb', 'White Herb'];
export const CONSUMABLE_ITEMS = [...VGC_BERRIES, ...CONSUMABLE_HOLD_ITEMS] as const;
const CONSUMABLE_ITEM_SLUGS = new Set(CONSUMABLE_ITEMS.map(toSlug));

export function isConsumableItem(itemName: string | undefined): boolean {
  if (!itemName) return false;
  return CONSUMABLE_ITEM_SLUGS.has(toSlug(itemName));
}

/**
 * Type for VGC items
 */
export type VGCItem = typeof VGC_ITEMS[number];

/**
 * All 25 mainline natures - unrestricted in every VGC/Champions regulation,
 * so unlike items/species there's no legality filtering here. Powers the
 * Teams tab's Nature selector (StatsColumn.tsx); the Calc tab instead reads
 * these from @smogon/calc's own `gen.natures.get()` since it already has a
 * generation object on hand.
 */
export const NATURES = [
  'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty',
  'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
  'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive',
  'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
  'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky',
] as const;

/** The 5 stats a nature can actually affect - HP is never boosted/lowered by nature in any generation. */
export type NatureStat = 'Atk' | 'Def' | 'SpA' | 'SpD' | 'Spe';

export interface NatureEffect {
  plus: NatureStat;
  minus: NatureStat;
}

/**
 * Standard +10%/-10% nature stat effects. The 5 diagonal "neutral" natures
 * (Hardy/Docile/Serious/Bashful/Quirky) map to `null` - same stat would
 * cancel itself out, so the games treat them as no-ops rather than a
 * same-stat +/-.
 */
export const NATURE_EFFECTS: Record<string, NatureEffect | null> = {
  Hardy: null,
  Lonely: { plus: 'Atk', minus: 'Def' },
  Brave: { plus: 'Atk', minus: 'Spe' },
  Adamant: { plus: 'Atk', minus: 'SpA' },
  Naughty: { plus: 'Atk', minus: 'SpD' },
  Bold: { plus: 'Def', minus: 'Atk' },
  Docile: null,
  Relaxed: { plus: 'Def', minus: 'Spe' },
  Impish: { plus: 'Def', minus: 'SpA' },
  Lax: { plus: 'Def', minus: 'SpD' },
  Timid: { plus: 'Spe', minus: 'Atk' },
  Hasty: { plus: 'Spe', minus: 'Def' },
  Serious: null,
  Jolly: { plus: 'Spe', minus: 'SpA' },
  Naive: { plus: 'Spe', minus: 'SpD' },
  Modest: { plus: 'SpA', minus: 'Atk' },
  Mild: { plus: 'SpA', minus: 'Def' },
  Quiet: { plus: 'SpA', minus: 'Spe' },
  Bashful: null,
  Rash: { plus: 'SpA', minus: 'SpD' },
  Calm: { plus: 'SpD', minus: 'Atk' },
  Gentle: { plus: 'SpD', minus: 'Def' },
  Sassy: { plus: 'SpD', minus: 'Spe' },
  Careful: { plus: 'SpD', minus: 'SpA' },
  Quirky: null,
};

export function getNatureEffect(nature: string | undefined): NatureEffect | null {
  if (!nature) return null;
  return NATURE_EFFECTS[nature] ?? null;
}
