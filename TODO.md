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
Extraction leg (see `COMPLETED.md`). Sample Team Catalog Leg 1 shipped the
same day (see `COMPLETED.md`).

## Current Milestone: VGCPastes Real-Set Sourcing

Once all legs below are done, revisit scoping
[Calc Doubles Support] — Leg 1 (still in Unscheduled) before closing this
milestone - not pulled in now, but flagged 2026-09-14 for reconsideration
at that point.

- **[VGCPastes Sample Team Catalog: Row Display Rework] — Leg 2** *(Last
  touched: 2026-09-14 · Re-checks: 0)*
  Flagged during Leg 1's live verification. Catalog rows currently show
  description/owner/tournament/rank/date text plus plain species-name
  chips (`VgcPasteCatalogModal.tsx`'s `TeamRow`) - should instead match
  the same visual format already used for a user's own teams (team name,
  author, 6 species sprites), same as `TeamCard.tsx`. Also add an expand
  affordance per row (next to the Import button) to preview a team's full
  moves/EV spreads before importing - not decided yet whether that means
  fetching the pokepaste eagerly per row or only on expand-click.

- **[VGCPastes Sample Team Catalog: Import Field Fixes] — Leg 3** *(Last
  touched: 2026-09-14 · Re-checks: 0)*
  Three related correctness bugs found during Leg 1's live verification, all
  in how `ImportTeamModal`'s prefill (`applyPokepasteData`) populates the
  form for a catalog-picked row: (1) Team Name auto-fills from the
  pokepaste's own `title` field, which includes a rental code suffix
  (e.g. "...Top 16 Team 7C8RLWGQWV") - should be stripped, or the sheet's
  own `description` (already available on the picked `VgcPasteTeamRow`)
  used instead of the paste's title. (2) Author auto-fills to the literal
  string "VGCPastes" (the pokepaste's own `author` field, since VGCPastes
  itself publishes the paste) instead of the real player - should use the
  row's own `owner` field (sheet column AJ) when importing via this path.
  (3) The "Review Saved Builds" step (`ImportBuildReviewStep`) shouldn't
  show for a catalog-sourced import - go straight to import. All three need
  `ImportTeamModal` to know it's in "catalog import" mode (the
  `prefillPokepasteUrl` prop, or a new one) so it can use the row's own
  name/owner instead of the paste's, and skip the review step.

- **[VGCPastes Sample Team Catalog: Notes Auto-Population] — Leg 4** *(Last
  touched: 2026-09-14 · Re-checks: 0)*
  Requested during Leg 1's live verification. When importing via the
  catalog, the team's Notes should auto-populate from the sheet's
  Tournament/Event (column AE) and Rank (column AF) columns, plus the
  Link to Source/Report-Video/Other-Links columns (AG/AH/AI), each on its
  own line, hyperlinked if possible. None of AE/AF/AG/AH/AI are captured by
  `VgcPasteTeamRow`/`services/vgcPastes.ts` yet (Leg 1 only pulled
  Tournament/Rank for card display, not AG-AI) - needs those 3 new columns
  added to the row shape, plus checking whether the app's Notes field even
  supports hyperlinks/rich text today or is plain text only (if plain text,
  "hyperlinked" may mean nothing more than pasting the bare URL).

