/**
 * typeCoverage.ts - Team-Wide Offensive/Defensive Type Coverage Matrices
 * Pure functions over config/typeEffectiveness.ts's existing chart - per-team
 * aggregation for the Type Matchup page's two coverage tables
 * (components/typematchup/). Defensive coverage additionally consults
 * config/typeImmunityAbilities.ts (Levitate/Water Absorb/etc.) via
 * `getDefensiveMultiplier`, mirroring how offensive coverage already
 * accounts for type-changing abilities upstream in hooks/useTeamMoveTypes.ts
 * before the move types it passes in here.
 *
 * Also exports `slotResistsThreat`, a single-slot-vs-many-types resist check
 * built on the same `getDefensiveMultiplier` - used by SpeedTiersPage.tsx's
 * "Threats Only" checkbox (moved here from the now-removed usageThreats.ts
 * when Type Matchup Rework retired its Team Gap Analysis panel in favor of
 * CoverageGapsPanel.tsx's per-type shared-weakness/resistance view).
 *
 * `resolveDefensiveSlot` (Type Matchup Rework Leg 3, see COMPLETED.md) overrides a
 * `DefendingSlot` with an active Mega form's own typing/ability -
 * `@smogon/calc`'s species dex (`gen.species.get`) is the only source in this
 * codebase for a Mega form's types (PokeAPI has no entry for them - see
 * hooks/useMegaSprite.ts's header), the same source SpeedTiersPage.tsx
 * already reads its own Mega roster rows' types from.
 */

import type { Generation } from '@smogon/calc/dist/data/interface';
import { toID } from '@smogon/calc';
import { ALL_TYPES, getEffectivenessMultiplier } from '../config/typeEffectiveness';
import { getImmuneTypes } from '../config/typeImmunityAbilities';
import { resolveActiveAbility } from '../config/megaAbilities';

export interface DefendingSlot {
  types: string[];
  /** Equipped ability (ShowdownPokemon.ability) - checked for a full-immunity override (Levitate/Water Absorb/etc - see config/typeImmunityAbilities.ts) before falling back to raw type effectiveness. */
  ability?: string;
}

export interface CoverageRow {
  type: string;
  /** One entry per team slot, parallel to the pokemon array the caller passed in. null = no data for that slot (offensive only - a pokemon with no damaging moves at all). */
  cells: (number | null)[];
  /** Count of slots landing on the "bad" side of neutral for this row's type - Not Very Effective/immune (offense) or Weak (defense). */
  unfavorableCount: number;
  /** Count of slots landing on the "good" side of neutral - Super Effective (offense) or Resist/immune (defense). */
  favorableCount: number;
}

/**
 * For each of the 18 types, the best (max) effectiveness each team member's
 * damaging moves would achieve against a hypothetical mono-type defender of
 * that type - i.e. "can this team hit a Fire-type opponent hard?" Status
 * moves are the caller's responsibility to have already filtered out (see
 * hooks/useTeamMoveTypes.ts), since a move with no damage class doesn't
 * meaningfully "hit" anything.
 */
export function computeOffensiveCoverage(moveTypesByPokemon: string[][]): CoverageRow[] {
  return ALL_TYPES.map((type) => {
    const cells = moveTypesByPokemon.map((moveTypes) =>
      moveTypes.length === 0
        ? null
        : Math.max(...moveTypes.map((mt) => getEffectivenessMultiplier(mt, [type]))),
    );
    return {
      type,
      cells,
      unfavorableCount: cells.filter((c) => c !== null && c < 1).length,
      favorableCount: cells.filter((c) => c !== null && c > 1).length,
    };
  });
}

/**
 * The effectiveness of an attacking type against one defending slot, after
 * checking the slot's own ability for a full-immunity override (Levitate
 * vs. Ground, Water Absorb vs. Water, etc. - see
 * config/typeImmunityAbilities.ts) - falls back to the raw type-chart
 * multiplier when the ability grants no override for this specific
 * attacking type.
 */
export function getDefensiveMultiplier(
  attackingType: string,
  defendingTypes: string[],
  ability?: string,
): number {
  if (getImmuneTypes(ability).includes(attackingType)) return 0;
  return getEffectivenessMultiplier(attackingType, defendingTypes);
}

/**
 * For each of the 18 attacking types, how each team member's own (1-2) types
 * (and equipped ability, for a full-immunity override) take that hit - i.e.
 * the team's shared weaknesses/resistances.
 */
export function computeDefensiveCoverage(defenders: DefendingSlot[]): CoverageRow[] {
  return ALL_TYPES.map((type) => {
    const cells = defenders.map((d) => getDefensiveMultiplier(type, d.types, d.ability));
    return {
      type,
      cells,
      unfavorableCount: cells.filter((c) => c !== null && c > 1).length,
      favorableCount: cells.filter((c) => c !== null && c < 1).length,
    };
  });
}

/**
 * Whether one team slot resists or is immune to every one of a set of
 * attacking types - i.e. its best (max) effectiveness against that slot is
 * < 1. Same Math.max(...) pattern computeOffensiveCoverage uses. Used by
 * SpeedTiersPage.tsx's "Threats Only" checkbox (the resist check only, not
 * a full ranked-usage-threat computation).
 */
/**
 * Overrides `base` with an active Mega form's own types/ability - unchanged
 * when `activeMegaSlug` is null (no active Mega toggle for this slot, or a
 * stat-only forme like Aegislash Blade/Shield, which never touches typing or
 * ability - see EditablePokemonCore.tsx). Falls back to `base.types` when
 * `gen.species.get` has no entry for the slug (not yet released on
 * @smogon/calc's bundled dex), same "never a broken result" tolerance
 * useMegaSprite.ts's sprite/stat lookups already get.
 */
export function resolveDefensiveSlot(
  gen: Generation,
  base: DefendingSlot,
  activeMegaSlug: string | null,
): DefendingSlot {
  if (!activeMegaSlug) return base;
  const megaTypes = gen.species.get(toID(activeMegaSlug))?.types;
  return {
    types: megaTypes ? [...megaTypes] : base.types,
    ability: resolveActiveAbility(activeMegaSlug, base.ability),
  };
}

export function slotResistsThreat(threatTypes: string[], defender: DefendingSlot): boolean {
  return (
    Math.max(
      ...threatTypes.map((t) => getDefensiveMultiplier(t, defender.types, defender.ability)),
    ) < 1
  );
}
