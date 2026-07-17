/**
 * Static VGC Pokémon Rules Utility
 * Handles gender-locks, form variants, and default assignments
 * for accurate Showdown text parsing when explicit data is missing
 */

/**
 * Female-locked species (can only be female in VGC)
 * These species will default to 'F' gender when no explicit gender is provided
 */
export const FEMALE_LOCKED_SPECIES: readonly string[] = [
  'Cresselia',
  'Enamorus',
  'Enamorus-Therian',
  'Fezandipiti',
  'Blissey',
  'Chansey',
  'Happiny',
  'Illumise',
  'Mandibuzz',
  'Vullaby',
  'Froslass',
  'Tsareena',
  'Steenee',
  'Bounsweet',
  'Tinkaton',
  'Tinkatuff',
  'Tinkatink',
  'Hatterene',
  'Hattrem',
  'Hatenna',
  'Salazzle',
  'Vespiquen',
  'Wormadam',
  'Wormadam-Sandy',
  'Wormadam-Trash',
  'Kangaskhan',
  'Miltank',
  'Nidoqueen',
  'Nidorina',
  'Nidoran-F',
  'Petilil',
  'Lilligant',
  'Lilligant-Hisui',
  'Florges',
  'Floette',
  'Flabebe',
] as const;

/**
 * Genderless species (have no gender in VGC)
 * These species will default to 'N' (null/genderless) when no explicit gender is provided
 */
export const GENDERLESS_SPECIES: readonly string[] = [
  'Gholdengo',
  'Gimmighoul',
  'Gimmighoul-Roaming',
  'Metagross',
  'Metang',
  'Beldum',
  'Rotom',
  'Rotom-Wash',
  'Rotom-Heat',
  'Rotom-Mow',
  'Rotom-Frost',
  'Rotom-Fan',
  'Regieleki',
  'Regidrago',
  'Regice',
  'Registeel',
  'Regirock',
  'Regigigas',
  'Terapagos',
  'Terapagos-Terastal',
  'Terapagos-Stellar',
  'Archaludon',
  'Duraludon',
  'Bronzong',
  'Bronzor',
  'Claydol',
  'Baltoy',
  'Cryogonal',
  'Dhelmise',
  'Falinks',
  'Golett',
  'Golurk',
  'Klang',
  'Klink',
  'Klinklang',
  'Lunatone',
  'Magnezone',
  'Magneton',
  'Magnemite',
  'Minior',
  'Minior-Meteor',
  'Porygon',
  'Porygon2',
  'Porygon-Z',
  'Shedinja',
  'Solrock',
  'Staryu',
  'Starmie',
  'Voltorb',
  'Voltorb-Hisui',
  'Electrode',
  'Electrode-Hisui',
  'Carbink',
  'Magearna',
  'Magearna-Original',
  'Meltan',
  'Melmetal',
  'Genesect',
  'Genesect-Douse',
  'Genesect-Shock',
  'Genesect-Burn',
  'Genesect-Chill',
  'Silvally',
  'Type: Null',
  'Zacian',
  'Zacian-Crowned',
  'Zamazenta',
  'Zamazenta-Crowned',
  'Eternatus',
  'Eternatus-Eternamax',
] as const;

/**
 * Form variants that include gender in their name
 * These need special handling to extract gender from the form name itself
 */
export const GENDERED_FORM_VARIANTS: Record<string, 'M' | 'F'> = {
  'Basculegion-F': 'F',
  'Basculegion': 'M', // Default male form
  'Indeedee-F': 'F',
  'Indeedee': 'M', // Default male form
  'Meowstic-F': 'F',
  'Meowstic': 'M', // Default male form
  'Oinkologne-F': 'F',
  'Oinkologne': 'M', // Default male form
} as const;

/**
 * Normalizes a species name for lookup
 * Converts to lowercase and handles common variations
 */
export function normalizeSpeciesName(species: string): string {
  return species.trim().toLowerCase();
}

/**
 * Checks if a species is female-locked
 */