- **[VGCPastes Per-Species Real-Set Extraction] — Leg 2** *(Last touched:
  2026-09-14 · Re-checks: 0)*
  Deliberately left thin per the 2026-09-14 scoping session (see
  `docs/investigations/vgcpastes-sourcing-scope.md`) - needs its own
  scoping pass once Leg 1 ships and there's real sheet-pull plumbing to
  build on top of. Builds on Leg 1's pulled/cached rows: extract individual
  Pokémon sets out of each row's pokepaste and correlate them per species
  (move/item/ability/nature/EV-spread bundles that actually co-occurred in
  a real team, not synthesized from independent per-axis rankings) to power
  Calc's opponent auto-population. Known needs, not yet scoped into
  sub-steps: species-name normalization (sheet text like "Salamence-Mega" →
  this app's PokeAPI-normalized slugs, same shape as
  `config/pokemonRules.ts`'s gender-divergent-species handling) and a
  set-correlation/storage layer distinct from Leg 1's raw-row cache.

- **[Calc/Live Calc Tailwind & Terrain-Ability Speed Modeling] — Leg 1**
  *(Last touched: 2026-09-13 · Re-checks: 0)*
  Surfaced while fixing Choice Scarf not being factored into the Calc tab's
  displayed Speed (see COMPLETED.md's Calc/Live Calc Bug Fixes Leg 1).
  `computeBoostedStats()` now delegates to `@smogon/calc`'s own
  `getFinalSpeed()`, so it's item/most-ability-correct, but it still only
  ever receives a bare weather value - no caller threads a real Field/Side
  through it, so Tailwind and terrain-keyed abilities (Surge Surfer) still
  don't apply on the Calc tab's own stat panel. Not scoped: Tailwind
  specifically needs the caller to know which side
  (`CalcFieldState.pokemon1Side`/`pokemon2Side`) a given Pokemon is
  actually on, which `useDamageCalc.ts` doesn't currently track/pass - a
  real plumbing decision, not a one-line fix. Narrowed from 3 call sites to
  1 by the Live Calc rip (see COMPLETED.md's Live Calc Retirement) -
  `useLiveCalc.ts`/`liveCalcSpeedEngine.ts` are gone now, leaving only
  `computeBoostedStats()`'s own call site.

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

- **[Calc Doubles Support] — Leg 1** *(Last touched: 2026-09-14 ·
  Re-checks: 0)*
  Raised 2026-09-11 as "Live Calc Doubles Support" alongside that tab's own
  scoping pass - 2 simultaneously-unknown opponents plus ally-side
  interactions. Retargeted 2026-09-13 at the regular Calc/popup now that
  Live Calc is being ripped. Deliberately kept out of the VGCPastes Real-Set
  Sourcing milestone (Current Milestone) for now; flagged 2026-09-14 to
  revisit scoping it once that milestone's two legs are done, before the
  milestone closes. Not scoped. See
  `docs/investigations/live-calc-layout-rework-scope.md` (historical
  context) and `docs/investigations/regular-calc-popup-scope.md` (the
  pivot).

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

- **[Dev Console GPU Overlay Error Noise] — Leg 1** *(Last touched:
  2026-09-14 · Re-checks: 0)*
  `npm run dev` prints `[...ERROR:ui\gl\direct_composition_support.cc:247]
  GetGpuDriverOverlayInfo: Failed to retrieve video device` on every launch.
  Cosmetic dev-console noise, not a functional issue (app launches/behaves
  normally) - very likely the same GPU/driver situation `main.ts`'s existing
  `app.disableHardwareAcceleration()` call already works around (a
  DirectComposition video-overlay capability probe that fails gracefully
  instead of crashing, on this machine's GPU/driver combo). Candidate fix:
  `app.commandLine.appendSwitch('disable-direct-composition')` before
  `disableHardwareAcceleration()` - untested, and touches GPU flags on a
  line already sensitive to this exact driver's quirks, so verify live
  rather than assuming safe. Low priority - purely cosmetic.

- **[VGCPastes Sample Team Catalog: Search/Filter] — Leg 1** *(Last touched:
  2026-09-14 · Re-checks: 0)*
  Flagged as scope creep during Sample Team Catalog Leg 1 rather than added
  silently - that leg's own catalog is a plain scrollable list per
  regulation tab, no search/filter, matching exactly what was scoped. A
  regulation tab can hold 200+ rows, so a text filter (by species/owner/
  description) over `VgcPasteCatalogModal.tsx`'s row list would be a
  natural fast-follow once there's a real usage signal that it's needed.

## Future Milestones (unscheduled)

2026-09-10 feedback pass batched into 4 candidate milestones; Battle Logger
Overhaul, Statistics Improvements, and Team Management QoL were each
promoted to current and have since shipped (see `MILESTONES.md`). Live Calc
Tuning, the last of the four, was promoted 2026-09-11 and later retired in
favor of Regular Calc Popup (see `MILESTONES.md`). VGCPastes real-set
sourcing, deferred out of Regular Calc Popup, was itself promoted to
current 2026-09-14 (see `## Current Milestone` above).

None currently queued.

