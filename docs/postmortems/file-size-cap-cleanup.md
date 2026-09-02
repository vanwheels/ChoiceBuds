# Post-mortem: File Size Cap Cleanup

**Date:** 2026-09-01 (single-session implementation arc — all three legs
landed within about 18 minutes of each other). **Status:** Shipped. Full
implementation detail lives in `COMPLETED.md`'s three leg entries
(`git log` range `19734d0..3dd94e2`) — this doc is the retrospective, not a
restatement.

## What shipped

Three files that had drifted past CLAUDE.md's file-size cap, each split
along its natural domain seams with zero behavior change:

1. **Leg 1 — `main.ts`** (693 → 173 lines). `registerIPCHandlers()`'s
   ~319 lines covering seven unrelated IPC domains inline were split into
   `main/paths.ts`, `main/atomicWrite.ts`, `main/windowState.ts`, and four
   `main/ipc/*Handlers.ts` modules by domain (file, shell, sprite,
   pokepaste).
2. **Leg 2 — `types/pokemon.ts`** (660 → 187 lines as a barrel). ~40
   unrelated interfaces spanning core team data, Battle Logger, settings,
   and game-data caching were split into `pokemon.ts`/`battle.ts`/
   `settings.ts`/`gameData.ts`, with `pokemon.ts` re-exporting the other
   three so all 113+ existing importers kept working unchanged. Also
   updated CLAUDE.md's Architecture section, since it had explicitly
   documented the old flat file as "the single source of truth... add new
   fields here first" — a statement the split directly contradicted if
   left unedited.
3. **Leg 3 — `useDamageCalc.ts`** (604 → 273 lines). ~440 lines of
   module-scope pure functions (state factories, boost/stat-multiplier
   math, `buildPokemon`, `computeSideResults`) were moved into
   `utils/damageCalcEngine.ts` (388 lines), with the hook re-exporting the
   engine's types/constants so existing imports kept working unchanged.

All three were verified with `tsc --noEmit`, `eslint`, the full Vitest
suite, and a production build before being marked done.

## What went well

- **Preserved import-path compatibility deliberately, not accidentally.**
  Both the types split and the calc-engine split kept every existing
  import path working via a barrel/re-export rather than touching 113+
  call sites for a cosmetic reorganization — the right call given the
  project's own stated aversion to mass path rewrites for files like
  `types/pokemon.ts`.
- **Caught a related-documentation update instead of just moving code.**
  Leg 2 recognized that CLAUDE.md's Architecture section made an explicit
  claim ("single source of truth... add new fields here") that the split
  would falsify, and updated it in the same commit rather than leaving
  the doc stale.
- **Mechanical once scoped.** All three legs were pre-identified with an
  exact line-count and a concrete extraction shape in TODO.md before any
  leg started (see Leg 1's commit, which recorded Legs 2 and 3's scope
  up front) — there was no design ambiguity to resolve mid-leg for Legs 1
  and 3, which is likely why all three landed in one sitting instead of
  spanning separate sessions as the leg-per-session convention usually
  implies.

## What didn't go well / friction points

- **The one real judgment call in this arc has no recorded decision
  trail.** Leg 2's own scoping note in TODO.md flagged a genuine tension —
  splitting `types/pokemon.ts` contradicts CLAUDE.md's explicit
  single-source-of-truth language — and asked for "a decision on whether
  to split... or leave this file as a documented, deliberate cap
  exception." The commit went ahead and split it, but neither the commit
  message nor the COMPLETED.md entry records that this was checked with
  the user first rather than resolved unilaterally. Worth confirming
  after the fact if it wasn't already discussed live.
- **The extraction that named its own follow-up didn't do it.** Leg 3's
  commit message says the pulled-out engine is "independently
  unit-testable going forward," but no test file was added for
  `damageCalcEngine.ts` in the same leg — the opportunity the refactor was
  partly justified by is still sitting open.

## Scope creep observed

None. Each leg's diff matched its TODO.md scoping note exactly — no
mid-leg expansion, no inline fix of an unrelated bug found along the way.

## What changes for the next milestone

- When a leg's scoping note explicitly asks for a decision (not just "how
  to split" but "whether to split at all"), record the outcome of that
  decision in the COMPLETED.md entry itself — "user confirmed splitting
  X despite Y" — not just the resulting diff. Right now that trail only
  exists if it's remembered separately.
- When a refactor's stated justification includes "this makes X
  independently testable," add the test in the same leg rather than
  leaving it as an implied but untracked follow-up — otherwise it's the
  kind of gap that's easy to lose once the leg is marked done and its
  TODO entry is gone.