export function isFemaleLocked(species: string): boolean {
  const normalized = normalizeSpeciesName(species);
  return FEMALE_LOCKED_SPECIES.some(s => normalizeSpeciesName(s) === normalized);
}

/**
 * Checks if a species is genderless
 */
export function isGenderless(species: string): boolean {
  const normalized = normalizeSpeciesName(species);
  return GENDERLESS_SPECIES.some(s => normalizeSpeciesName(s) === normalized);
}

/**
 * Gets the gender for a gendered form variant
 * Returns undefined if the species is not a gendered form variant
 */
export function getGenderedFormGender(species: string): 'M' | 'F' | undefined {
  // Check exact match first
  if (species in GENDERED_FORM_VARIANTS) {
    return GENDERED_FORM_VARIANTS[species as keyof typeof GENDERED_FORM_VARIANTS];
  }
  
  // Check case-insensitive match
  const normalized = normalizeSpeciesName(species);
  for (const [formName, gender] of Object.entries(GENDERED_FORM_VARIANTS)) {
    if (normalizeSpeciesName(formName) === normalized) {
      return gender;
    }
  }
  
  return undefined;
}

/**
 * Base species covered by GENDERED_FORM_VARIANTS above - male is this app's
 * unmarked-default storage convention (bare "Basculegion" means male, only
 * the female form gets an explicit "-F" baked into showdownData.species -
 * see GENDERED_FORM_VARIANTS). That's fine for in-app display (a separate
 * gender toggle/icon shows the actual gender everywhere else), but the VGC
 * Team Sheet PDF (services/teamSheetPdf.ts) needs the species column to read
 * exactly as it appears in-game, which always shows the gender for these
 * species - so formatSpeciesWithGenderSuffix below makes the male suffix
 * explicit too, only for this export.
 */
const GENDER_DIVERGENT_BASE_SPECIES = Object.keys(GENDERED_FORM_VARIANTS)
  .map(name => name.split('-')[0].toLowerCase());

/**
 * Appends an explicit "-M"/"-F" for the four gender-divergent species
 * (Basculegion/Indeedee/Meowstic/Oinkologne) when not already present in
 * `species` - see GENDER_DIVERGENT_BASE_SPECIES above for why this only
 * matters for these four. A no-op for every other species, and a no-op if
 * `species` already ends in "-M"/"-F" (e.g. "Indeedee-F" from parsing).
 */
export function formatSpeciesWithGenderSuffix(species: string, gender: 'M' | 'F' | 'N' | '' | undefined): string {
  const base = species.split('-')[0];
  if (!GENDER_DIVERGENT_BASE_SPECIES.includes(base.toLowerCase())) return species;
  if (/-[mf]$/i.test(species)) return species;
  return `${species}-${gender === 'F' ? 'F' : 'M'}`;
}

/**
 * Determines the fallback gender for a species when no explicit gender is provided
 * 
 * Priority order:
 * 1. Check if it's a gendered form variant (e.g., Basculegion-F)
 * 2. Check if it's female-locked
 * 3. Check if it's genderless
 * 4. Default to 'M' (male) as baseline
 * 
 * @param species - The species name (may include form variants)
 * @returns The appropriate gender: 'M', 'F', 'N', or undefined
 */
export function getFallbackGender(species: string): 'M' | 'F' | 'N' | undefined {
  if (!species) {
    return undefined;
  }
  
  // First check if it's a gendered form variant
  const genderedFormGender = getGenderedFormGender(species);
  if (genderedFormGender) {
    return genderedFormGender;
  }
  
  // Extract base species name (remove form suffix for checking)
  // e.g., "Rotom-Wash" -> "Rotom", but keep full name for gendered forms
  const baseSpecies = species.split('-')[0];
  
  // Check female-locked (check both full name and base)
  if (isFemaleLocked(species) || isFemaleLocked(baseSpecies)) {
    return 'F';
  }
  
  // Check genderless (check both full name and base)
  if (isGenderless(species) || isGenderless(baseSpecies)) {
    return 'N';
  }
  
  // Default to male as baseline
  return 'M';
}
