/**
 * Type-Changing Abilities (Type Matchup - Offensive Coverage)
 * Feeds hooks/useTeamMoveTypes.ts: before a Pokemon's damaging move types are
 * fed into utils/typeCoverage.ts's coverage calc, each move's type is
 * checked against the Pokemon's equipped ability
 * (`ImportedPokemonInfo.showdownData.ability` - always known for a saved
 * team, unlike Battle Logger's revealed/unrevealed opponent-ability
 * distinction) for a possible override.
 *
 * Three ability shapes exist:
 * - Normal-move converters (Pixilate/Aerilate/Refrigerate/Galvanize): only
 *   retype a move whose *own* type is Normal, to the ability's fixed type.
 * - Normalize: retypes every damaging move (any origin type) to Normal.
 * - Liquid Voice: retypes only sound-based moves (config/
 *   moveBlockingAbilities.ts's `SOUND_BASED_MOVES`, same Bulbapedia
 *   category - reused rather than duplicated) to Water.
 * All 6 also grant a 1.2x power boost in the current gen - not modeled here,
 * this table only feeds type *coverage*, not damage numbers.
 *
 * Deliberately excluded from all three rules: moves whose *effective* type
 * varies by user/field/held-item state but whose base PokeAPI type field
 * defaults to a fixed type (usually Normal) - Bulbapedia's Aerilate/
 * Pixilate/etc. pages all list the same exclusion set. Applying the ability
 * naively here would show these as permanently retyped instead of their real
 * conditional type, which this app's move data (one fixed type per move)
 * can't represent anyway. Also excluded, for the same "can't represent it"
 * reason and not introduced by this change: Tera Blast/a Pokemon's Tera
 * Type generally - this coverage tool doesn't factor Tera typing into
 * offensive *or* defensive coverage at all yet, a pre-existing gap. Moves
 * that call another random move (Metronome, Assist, Copycat, Mirror Move,
 * Sleep Talk) keep their own listed type rather than the called move's -
 * same reasoning, out of scope.
 */

import { SOUND_BASED_MOVES } from './moveBlockingAbilities';

export type TypeChangeRule =
  | { kind: 'from-normal'; toType: string }
  | { kind: 'all-to-normal' }
  | { kind: 'sound-to-water' };

const TYPE_CHANGING_ABILITIES: Record<string, TypeChangeRule> = {
  'pixilate': { kind: 'from-normal', toType: 'fairy' },
  'aerilate': { kind: 'from-normal', toType: 'flying' },
  'refrigerate': { kind: 'from-normal', toType: 'ice' },
  'galvanize': { kind: 'from-normal', toType: 'electric' },
  'normalize': { kind: 'all-to-normal' },
  'liquid-voice': { kind: 'sound-to-water' },
};

// Bulbapedia's "moves whose type changes" list, intersected with the moves that would otherwise
// default to Normal (or, for Weather Ball, always be caught by Normalize) in this app's static
// move data - see file header.
const VARIABLE_TYPE_MOVES = new Set([
  'aura wheel', 'ivy cudgel', 'judgment', 'multi-attack', 'natural gift', 'raging bull',
  'revelation dance', 'techno blast', 'terrain pulse', 'weather ball', 'tera blast',
]);

const SOUND_BASED_MOVES_LOWER = new Set(SOUND_BASED_MOVES.map(m => m.toLowerCase()));

function toSlug(ability: string): string {
  return ability.toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * The type a move actually hits with once its user's ability is factored in.
 * Falls back to `baseType` unchanged for any species without a type-changing
 * ability, or for a move this table deliberately excludes (see header).
 */
export function getEffectiveMoveType(moveName: string, baseType: string, ability: string | undefined): string {
  if (!ability) return baseType;
  const rule = TYPE_CHANGING_ABILITIES[toSlug(ability)];
  if (!rule) return baseType;
  if (VARIABLE_TYPE_MOVES.has(moveName.trim().toLowerCase())) return baseType;

  switch (rule.kind) {
    case 'from-normal':
      return baseType === 'normal' ? rule.toType : baseType;
    case 'all-to-normal':
      return 'normal';
    case 'sound-to-water':
      return SOUND_BASED_MOVES_LOWER.has(moveName.trim().toLowerCase()) ? 'water' : baseType;
  }
}
