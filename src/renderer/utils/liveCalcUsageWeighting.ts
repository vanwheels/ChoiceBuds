/**
 * Live Calc Usage-Data-Backed Inference - Leg 1: a pure post-processing pass
 * that layers Pokemon Champions ranked-ladder usage data
 * (`ChampionsUsageEntry`, `services/championsBattleData.ts`) over an
 * already-computed `LiveCalcInference`, mirroring `liveCalcSpeedEngine.ts`'s
 * own "takes an inference, returns an updated copy" layering shape rather
 * than folding into `liveCalcEngine.ts`'s per-observation scanning. See
 * docs/investigations/live-calc-usage-weighted-inference-scope.md for the
 * resolved design questions this implements - only `applyUsageWeighting()`'s
 * mechanism below, not any change to the underlying physical-feasibility
 * math those observations already narrowed.
 *
 * Scoped to the nature/ability/item axes only this leg - stat-spread usage
 * (`ChampionsUsageEntry.statSpreads`) has no resolved single-axis mapping yet
 * (see the scope doc's "Not in scope" section) and is left to a future leg.
 *
 * ## Mechanism (per-axis, all three run identically via `rankCandidates()`)
 * - **"Near-0% usage" = absent from that species' ranked rows entirely.** A
 *   physically-feasible candidate (already surviving in `natureCandidates`/
 *   `abilityCandidates`/`itemCandidates`) that doesn't appear in the matching
 *   `usage.natures`/`.abilities`/`.items` array at all is filtered out of
 *   that axis's `*UsageCandidates` view - not an arbitrary percentage cutoff.
 *   Anything present, however low its percentage, is kept and ranked by it.
 * - **Never produce an empty axis.** If every remaining candidate on an axis
 *   has zero ladder usage (the whole real answer is off-meta), the filter is
 *   skipped for that axis on this call - it falls back to the full
 *   candidate list, unranked (percentage 0 for all), same "don't assert a
 *   result you can't back up, but never show nothing" pattern
 *   `inferDefenderStats()`'s own comments already use for contradictions.
 * - **A locked axis is never weighted** - not by any special-case check
 *   here, but structurally: `inferDefenderStats()` already collapses a
 *   locked axis's candidate list to the one confirmed value before this pass
 *   ever runs, so ranking "a list of one" trivially reproduces that same
 *   single value (at its own usage % if present, or unranked via the
 *   never-empty-axis fallback if not) - there's nothing for usage data to
 *   add or remove either way.
 * - Name matching uses `normalizeSlug()` (same helper `useGameData.ts`'s own
 *   usage-based move/ability sort already uses) rather than exact string
 *   equality, so incidental case/whitespace differences between a ranked
 *   entry's `name` and a candidate string never cause a false "absent from
 *   the ladder" filter.
 * - `NO_ITEM` ('None', the no-held-item sentinel) is matched the same way as
 *   any other item candidate - the ranked-ladder API's `items` rows are real
 *   held items, so `None` only ever survives via the never-empty-axis
 *   fallback unless the API itself ever adds an explicit no-item row. Not
 *   special-cased, since the scope doc doesn't call for one.
 */

import type { NatureName } from '@smogon/calc/dist/data/interface';
import { normalizeSlug } from './pokemonRules';
import type { ChampionsUsageEntry, ChampionsUsageRankedEntry } from '../types/gameData';
import type { LiveCalcInference, LiveCalcUsageRankedCandidate } from './liveCalcEngine';

/**
 * Ranks one axis's already-narrowed candidate list against a Champions
 * ranked-ladder category (`usage.natures`/`.abilities`/`.items`) - see this
 * file's header for the exact filter/rank/fallback rules. Generic over the
 * candidate value type so callers keep `NatureName` typing rather than
 * widening to a bare `string`.
 */
function rankCandidates<T extends string>(
  candidates: T[],
  ranked: ChampionsUsageRankedEntry[],
): LiveCalcUsageRankedCandidate<T>[] {
  if (candidates.length === 0) return [];
  const percentageBySlug = new Map(ranked.map(entry => [normalizeSlug(entry.name), entry.percentage]));
  const withUsage = candidates
    .map(value => ({ value, percentage: percentageBySlug.get(normalizeSlug(value)) }))
    .filter((c): c is { value: T; percentage: number } => c.percentage !== undefined);
  // Never-empty-axis fallback: nothing on this axis has any ladder usage at
  // all - skip the filter and fall back to the full candidate list, unranked.
  if (withUsage.length === 0) return candidates.map(value => ({ value, percentage: 0 }));
  return withUsage.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Fills `inference`'s `natureUsageCandidates`/`abilityUsageCandidates`/
 * `itemUsageCandidates` from `usage`, leaving every other field (including
 * the base `natureCandidates`/`abilityCandidates`/`itemCandidates` these are
 * derived from) untouched. Intended as the LAST pass in `useLiveCalc.ts`'s
 * pipeline, run after `inferDefenderStats()`/`inferDefenderSpeed()`/
 * `inferOpponentOffensiveStats()` have already produced their final
 * narrowed candidate lists for this recompute.
 *
 * `usage: null` (no Champions ranked-ladder page for this species at all,
 * `getChampionsUsage()`'s own resolved value in that case) is a full no-op:
 * every axis's usage view becomes an unranked mirror of its base candidates,
 * identical to `defaultInference()`'s own initial seeding - i.e. every axis
 * behaves exactly as it does today, unranked and unfiltered.
 */
export function applyUsageWeighting(inference: LiveCalcInference, usage: ChampionsUsageEntry | null): LiveCalcInference {
  if (!usage) {
    return {
      ...inference,
      natureUsageCandidates: inference.natureCandidates.map(value => ({ value, percentage: 0 })),
      abilityUsageCandidates: inference.abilityCandidates.map(value => ({ value, percentage: 0 })),
      itemUsageCandidates: inference.itemCandidates.map(value => ({ value, percentage: 0 })),
    };
  }

  return {
    ...inference,
    natureUsageCandidates: rankCandidates<NatureName>(inference.natureCandidates, usage.natures),
    abilityUsageCandidates: rankCandidates(inference.abilityCandidates, usage.abilities),
    itemUsageCandidates: rankCandidates(inference.itemCandidates, usage.items),
  };
}
