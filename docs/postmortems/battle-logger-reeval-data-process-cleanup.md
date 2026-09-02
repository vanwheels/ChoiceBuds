# Post-mortem: Battle Logger Re-eval + Data & Process Cleanup

**Date:** 2026-08-31 to 2026-09-01. **Status:** Shipped. Boundary: starts
right after the UI/UX Overhaul milestone's own postmortem/archive setup
(`git log` range `3fdf901..1ac6de8`), ends at the File Size Cap Cleanup.
Full implementation detail for every item below lives in its own
`COMPLETED.md` entry — this doc is the retrospective, not a restatement.

## What shipped

Two deliberate threads, plus a wide tail of smaller fixes and features that
landed in the same window:

1. **Battle Logger re-evaluation.** Live turn-by-turn battle logging and its
   stat-inference popover were archived (kept, not deleted, in
   `_archived/battle-logger/`) and replaced with `RecordMatchForm.tsx`, a
   single post-match record that feeds the Statistics page exactly as
   before — `battles.json`'s shape needed zero changes. Scoped and built in
   one pass, since research confirmed `battles.json` was still empty (no
   real data to migrate). The usage-data infrastructure this freed up to
   focus on then grew into **Team Gap Analysis** (2 legs): a background
   `useUsageSync` hook keeping ladder-wide usage rank synced for the whole
   roster, and a ranked "what beats every slot on this team" panel on the
   Type Matchup page.
2. **Champions data accuracy audit.** Adopted Smogon/Showdown's own
   `champions` mod source as the primary reference over wiki summaries and
   community spreadsheets (Legs 2-6 of "Champions Data: Adopt Showdown's
   `champions` Mod as Primary Reference"), which corrected three things
   that had been quietly wrong: `championsMoveOverrides.ts` promoted 11
   lower-confidence entries and confirmed no balance changes were missing;
   `championsAbilityOverrides.ts` and `megaAbilities.ts` picked up 5 new
   Mega-ability entries (Excadrill, Feraligatr, Meganium, Pyroar,
   Scovillain) found by reading Showdown's actual Mega-forme data instead
   of guessing from name-theming; and a real roster bug surfaced — this
   app's legal-species list had `'floette'` where Champions actually
   legalizes `'floette-eternal'`. `GLOBALLY_REMOVED_MOVES` grew from 3 to
   235 entries along the way. A follow-on **Remaining Champions Mega
   Ability Audit** (Leg 1) closed out the last 29 Mega forms Showdown's mod
   didn't cover, cross-checking a Kotaku reveal article against Serebii's
   per-species pages. **Eelektross Mega Ability (Eelevate)** and **Prune
   Dead `championsMovepoolChanges.ts` Entries** were smaller audits in the
   same vein.
3. **Process/tooling cleanup**, the work that actually set this milestone's
   boundary: the post-mortem/`MILESTONES.md` system itself stood up (with
   the UI/UX Overhaul as its first entry), `COMPLETED.md` split into a
   rolling ~50-entry archive, and `TODO.md` reformatted into its current
   leg/re-check-counter/Blocked-tier structure. Alongside that: a new
   standalone **Config-Table Audit Script** (2 legs) for referential-
   integrity checks across 16 move/ability-keyed config tables; the
   **Generalize Check-for-Updates Pattern** (scoping leg + build leg),
   turning three one-off staleness checks into one shared Settings section;
   and the **File Size Cap Cleanup** (3 legs) splitting `main.ts`,
   `types/pokemon.ts`, and `useDamageCalc.ts` along domain seams.
4. **Everything else landed in the window:** three Pokémon-picker search
   upgrades (move-name, ability-name, and multi-tag `#tag #tag` search),
   an Add-Pokémon button width fix, the animated-sprite toggle's build leg,
   an offline item/Mega sprite-caching fix, **Export Team to Pokepaste**
   (a new main-process IPC write path, this app's first main-process-
   initiated external call), the `set-state-in-effect` lint-rule fix across
   6 hooks, a Calc crash-on-zero-damage fix, a Mega-eligibility mismatch fix
   between the team builder and Calc, a Calc Mega-toggle ability-revert fix,
   and two old backlog arcs (2026-07-07 Review-Pass Leftovers, Original
   Roadmap Leftovers) closed out by explicit user decision.

## What went well

- **Battle Logger's retirement decision was validated before acting on
  it**, not assumed — the empty `battles.json` check is what made
  "scope and build in one pass" a safe call instead of a risky shortcut.
- **The Champions data audit built an evidence hierarchy and used it to
  overturn things previously taken as settled** — Showdown's actual
  simulator code outranked the wiki-summary/spreadsheet sources this
  project normally relies on, and applying that hierarchy caught a real,
  live roster-legality bug (Floette) that had been shipping wrong.
- **A bad premise got caught and corrected mid-arc instead of being built
  on.** Leg 4's original plan (treat Showdown's Past-move flag list as
  universally applicable) turned out to be wrong — it only ever reaches
  species PokeAPI hasn't "champions"-tagged yet — and was re-scoped as 4a
  once that was discovered, rather than shipping the flawed version.
