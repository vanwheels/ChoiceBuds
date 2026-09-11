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

## Current Milestone: Statistics Improvements

- **[Statistics: Selected Battle Pokémon Not Tracked] — Leg 1** *(Last
  touched: 2026-09-10 · Re-checks: 0)*
  Statistics doesn't currently factor in which Pokémon the user actually
  selected/brought in their logged battles. Needs scoping — likely feeds a
  usage-rate or brought-rate view, but what exactly should surface isn't
  decided yet.

- **[Statistics: Remove "By Opponent" Section] — Leg 2** *(Last touched:
  2026-09-10 · Re-checks: 0)*
  Remove the "by opponent" breakdown from the Statistics page — no longer
  wanted.

- **[Statistics: Win-Loss Column on Most-Faced Pokémon] — Leg 3** *(Last
  touched: 2026-09-10 · Re-checks: 0)*
  Add a win-loss record column to the "most-faced Pokémon" table in
  Statistics.

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

- **[TeamCard Add-Pokémon: No Species-Clause Dedupe] — Leg 1** *(Last
  touched: 2026-09-10 · Re-checks: 0)*
  Found adjacent to Battle Logger: Duplicate Pokémon Selectable (see
  `COMPLETED.md`) but out of that item's scope. `TeamCard.tsx`'s own
  "+ Add Pokémon" flow (`handleAddSpecies` → `SpeciesPickerCard`) doesn't
  filter out species already on the team, so a team can be built with the
  same species twice - `teamValidation.ts`'s "Validate Team" button only
  warns about this after the fact, it doesn't block it at add-time. Not
  fixed here since the reported bug was scoped to the Battle Logger
  brought-4 pickers specifically.

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

2026-09-10 feedback pass batched into 4 candidate milestones; Battle Logger
Overhaul and then Statistics Improvements were promoted to current (see
above) as prior milestones shipped. The remaining 2 below keep their legs
already drafted — pick one to promote next (items keep their draft
numbering/order until then; no cross-milestone priority has been set).

### Candidate: Team Management QoL

- **[Favorite Teams] — Leg 1** *(Last touched: 2026-09-10 · Re-checks: 0)*
  Add the ability to favorite a team so favorited teams always sort to the
  top, mirroring how favoriting works in the user's GW2 Squaded project.
  Needs a persisted favorite flag on `Team` (`types/pokemon.ts`) plus a sort
  change in `useTeams`/`TeamsPage`.

- **[Quick Copy/Paste Pokémon & Teams via Right-Click] — Leg 1** *(Last
  touched: 2026-09-10 · Re-checks: 0)*
  Add a right-click context menu for quickly copying/pasting a Pokémon or an
  entire team. Needs scoping: clipboard format (Showdown text vs. internal
  JSON), and which surfaces (team card, Pokémon card, editor) get the menu.

- **[Saved Builds Database for Team-Building — Scoping] — Leg 1** *(Last
  touched: 2026-09-10 · Re-checks: 0)*
  Discuss/scope reusing a named saved-build library (moveset + spread, etc.)
  during team-building — e.g. save "Defensive Rilla" once, then auto-populate
  a new Rillaboom slot from it instead of re-entering everything by hand.
  Note: `SavedPokemonDatabase`/`useSavedPokemon` already exists
  (`types/pokemon.ts`, `hooks/useSavedPokemon.ts`) from the Speed Calc-like
  Feature milestone, currently scoped to the Calc panel
  (`CalcSavedSetsModal.tsx`/`CalcSavedSetPicker.tsx`) — this is about
  extending that existing mechanism into the team-import/edit flow, not
  building a new one from scratch. Scoping only — do not start
  implementation until scoped per a dedicated session.

### Candidate: Live Calc Tuning

- **Live Calc pass.** Live Calc "needs a lot of tweaking" per 2026-09-10
  feedback — explicitly deferred to its own future milestone rather than
  folded into whatever milestone comes next. Not yet scoped into concrete
  legs (unlike Statistics Improvements/Team Management QoL above).

