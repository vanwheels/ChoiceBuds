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

## Current Milestone: Speed Calc-like Feature

Scoping resolved 2026-09-09 — see
[docs/investigations/speed-calc-scope.md](docs/investigations/speed-calc-scope.md)
for the full design-questions pass. Its "team-anchored threat list, not a
vgcmulticalc reskin" differentiation call was itself reversed the same day
by Leg 8 — see
[docs/investigations/speed-tiers-full-roster-pivot.md](docs/investigations/speed-tiers-full-roster-pivot.md).
Legs 1-5 and 8 are done — see `COMPLETED.md` (Leg 3's row-list shell was
shipped, then redone by Leg 4, then Leg 4's own data source superseded by
Leg 8). Legs below are a tentative breakdown, not yet started.

- **[Live Calc → Speed Tiers Tie-in] — Leg 6** *(Last touched: 2026-09-09 ·
  Re-checks: 0)*
  Its prerequisite (Live Calc Speed Inference Engine) shipped — see
  `COMPLETED.md` — so `useLiveCalc.ts`'s `inference.speedBound` now exists
  and this leg is unblocked. Wire that `speedBound` to override/annotate the
  matching threat's generic usage-based speed entry in the tiers view.
  Wiring mechanism (shared state vs. explicit "send to Speed Tiers" action)
  still open — not resolved by the prerequisite leg, deferred to this leg's
  own build session same as originally scoped. Targets Leg 8's
  full-regulation-roster data shape, not Leg 3/4's.

- **[Speed Tiers Verification Pass] — Leg 7** *(Last touched: 2026-09-09 ·
  Re-checks: 0)*
  Live `run-desktop` pass once Legs 2 and 6 are built (Leg 5 shipped — see
  `COMPLETED.md`), same shape as the Live Calc milestone's own verification
  leg. Leg 8's own scope (full-regulation roster + Mega forms + dense grid,
  including its same-day follow-up fixes) is already manually verified live
  by Vanny — not via `run-desktop`, but confirmed working after the
  self-healing initial-sync fix backfilled the roster. This leg is about
  Legs 2/6 specifically, plus a from-scratch `run-desktop` pass over the
  whole page once Leg 6 exists, not re-verifying Leg 8 again.

- **[Speed Tiers "Threats Only" Toggle] — Leg 9** *(Last touched: 2026-09-09
  · Re-checks: 0)*
  Deferred out of Leg 8's full-regulation-roster pivot at Vanny's own call —
  a future optional toggle to narrow the default all-regulation view down to
  Team Gap Analysis-style typing threats (`usageThreats.ts::computeUsageThreats`),
  alongside the All/Top 60/Top 120 usage-rank toggle Leg 8 already built.
  Theoretical/deferred, so explicitly not the default. Unscoped beyond that.

- **[Speed Tiers Per-Spread Value Placement Bug] — Leg 10** *(Last touched:
  2026-09-09 · Re-checks: 0)*
  Reported live 2026-09-09: when a threat has multiple ranked usage spreads,
  their entries render bundled under one (the highest) speed tier instead of
  each landing at its own computed speed. `speedTierList.ts::buildSpeedTierEntries`
  already builds one row per spread using that spread's own computed `speed`
  (via `speedTiers.ts::computeThreatSpeedProfile`, which feeds each spread's
  own `points` table into `finalSpeed`), and `groupSpeedTiers` groups purely
  by that `speed` value — the pipeline looks correct on paper, so root cause
  is unconfirmed. Needs a live `run-desktop` repro against real usage data to
  check whether per-spread speed is actually varying, or collapsing to one
  value somewhere upstream (a spread's reported nature not being applied,
  only `points` — see `computeThreatSpeedProfile`'s `baseState()` call, which
  doesn't set `nature` per spread).

- **[Speed Tiers Usage Threshold Control] — Leg 11** *(Last touched:
  2026-09-09 · Re-checks: 0)*
  Requested live 2026-09-09: a user-adjustable minimum usage % for a spread
  to get its own plotted row, replacing the fixed `SPREAD_USAGE_CUTOFF_PERCENT
  = 10` constant in `speedTierList.ts`. Default to 25%, adjustable in 10%
  increments. UI placement TBD — likely alongside the existing All/Top
  60/Top 120 `rosterScope` toggle in `SpeedTiersPage.tsx`/`SpeedTierFieldPanel.tsx`.

- **[Speed Tiers "Bounds Only" Toggle] — Leg 12** *(Last touched: 2026-09-09
  · Re-checks: 0)*
  Requested live 2026-09-09: a toggle to show only each threat's 3 fixed
  min/neutral/max bound rows (`ThreatSpeedBounds`), suppressing usage-based
  spread rows entirely. Distinct from Leg 9's "Threats Only" toggle (narrows
  the species list, not the row types) and Leg 11's threshold control (tunes
  the spread cutoff, doesn't remove spread rows outright).

