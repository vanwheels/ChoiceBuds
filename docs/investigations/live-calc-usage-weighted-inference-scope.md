# Live Calc: Usage-Data-Backed Inference — Scoping Session

Scoping pass done 2026-09-12, resolving `TODO.md`'s "Live Calc
Usage-Data-Backed Inference" item (raised by Vanny during Live Calc
Player/Opponent Card Redesign's own scoping — see
`live-calc-card-redesign-scope.md`'s "Not in scope" section for the original
open question). Resolves into the legs now sitting under `TODO.md`'s Current
Milestone section.

## The core model shift

`liveCalcEngine.ts` is today a purely deterministic elimination engine: every
nature/ability/item candidate is boolean feasible-or-not against the logged
observations, and the running result is whatever survived — there's no
concept of "more likely." Vanny's call: make Pokemon Champions ranked-ladder
usage data (`services/championsBattleData.ts`, already wired into
`CalcPokemonPanel`'s Player-side auto-fill via `useGameData().getChampionsUsage`)
a real second input to that narrowing, not just a one-time auto-fill
suggestion the way the Player panel uses it.

## Resolved (2026-09-12, Vanny's calls)

- **Usage informs the math itself, not just display order.** A candidate
  that's physically feasible (no observation contradicts it) can still be
  filtered out of the running candidate list on ladder-usage grounds alone.
  This is a real philosophy change from "physically consistent with
  everything logged so far" to "physically consistent AND plausible on the
  ladder" — see the safety valve below for why this doesn't mean a genuinely
  rare real build becomes unrepresentable.
- **Scope this leg to nature/ability/item only.** Those three map 1:1 onto
  `ChampionsUsageEntry.natures`/`.abilities`/`.items` the same way
  `CalcPokemonPanel`'s existing auto-fill already consumes them. Stat-spread
  usage (`ChampionsUsageEntry.statSpreads`) is full 6-stat combos, not the
  engine's own single-stat `defBound`/`spdBound`/`atkBound`/`spaBound` — there's
  no resolved answer yet for marginalizing a 6-stat ranked spread down to a
  single-axis usage weight, so that's deferred to its own future leg rather
  than solved here.
- **Usage ranking applies from species-select onward, not only once an
  observation exists.** Mirrors `CalcPokemonPanel`'s Player-side behavior:
  the moment an opponent species is picked, its candidate lists are already
  usage-ranked/filtered against the full unnarrowed pool, and real
  observations narrow from there the same as today.
- **Usage-filtered candidates are hidden by default, one toggle reveals the
  full physically-possible set.** Never a silent, permanent loss of a real
  possibility — just not the default view.

## Mechanism (this session's design proposal — implementation detail, not a
further open question)

- **"Near-0% usage" = absent from that species' ranked rows for the category
  entirely.** `championsBattleData.ts` already returns every value the
  ladder sample actually saw, ranked; a physically-feasible candidate that
  doesn't appear in `usage.natures`/`.abilities`/`.items` at all is what gets
  filtered, not an arbitrary percentage cutoff. Anything present, however low
  its percentage, is kept and ranked by it.
- **Never produce an empty axis.** If every physically-feasible candidate on
  an axis happens to have zero ladder usage (the whole real answer is
  off-meta), the filter is skipped for that axis on that call and it falls
  back to the full physically-feasible list, unranked — same "don't assert a
  result you can't back up, but never show nothing" pattern this file
  already uses for contradictions (`inferDefenderStats()`'s own comments).
- **No usage data for the species at all** (`getChampionsUsage` resolves
  `null` — no Champions page) **is a full no-op**: every axis behaves
  exactly as it does today, unranked and unfiltered.
- **A locked axis (`knownAbility`/`knownItem`/`knownNature`) is never
  weighted** — it's already collapsed to one confirmed value; usage has
  nothing to add there.
- **Applied as a separate post-processing pass over the already-computed
  `LiveCalcInference`, not folded into `feasibleSpRange()`'s per-observation
  scanning.** Keeps the physical-feasibility math (and this leg's
  out-of-scope SP-bound axes) completely untouched, and mirrors
  `liveCalcSpeedEngine.ts`'s existing layering shape (a pass that takes an
  inference and returns an updated copy). Concretely: `LiveCalcInference`
  gains three new "usage view" fields alongside the existing (unchanged)
  `natureCandidates`/`abilityCandidates`/`itemCandidates` arrays, so the
  reveal-all toggle still has the original full physically-feasible lists to
  show — the new fields are the usage-filtered+ranked subset, sorted
  most-used-first.

## Leg breakdown

- **Leg 1 — engine + hook plumbing, no UI.** New pure module
  (`utils/liveCalcUsageWeighting.ts` or similar) implementing the mechanism
  above over a `LiveCalcInference` + `ChampionsUsageEntry | null`; wired into
  `useLiveCalc.ts`'s existing recompute pipeline (which needs to fetch/cache
  the opponent species' usage via `useGameData().getChampionsUsage`, same
  path `CalcPokemonPanel` already uses). Own unit tests, mirroring
  `liveCalcEngine.test.ts`'s existing coverage shape. No component changes —
  the new fields exist on `LiveCalcInference` but nothing renders them yet.
- **Leg 2 — UI surfacing.** `LiveCalcCandidateGroup.tsx`/
  `LiveCalcDefenderPanel.tsx` render the usage-ranked/filtered view by
  default with percentage annotations, plus the reveal-all toggle back to
  the full physically-possible list.

## Not in scope

- Stat-spread/SP-bound usage weighting (the `statSpreads` 6-stat-combo
  mapping problem) — a future leg once there's a resolved answer for it.
- Doubles (2 simultaneously-unknown opponents) — already out of scope
  app-wide per `live-calc-layout-rework-scope.md`.
- Any change to the observation-scanning feasibility math itself
  (`feasibleSpRange()`/`feasibleOffensiveSpRange()`) — usage weighting is a
  candidate-list-level filter/rank applied after that math runs, never a new
  input to it.
