/**
 * Curated fallback descriptions for moves whose PokeAPI `effect_entries` are
 * empty/missing in English, so `pokeapiService.ts::extractEffectDescription`
 * would otherwise fall back to its generic "No description available" text.
 * All 52 entries are Scarlet/Violet-native (Gen 9) moves - PokeAPI's
 * effect-text backfill is hand-written per move and still catching up on
 * them as of the audit that produced this list (2026-10-24, see
 * docs/investigations/missing-move-ability-descriptions.md for the full
 * gap list and methodology).
 *
 * Hand-authored from Bulbapedia/Serebii's move pages per
 * .claude/rules/external-data-sources.md's exception #2 (manual research ->
 * static config), not fetched live. These are mainline-SV move effects, not
 * a Champions balance difference, so this table is separate from
 * championsMoveOverrides.ts and applies regardless of mode.
 *
 * Applied at the read boundary in useGameData.ts (getCachedMove and the
 * fresh-fetch path), same self-healing precedent as
 * championsMoveOverrides.ts/championsAbilityOverrides.ts - so this
 * self-heals against move data already sitting in a user's
 * (NEVER_EXPIRES) game-data-cache.json without needing a cache-version
 * bump, and any future correction here takes effect immediately.
 */

import { normalizeNameForAPI } from '../services/pokeapiService';

export const MISSING_MOVE_DESCRIPTIONS: Record<string, string> = {
  'alluring-voice': 'Confuses the target if its stats were boosted this turn.',
  'aqua-cutter': 'Has a high critical-hit ratio. Considered a slicing move.',
  'aqua-step': "Raises the user's Speed by 1 stage.",
  'armor-cannon': "Lowers the user's Defense and Sp. Def by 1 stage each.",
  'axe-kick':
    'Has a 30% chance to confuse the target. If it misses, the user takes damage equal to half its max HP.',
  'barb-barrage':
    'Has a 50% chance to poison the target. Power doubles if the target is already poisoned.',
  'bitter-blade': 'User recovers up to half the HP dealt in damage.',
  'bitter-malice': "Lowers the target's Attack by 1 stage.",
  'ceaseless-edge':
    "Considered a slicing move. Leaves a layer of Spikes on the target's side when it hits.",
  'chilling-water': "Lowers the target's Attack by 1 stage.",
  'chilly-reception': 'User switches out after summoning a 5-turn snowstorm.',
  comeuppance:
    'Deals damage back at 1.5x the damage the user took from the last move that hit it this turn.',
  'double-shock':
    'User loses its Electric typing after attacking. Can only be used by an Electric-type Pokémon.',
  'electro-shot':
    "Charges on the first turn, raising the user's Sp. Atk by 1 stage, then attacks on the second; attacks immediately in rain.",
  'fickle-beam': 'Has a 30% chance to double its power.',
  'flower-trick': 'Never misses and always results in a critical hit.',
  'gigaton-hammer': 'Cannot be used twice in a row.',
  'glaive-rush':
    "Until the user's next turn, it takes double damage and attacks on it cannot miss.",
  'hard-press': 'Power rises the more HP the target has remaining.',
  'headlong-rush': "Lowers the user's Defense and Sp. Def by 1 stage each.",
  'ice-spinner': 'Removes the terrain on the field.',
  'infernal-parade':
    'Has a 30% chance to burn the target. Power doubles if the target has a status condition.',
  'jet-punch': 'Usually goes first (priority +1).',
  'kowtow-cleave': 'Never misses.',
  'last-respects': "Power increases for each fainted ally in the user's party.",
  'lumina-crash': "Lowers the target's Sp. Def by 2 stages.",
  'matcha-gotcha':
    'User recovers up to half the HP dealt in damage. Has a 20% chance to burn the target.',
  'mortal-spin':
    "Removes binding moves, Leech Seed, and most hazards from the user's side, and poisons the target.",
  'mountain-gale': 'Has a 30% chance to make the target flinch.',
  'population-bomb': 'Hits 1-10 times in a row.',
  pounce: "Lowers the target's Speed by 1 stage.",
  'psychic-noise': 'Prevents the target from recovering HP for 2 turns.',
  'psyshield-bash': "Raises the user's Defense by 1 stage.",
  'raging-bull':
    "Removes the effect of Light Screen, Reflect, and Aurora Veil on the target's side. Type depends on the user's form.",
  'raging-fury': 'User rampages for 2-3 turns, then becomes confused.',
  'revival-blessing': 'Revives a fainted party Pokémon and restores half its max HP.',
  'shed-tail':
    'User creates a Substitute (with 1/4 its max HP) at the cost of half its own max HP, then switches out.',
  shelter: "Sharply raises the user's Defense by 2 stages.",
  snowscape: 'Summons a snowstorm for 5 turns.',
  'spicy-extract':
    "Sharply raises the target's Attack by 2 stages and sharply lowers its Defense by 2 stages.",
  'stone-axe': "Considered a slicing move. Scatters Stealth Rock-like stones on the target's side.",
  'supercell-slam': 'If it misses, the user takes damage equal to half its max HP.',
  'syrup-bomb': "Lowers the target's Speed by 1 stage each turn for 3 turns.",
  'temper-flare': "Power doubles if the user's previous move failed.",
  'tera-blast':
    "Uses the user's Tera type if Terastallized, hitting with whichever of Attack or Sp. Atk is higher. If Terastallized to Stellar type, power rises to 100, it's super effective against Terastallized targets, and lowers the user's Attack and Sp. Atk by 1 stage.",
  'tidy-up':
    "Removes Spikes, Stealth Rock, Sticky Web, Toxic Spikes, and Substitute from both sides, then raises the user's Attack and Speed by 1 stage each.",
  'torch-song': "Raises the user's Sp. Atk by 1 stage.",
  trailblaze: "Raises the user's Speed by 1 stage.",
  'triple-arrows':
    "Has a high critical-hit ratio, a 50% chance to lower the target's Defense by 1 stage, and a 30% chance to make it flinch.",
  'twin-beam': 'Hits twice in one turn.',
  'upper-hand': 'Only works if the target is about to use a priority move; makes it flinch.',
  'wave-crash': 'User takes recoil damage equal to 1/3 the damage dealt.',
};

/** Applies the curated fallback only when PokeAPI gave us nothing usable. */
export function applyMissingMoveDescriptionFallback<
  T extends { name: string; description: string },
>(move: T): T {
  if (move.description !== 'No description available') return move;
  const fallback = MISSING_MOVE_DESCRIPTIONS[normalizeNameForAPI(move.name)];
  return fallback ? { ...move, description: fallback } : move;
}