- **[Speed Tiers Mega Sprite Fallback] — Leg 13** *(Last touched: 2026-09-09
  · Re-checks: 0)*
  Reported live 2026-09-09: Mega-form rows render with the base species'
  sprite instead of the Mega form's own, hurting visual clarity in the dense
  grid. `SpeedTiersPage.tsx`'s `rosterCandidates` builder falls back to
  `dbEntry.spriteUrl` whenever `getCachedMegaSprite(megaName)` misses
  (`spriteUrl: megaSprite?.spriteUrl ?? dbEntry.spriteUrl`) — needs checking
  whether `useInitialSync`'s bulk Mega-sprite prefetch actually covers every
  roster Mega candidate, or whether this needs its own on-demand fetch
  (`useMegaSprite`) rather than relying purely on the prefetch cache.

- **[Speed Tiers Trick Room Sort-Order Bug] — Leg 14** *(Last touched:
  2026-09-09 · Re-checks: 0)*
  Reported live 2026-09-09: with the Trick Room toggle active (slowest-first
  sort), the fastest entry on the grid (Mega Raichu, 200 Speed) renders as
  the very first tile instead of last/near-last — the row also visually
  mirrors itself (descends then re-ascends back up to 200) rather than
  monotonically increasing. Possibly the same root cause as Leg 10's
  bundling bug, possibly its own issue in `groupSpeedTiers`
  (`speedTierList.ts`) or however `SpeedTierList.tsx` lays groups out into
  the grid — not investigated yet, explicitly deferred per Vanny at report
  time.

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

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

- **[Speed Tiers Preview Strip: Save Override to Team] — Leg 1** *(Last
  touched: 2026-09-09 · Re-checks: 0)*
  Follow-up to Speed Tiers Team Preview Strip (Leg 5, shipped — see
  `COMPLETED.md`): an explicit "save this edit to the team" action that
  would write a session-only SP/nature/form override made in that strip
  back through the real Team Builder commit path. Deliberately not built
  as part of Leg 5 — Vanny flagged it as a future option only when scoping
  that leg. Needs its own scoping pass now that the override UI shape
  actually exists to hang a "save" action off of.

- **[Reg M-C Z-A-Exclusive Movepool Audit] — Leg 1** *(Last touched:
  2026-09-09 · Re-checks: 0)*
  Deferred out of Regulation M-C Prep's Leg 2 (see COMPLETED.md/postmortem)
  rather than forced into that pass. Whether Rillaboom/Baxcalibur/Salamence
  gained any Legends Z-A-exclusive moves PokeAPI's Gen 9 SV learnset
  pipeline wouldn't surface on its own is still unconfirmed — a spot
  WebFetch against Serebii's per-species pages couldn't reliably tell
  genuinely-new moves apart from existing ones it just flagged as
  "unusual." Needs the app's own live-PokeAPI `hasChampionsMoveData` audit
  methodology (`config/championsMovepoolChanges.ts`'s header) applied to
  these 3 species specifically, not a Serebii read. Golisopod (originally
  the 4th) is resolved — see COMPLETED.md's Champions M-C Balance Patch
  Corrections entry.

- **[UI Shift Assessment Sweep — Post Card UI Polish] — Leg 1** *(Last
  touched: 2026-09-08 · Re-checks: 0)*
  Continue scoping/assessing UI shifts and changes to the rest of the app,
  following on from the UI/UX Overhaul and Card UI Polish milestones (see
  `MILESTONES.md`). Open-ended — needs a pass identifying which
  screens/components haven't had a UI-focused pass yet before it turns
  into concrete legs.

- **[Team Gap Analysis: Usage Cutoff Tuning] — Leg 1** *(Last touched:
  2026-09-08 · Re-checks: 0)*
  From Team Gap Analysis Re-evaluation's scoping pass (see `COMPLETED.md`).
  `USAGE_THREAT_RANK_CUTOFF = 50` (`utils/usageThreats.ts`) is a hand-picked
  constant, flagged as unmeasured in its own code comment. Not actionable
  yet - needs real ladder-usage volume/distribution to be visible live
  first; revisit once that data exists rather than re-checking this item on
  a schedule.

## Future Milestones (unscheduled)

