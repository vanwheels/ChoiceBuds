# ChoiceBuds TODO

Working task list for ongoing/planned work. Every item is titled
`[Item/Sweep Name] — Leg N` (say "Start [title]" to kick off a session on
it). Bodies stay short — commit-message-body length, not an investigation
log; deep cross-checks/history belong in `docs/investigations/<topic>.md`,
linked from the item. `Last touched` + `Re-checks` are tracked per item; no
status enum otherwise — absence of a `Blocked:` line means open. Blocked
items are exempt from the re-check counter and live in their own tier below
rather than mixed into the active list. This file adopted that format as of
2026-08-31 — all re-check counters started at 0 then regardless of how long
an item had been sitting. Reordered into priority order 2026-08-31; within
the current milestone and "Unscheduled", items are listed highest-to-lowest
priority. Only one milestone is "current" at a time — see root `CLAUDE.md`'s
Task Tracking rules for the full section-lifecycle (`## Current Milestone:
<name>` → `MILESTONES.md` + `COMPLETED.md` on ship). Finished work moves to
[COMPLETED.md](COMPLETED.md).

## Current Milestone: Maintenance & Investigation Sweep

Bundles the leftover items from the 2026-09-08 post-Card-UI-Polish scoping
pass that didn't resolve outright during scoping itself (two of the five
did - see COMPLETED.md's Mark-as-Checked-automation and EV-Grid-overflow
entries - and moved straight there instead of becoming legs here). Not
thematically unified beyond "small items to clear before Live Calc" - see
Future Milestones below for that one.

No active legs remain scheduled here right now - Partial/Scored Gaps (this
milestone's last scheduled leg) shipped, see `COMPLETED.md`. Flagging rather
than closing the milestone myself: the remaining Team Gap Analysis
Unscheduled items below (Re-confirm Typing-Only Scope, Usage Cutoff Tuning)
and the Move-Blocking Abilities/UI Shift Assessment items were never
explicitly pulled into this milestone's active legs, so whether this
milestone is actually done (vs. one of those getting pulled in next) is a
call for Vanny, not an assumption to make here.

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

- **[Regulation M-C Prep] — Leg 2** *(Last touched: 2026-09-08 · Re-checks:
  0)*
  Blocked: waiting on Reg M-C's actual 2026-09-08 6pm PST release and
  Serebii publishing its regulation/items pages — Leg 1 (roster/mega-stone/
  regulation-selector registration, see COMPLETED.md) was hand-curated
  ahead of release with no official source to check against yet.
  Workflow once the patch drops: full datamined info won't be out until
  end-of-week, so Vanny is feeding confirmed details in piecemeal as they
  land (same running-tally pattern as Leg 1) rather than waiting for one
  complete dump; treat each incoming batch as incremental manual
  population of the config files below, not a single re-verification pass.
  Once live: re-verify `utils/pokemonRules.ts`'s `REG_MC_ADDED_SPECIES` and
  `config/vgcData.ts`'s 6 new Mega Stones against Serebii's own Reg M-C
  pages (replacing the pre-release provenance notes in both files' headers
  with real citations, same as M-A/M-B); spot-check the 3 new ordinary Mega
  abilities (Baxcalibur/Golisopod/Salamence, currently sourced only from
  `@smogon/calc`'s bundled data with no second source) and the 3 Mega Z
  abilities (Absol/Garchomp/Lucario, user-confirmed but not yet
  cross-checked against a published source) in `config/megaAbilities.ts`;
  check whether Rillaboom/Baxcalibur/Salamence/Golisopod gained any Legends
  Z-A-exclusive moves PokeAPI's Gen 9 SV learnset pipeline wouldn't surface
  on its own (Leg 1 deliberately didn't chase this pre-release - see its
  COMPLETED.md entry); add `seasons.ts`'s M-6+ rows once M-C's season dates
  are known.

- **[Team Card Grid Layout Re-check] — Leg 1** *(Last touched: 2026-08-31 ·
  Re-checks: 0)*
  Blocked: waiting on the user to verify live on their physical MacBook —
  everything below was confirmed on a resized Electron window on the dev
  machine, not the actual hardware.
  Fixed and live-verified via `run-desktop` (added a `resize` command to
  `driver.mjs` — sets Electron's content size directly, matching what the
  renderer's CSS/`@container` actually measures). Root cause: not already
  fixed by the carousel rework — that rework is what introduced it.
  `TeamCard.tsx`'s 3-vs-6-column snap required a 1760px container (6*280px +
  5*1rem gaps), unreachable on any MacBook. First attempt (1100px, based on
  a theoretical estimate) still wasn't low enough — measured live at the
  reporter's actual conditions (14" MacBook, sidebar expanded, 2 real teams,
  single-column layout) the container only gets 1043px. Retuned to 1040px
  against that measured number; confirmed live it renders a clean 1x6 with
  no truncation at 1512x982/sidebar-expanded (screenshot:
  `.claude/skills/run-desktop/shots/06-fixed-1512-expanded-sidebar.png`).
  Doesn't cover a 13" MacBook (measured 818px there) — not this fix's
  target device. Also corrected a stale `TeamsPage.tsx` comment describing
  an auto-fill/minmax grid that no longer matches the real implementation.
  Ready to move to COMPLETED.md once the MacBook pass confirms it.

- **[In-App Auto-Update: macOS] — Leg 1** *(Last touched: not recorded ·
  Re-checks: 0)*
  Blocked: user needs a paid Apple Developer account ($99/yr) + notarization.
  Windows shipped in v0.2.1 (see COMPLETED.md). macOS is blocked: Squirrel.Mac
  (what `electron-updater` uses there) requires code signing to auto-update
  at all, and Gatekeeper heavily restricts unsigned builds regardless. Once
  unblocked, `registerAutoUpdater()`'s `process.platform !== 'win32'` guard
  in `main.ts` is the one line to revisit.
  - Separately, a paid Windows code-signing cert (~$100-400+/yr) isn't
    required for Windows auto-update to function, but would remove the
    SmartScreen warning — not yet decided.

- **[TypeScript 7 Upgrade] — Leg 1** *(Last touched: not recorded ·
  Re-checks: 0)*
  Blocked: waiting on real `typescript-eslint` 7.x support.
  `typescript-eslint` doesn't support TypeScript 7.0.2 yet (confirmed
  peer-range rejection + real runtime crash reports). Currently on
  TypeScript ^6.0.3.

