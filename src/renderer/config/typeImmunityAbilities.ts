/**
 * Type-Immunity Abilities (Team Gap Analysis - Defensive Coverage)
 * Feeds utils/typeCoverage.ts's `getDefensiveMultiplier` (consumed by both
 * `computeDefensiveCoverage` and utils/usageThreats.ts's
 * `computeUsageThreats`): before either checks an attacking type against a
 * team slot's own types, the slot's actual equipped ability
 * (`ImportedPokemonInfo.showdownData.ability` - always known for a saved
 * team) is checked for a full-immunity override. Defensive-side counterpart
 * to config/typeChangingAbilities.ts's role on the offensive side (see
 * hooks/useTeamMoveTypes.ts) - same "ability consulted alongside raw type
 * data" shape, just nullifying a matchup instead of retyping a move.
 *
 * Only full immunities (effectiveness -> 0) belong here. Partial-resistance-
 * only abilities (Thick Fat halving Fire/Ice, Purifying Salt halving Ghost)
 * don't nullify a type and stay out of scope, and so does Dry Skin's OTHER
 * half (1.25x extra damage taken from Fire) - it's listed below for its
 * Water immunity only.
 *
 * Deliberately excluded, real type/move immunities that don't fit an
 * ability -> type(s) shape (same exclusions config/moveBlockingAbilities.ts
 * already documents for its own, Battle-Logger-scoped copy of this same
 * ability family - kept separate rather than shared, see TODO.md):
 * - Wonder Guard: immune to anything not super-effective, keyed off a
 *   computed multiplier rather than a fixed type list.
 * - Wind Rider, Overcoat, Bulletproof, Soundproof: immune to a move-flag
 *   category (wind/powder/ball-and-bomb/sound), not a whole attacking type -
 *   can't be expressed as "immune to type X", and this app's type-coverage
 *   tools only ever reason about types, never individual moves.
 * - Telepathy: immune to an ally's move specifically, not an opposing
 *   attacker's - irrelevant to a team's defending-type profile.
 */

export const TYPE_IMMUNITY_ABILITIES: Record<string, string[]> = {
  'levitate': ['ground'],
  'earth-eater': ['ground'],
  'flash-fire': ['fire'],
  'well-baked-body': ['fire'],
  'volt-absorb': ['electric'],
  'lightning-rod': ['electric'],
  'motor-drive': ['electric'],
  'water-absorb': ['water'],
  'dry-skin': ['water'],
  'storm-drain': ['water'],
  'sap-sipper': ['grass'],
};

function toSlug(ability: string): string {
  return ability.toLowerCase().trim().replace(/\s+/g, '-');
}

/** The type(s) a Pokemon's own ability fully nullifies incoming damage from, or [] if none/unknown. */
export function getImmuneTypes(ability: string | undefined): string[] {
  if (!ability) return [];
  return TYPE_IMMUNITY_ABILITIES[toSlug(ability)] ?? [];
}
