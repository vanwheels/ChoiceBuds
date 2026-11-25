/**
 * Champions Regulation-Scoped Balance Patches
 *
 * The other Champions override tables (championsMoveOverrides.ts,
 * championsAbilityOverrides.ts, championsMovepoolChanges.ts) apply to every
 * regulation. That's right for launch-era corrections, but a balance patch
 * that ships alongside a new regulation must not leak back into older
 * regulations' calcs or team text (Vanny's rule, see
 * docs/investigations/reg-m-d.md §7). Entries here are tagged with the
 * regulation they start in and apply to that regulation and every later one
 * (ALL_REGULATION_IDS order).
 *
 * Applied by the same read-boundary helpers as the global tables, after
 * them, so a dated entry wins over a global one for the same field.
 * Movepool additions apply after every removal (global, gated and patch),
 * so a patch can re-grant a move an older table removes (Mr. Mime's Psych
 * Up in Reg M-D).
 *
 * Data only: the apply logic lives beside each global table, so tests can
 * mock this module with a test entry while exercising the real logic.
 */

import type { AbilityData } from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';
import type { ChampionsMoveOverride } from './championsMoveOverrides';

/** One dated change, effective from `since` onward. */
export interface DatedPatch<T> {
  since: RegulationId;
  change: T;
}

/** Keyed by normalized move slug (normalizeNameForAPI). */
export const CHAMPIONS_DATED_MOVE_PATCHES: Record<string, DatedPatch<ChampionsMoveOverride>[]> = {};

/** Keyed by normalized ability slug (normalizeNameForAPI). */
export const CHAMPIONS_DATED_ABILITY_PATCHES: Record<string, DatedPatch<Partial<AbilityData>>[]> =
  {};

/**
 * Keyed by the learnset's species slug (SpeciesLearnsetEntry.species), same
 * key as CHAMPIONS_PATCH_MOVEPOOL_REMOVALS. Each form with its own PokeAPI
 * slug (e.g. `rotom-heat`) needs its own row. Not gated on
 * hasChampionsMoveData: PokeAPI's tag snapshot predates any post-launch
 * patch, so it can't already contain these.
 */
export const CHAMPIONS_DATED_MOVEPOOL_ADDITIONS: Record<string, DatedPatch<string[]>[]> = {};