## Unscheduled (not yet scoped, highest-to-lowest priority)

- **[UI Shift Assessment Sweep — Post Card UI Polish] — Leg 1** *(Last
  touched: 2026-09-08 · Re-checks: 0)*
  Continue scoping/assessing UI shifts and changes to the rest of the app,
  following on from the UI/UX Overhaul and Card UI Polish milestones (see
  `MILESTONES.md`). Open-ended — needs a pass identifying which
  screens/components haven't had a UI-focused pass yet before it turns
  into concrete legs.

- **[Team Gap Analysis: Re-confirm Typing-Only Scope] — Leg 1** *(Last
  touched: 2026-09-08 · Re-checks: 0)*
  From Team Gap Analysis Re-evaluation's scoping pass (see `COMPLETED.md`).
  `usageThreats.ts`'s typing-only scope (no speed/power/actual-offensive-
  answer consideration) is a deliberate, documented boundary in its own
  header comment, not an oversight - quick judgment call to re-confirm it's
  still the right call, not a code change. Not picked for the current
  milestone's active legs.

- **[Team Gap Analysis: Usage Cutoff Tuning] — Leg 1** *(Last touched:
  2026-09-08 · Re-checks: 0)*
  From Team Gap Analysis Re-evaluation's scoping pass (see `COMPLETED.md`).
  `USAGE_THREAT_RANK_CUTOFF = 50` (`utils/usageThreats.ts`) is a hand-picked
  constant, flagged as unmeasured in its own code comment. Not actionable
  yet - needs real ladder-usage volume/distribution to be visible live
  first; revisit once that data exists rather than re-checking this item on
  a schedule.

## Future Milestones (unscheduled)

- **Live Calc: Damage-Based Stat Inference Tab** — queued next, after
  Maintenance & Investigation Sweep ships. New "Live Calc" tab blending the
  existing damage calc with a fast inference mechanic: infer an opponent's
  likely stat spread/nature from what percentage of damage your own moves
  land on it. Deliberately not scoped past the concept yet — per Vanny
  (2026-09-08), the full design-questions pass (data model for observed
  damage rolls, how a "likely spread" narrows/displays as more data comes
  in, how it relates to the existing Calc tab's code path) is deferred to
  its own dedicated session when this milestone starts, rather than being
  squeezed in after the Maintenance & Investigation Sweep's items. Relevant
  prior art surfaced during that scoping pass: `_archived/battle-logger/
  utils/battleCalcReview.ts` reconstructs a Calc-page payload from logged
  battle state (the reverse direction from what Live Calc needs - known
  state → damage estimate, not observed damage → inferred state) but is
  useful reference for how field/side-condition state was modeled against
  `@smogon/calc`.