- **Backward-compatible refactors throughout.** Both the File Size Cap
  Cleanup and the types-file split kept every existing import path working
  via barrels/re-exports; nothing downstream broke despite large
  structural moves.
- **Old backlog debt got a deliberate closing sweep.** 2026-07-07
  Review-Pass Leftovers and Original Roadmap Leftovers — both stale,
  multi-session-old arcs — were resolved to explicit decisions (bank the
  number, close with no code, or spin off a fresh item) rather than left
  to keep aging silently.

## What didn't go well / friction points

- **The Champions data audit thrashed before it found its footing.** Leg 1
  left `formats-data.ts`/`items.ts` as an open roster-alignment question
  that Leg 5 had to close two legs later; Leg 4's initial approach was
  invalidated and had to be redone as 4a. The audit got to a strong final
  answer, but it took more false starts to get there than a single
  investigation doc read start-to-finish suggests — six legs (plus the
  Mega-ability and movepool-pruning follow-ons) never resolved into one
  clean "here's what we now know" checkpoint; the trail exists but only as
  accumulated per-leg diffs in `docs/investigations/
  champions-showdown-mod-audit.md`, not a summary.
- **File Size Cap Cleanup's one real judgment call has no recorded decision
  trail.** Leg 2's own scoping note explicitly asked whether splitting
  `types/pokemon.ts` was even the right call, since CLAUDE.md's Architecture
  section stated it as a deliberate single-source-of-truth file. The split
  went ahead and the doc was updated, but neither the commit nor the
  COMPLETED.md entry records whether that was actually checked with the
  user first. Still open — worth confirming after the fact if it wasn't
  already discussed live.
- **`damageCalcEngine.ts` was extracted specifically for testability but
  never got a test file.** The File Size Cap Cleanup's Leg 3 commit message
  justifies the split partly on "independently unit-testable going
  forward"; that follow-through didn't happen in the same leg. (Already
  spun off as its own TODO.md backlog item.)
- **Two old backlog arcs needed a dedicated closing pass at all.** Neither
  2026-07-07 Review-Pass Leftovers nor Original Roadmap Leftovers had new
  information land during this window — they were closed on decisions that
  could have been made whenever they last went quiet, not because anything
  new happened here. Their presence in this batch is itself a sign backlog
  hygiene had been deferred for a while.

## Scope creep observed

- **The Champions data audit outgrew its own Leg 1 framing.** It started as
  a targeted check of `championsMoveOverrides.ts`'s correctness and grew,
  leg by leg, into a full-roster audit spanning move overrides, ability
  overrides, Mega-ability coverage, movepool corrections, and a species-
  legality bug fix — each addition individually justified and separately
  legged, but the aggregate is much bigger than the original scope implied.
  Not silent (each leg was its own tracked item), but worth naming per the
  project's own scope-creep convention.
- **"Prune Dead `championsMovepoolChanges.ts` Entries" only exists because
  of a mid-audit discovery**, not a pre-planned piece of work — Legs 4a/4b
  found the file's per-species carve-outs had become dead code once PokeAPI
  back-filled real Champions move data. Legitimate downstream cleanup, but
  another instance of one leg's findings spinning off a new backlog item
  rather than staying contained to the leg that found it.

## What changes for the next milestone

- When a multi-leg investigation is heading into its 4th-plus leg and
  correcting its own prior premise along the way, write a short mid-arc
  "here's what we currently believe and why" checkpoint into the
  investigation doc rather than only ever accumulating leg-by-leg diffs —
  it would have made this retrospective (and any future re-scoping) faster
  to reconstruct.
- Keep doing the old-backlog closing sweep this batch did well
  (Review-Pass Leftovers, Original Roadmap Leftovers) — but on a regular
  cadence rather than only surfacing at a milestone boundary.
- Carry forward, unresolved from this batch: confirm whether the
  `types/pokemon.ts` split decision was actually checked with the user
  live, and land `damageCalcEngine.ts`'s test coverage (both tracked in
  TODO.md).
