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

Saved Builds Box shipped 2026-09-11 (all 8 legs - see `COMPLETED.md` and
`MILESTONES.md`). Building Flow Tweaks shipped 2026-09-11 (see
`COMPLETED.md` and `MILESTONES.md`).

## Current Milestone: Live Calc Tuning

Promoted 2026-09-11 from "Future Milestones" - the last of the four
2026-09-10-feedback-pass candidates, and the only one that wasn't already
drafted into legs at batching time (it went in as a bare "needs a lot of
tweaking" placeholder). Scoped 2026-09-11 after asking Vanny for the actual
specifics. All 3 scoped legs of Live Calc Page Layout & Function Rework
(Bidirectional Inference Engine, Opponent Panel & Reverse Observations,
Layout & Live Range Grid Rework) plus the earlier Known-Ability Lock and
Result Clarity Pass legs have now shipped - see `COMPLETED.md` - with only
the already-deferred Unscheduled items (popup launcher, Battle Log
auto-populate, doubles support) left underneath it. No further legs are
scoped right now; the milestone stays open per Vanny's explicit call rather
than being closed out here.

- **[Live Calc Feedback Pass 2] — Leg 4** *(Last touched: 2026-09-11 ·
  Re-checks: 0)*
  Feature-parity gap, sequenced last since it's additive scope rather than
  a fix. Live Calc still doesn't mirror the regular Calc page's fields per
  Vanny's earlier explicit ask - no way to set the opponent's status
  condition.

- **[Live Calc Feedback Pass 2] — Leg 5** *(Last touched: 2026-09-11 ·
  Re-checks: 0)*
  Data-correctness bug, found live-verifying Leg 3: Armor Tail doesn't show
  up as a candidate ability for Farigiraf in the Opponent panel. Root cause
  (not yet confirmed against Farigiraf specifically, but same shape as the
  already-fixed Mega-ability bug from Leg 1 - see `COMPLETED.md`):
  `useLiveCalc.ts`'s `defenderAbilityOptions` sources from
  `liveCalcEngine.ts::defaultInference()`'s `abilityCandidates`, which reads
  `gen.species.get(...).abilities` - `@smogon/calc`'s own bundled species
  data - rather than the app's PokeAPI + `config/championsAbilityOverrides.ts`
  pipeline (`useGameData`) the rest of the app treats as the real source of
  truth for per-species ability pools. Likely needs `defaultInference()`'s
  ability-candidate lookup rerouted through `useGameData`'s cached species
  data instead of `gen.species.get()` directly - scope that against a couple
  more known mismatched species before committing to the fix shape.

- **[Live Calc Feedback Pass 2] — Leg 6** *(Last touched: 2026-09-11 ·
  Re-checks: 0)*
  Found live-verifying Leg 3: Vanny flagged that Live Calc doesn't consider
  the defender's HP Stat Points at all. Confirmed this is Live Calc-specific,
  not a regression on the regular Calc page (there, `computeSideResults()`
  builds both Pokémon via `buildPokemon()`, which already feeds real HP SPs
  through `spsToEvs()` into `maxHP()`). Live Calc's own inference engine
  (`utils/liveCalcEngine.ts`) instead holds the unknown defender's HP SPs at
  a fixed `HP_SP_DEFAULT` (16, the midpoint) rather than solving for it
  jointly with the relevant defensive stat - this was an explicit, already-
  documented v1 approximation from `docs/investigations/
  live-calc-stat-inference-scope.md` (see this file's own header comment),
  not an oversight. Vanny is now asking to revisit that accepted tradeoff
  after live use rather than leave it as-is - needs a scoping pass on what
  "considering HP SP" should actually mean here (a wider/user-adjustable
  default? jointly narrowing HP alongside the defensive stat, the "hybrid
  brute-force pass" the scope doc already flagged as the eventual fix for
  this whole approximation category?) before it becomes a concrete leg.

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

- **[Live Calc Player/Opponent Card Redesign] — Leg 1** *(Last touched:
  2026-09-11 · Re-checks: 0)*
  Blocked: waiting on Vanny to send a mockup she's drawn for what the
  Attacker/Opponent panels should look like going forward, to discuss next
  session. Raised right after Leg 3's panel-mirroring pass, so likely
  supersedes some of that leg's layout choices once the mockup is in hand -
  don't treat Leg 3's field ordering/header shape as settled until this is
  resolved.

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

- **[Live Calc Battle Log Auto-Populate] — Leg 1** *(Last touched:
  2026-09-11 · Re-checks: 0)*
  Blocked: depends on Live Calc Global Popup Launcher existing first (this
  is specifically about auto-filling both sides from whatever's already
  selected when that popup is opened from inside an active Battle Log
  session). See `docs/investigations/live-calc-layout-rework-scope.md`.

## Unscheduled (not yet scoped, highest-to-lowest priority)

- **[Live Calc Global Popup Launcher] — Leg 1** *(Last touched: 2026-09-11 ·
  Re-checks: 0)*
  Raised alongside Live Calc Page Layout & Function Rework's scoping pass
  but explicitly deferred - a button reachable from anywhere in the app
  that pops Live Calc as an overlay, rather than only living as its own
  tab. Not scoped yet; revisit once that rework's 3 legs have shipped and
  settled. See `docs/investigations/live-calc-layout-rework-scope.md`.

- **[Live Calc Doubles Support] — Leg 1** *(Last touched: 2026-09-11 ·
  Re-checks: 0)*
  Raised alongside the same scoping pass - 2 simultaneously-unknown
  opponents plus ally-side interactions, on top of whatever singles model
  Live Calc Page Layout & Function Rework lands on. Not scoped; a real
  future need per Vanny, not this milestone. See
  `docs/investigations/live-calc-layout-rework-scope.md`.

- **[Reg M-C Z-A-Exclusive Movepool Audit] — Leg 1** *(Last touched:
  2026-09-10 · Re-checks: 1)*
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
  2026-09-10 re-check: live-queried PokeAPI directly for all 6 Reg M-C new
  species (rillaboom, baxcalibur, salamence, cinderace, pincurchin,
  golisopod) — still 0 "champions"-tagged moves for every one of them (vs.
  51 for an already-covered species like archaludon, confirming the query
  methodology itself works). No backfill yet, so this audit still can't run
  the `hasChampionsMoveData` methodology the way Golisopod's fix did —
  genuinely blocked on PokeAPI, not on effort spent here. One more
  no-new-info re-check and this needs to either move to Known Exceptions or
  get flagged for a decision (e.g. hand-curating from user-provided source
  text the way Golisopod's fix did, rather than waiting on PokeAPI further).

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

2026-09-10 feedback pass batched into 4 candidate milestones; Battle Logger
Overhaul, Statistics Improvements, and Team Management QoL were each
promoted to current and have since shipped (see `MILESTONES.md`). Live Calc
Tuning, the last of the four, was promoted 2026-09-11 (see `## Current
Milestone` above). Nothing queued here right now.

