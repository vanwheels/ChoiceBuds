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
`COMPLETED.md` and `MILESTONES.md`). Regular Calc Popup shipped 2026-09-13
(see `COMPLETED.md` and `MILESTONES.md`) - includes the retired Live Calc
Tuning work that preceded its pivot; see
[docs/postmortems/regular-calc-popup.md](docs/postmortems/regular-calc-popup.md)
for the full arc. VGCPastes Real-Set Sourcing promoted to current milestone
2026-09-14 (folds in the Tailwind/Terrain-Ability Speed Modeling leg that
had been sitting in Unscheduled); its own Scoping leg finished the same day,
splitting into a Sample Team Catalog leg and a Per-Species Real-Set
Extraction leg (see `COMPLETED.md`). Sample Team Catalog Legs 1, 2, 3, and 4
shipped the same day (see `COMPLETED.md`). Per-Species Real-Set Extraction's
own scoping pass finished 2026-09-15, splitting into an Extraction Pipeline &
Cache leg and a Calc Panel Real Sets UI leg; both shipped 2026-09-15 (see
`COMPLETED.md`). Calc Real Sets Section: Visual Polish Legs 1 and 2 shipped
2026-09-15 (see `COMPLETED.md`). Team Builder Real Sets Integration's own
Scoping leg finished the same day, splitting into a build leg; that build leg
(Leg 2) also shipped 2026-09-15 (see `COMPLETED.md`). VGCPastes Sample Team
Catalog: Search/Filter Leg 1 shipped 2026-09-15 (see `COMPLETED.md`). Team
Builder Stat Display: SP / Base / Real Total Toggle Leg 1 - unrelated in
topic, just pulled into this milestone's current-milestone slot per Vanny's
call since only one milestone can be "current" at a time - also shipped
2026-09-15 (see `COMPLETED.md`). VGCPastes Real-Set Sourcing milestone
shipped 2026-09-15 (see `MILESTONES.md` and
[docs/postmortems/vgcpastes-real-set-sourcing.md](docs/postmortems/vgcpastes-real-set-sourcing.md)).
[Calc Stat Rows: SP / Stat Total Toggle] — Leg 1 was killed 2026-09-16
instead of scoped - see `COMPLETED.md`. Maintenance & Bug Fix Sweep promoted
to current milestone 2026-09-16, pulling in three previously-Unscheduled
items plus a newly-reported Real Sets bug. [Real Sets: Mega Evolution
Species Matching Bug] — Leg 1 shipped the same day (see `COMPLETED.md`).
[Team Gap Analysis: Usage Cutoff Tuning] — Leg 1 resolved (decision, no
diff to the cutoff) 2026-09-16 (see `COMPLETED.md`). [Dev Console GPU
Overlay Error Noise] — Leg 1 shipped the same day (see `COMPLETED.md`).

## Current Milestone: Maintenance & Bug Fix Sweep

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

- **[Reg M-C Z-A-Exclusive Movepool Audit] — Leg 1** *(Last touched:
  2026-09-16 · Re-checks: exempt, blocked)*
  Blocked: waiting on PokeAPI to backfill "champions"-tagged move data more
  broadly, the same way it eventually did for Reg M-B's 22 species (see
  `config/championsMovepoolChanges.ts`'s header). Deferred out of
  Regulation M-C Prep's Leg 2 (see COMPLETED.md/postmortem) rather than
  forced into that pass.
  Scope correction 2026-09-16 (per Vanny): Rillaboom/Baxcalibur/Salamence
  are not the actual audit target, they're cheap indicator species used to
  check whether PokeAPI has caught up yet (currently 0 champions-tagged
  moves each, vs. 51 for already-backfilled archaludon as control - checked
  live 2026-09-10 and again 2026-09-16, no change). The real scope is a
  full Champions movepool sweep across *all* Champions-legal species once
  PokeAPI's backfill catches up - not just these 3, and not just Reg M-C's
  roster. Golisopod (originally a 4th indicator) is separately resolved via
  hand-curation from user-provided source text - see COMPLETED.md's
  Champions M-C Balance Patch Corrections entry - but that was a one-off,
  not a template to repeat per-species while waiting; the plan is to wait
  for PokeAPI rather than hand-curate the rest.
  Next step: periodically re-run the live champions-tag query against
  Rillaboom/Baxcalibur/Salamence (indicator species); once any of them
  shows non-zero champions-tagged moves, PokeAPI has started backfilling
  Reg M-C and it's time to run the full sweep across all Champions-legal
  species, not just these 3.

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

## Future Milestones (unscheduled)

2026-09-10 feedback pass batched into 4 candidate milestones; Battle Logger
Overhaul, Statistics Improvements, and Team Management QoL were each
promoted to current and have since shipped (see `MILESTONES.md`). Live Calc
Tuning, the last of the four, was promoted 2026-09-11 and later retired in
favor of Regular Calc Popup (see `MILESTONES.md`). VGCPastes real-set
sourcing, deferred out of Regular Calc Popup, was itself promoted to
current 2026-09-14 and shipped 2026-09-15 (see `MILESTONES.md`).

None currently queued.

