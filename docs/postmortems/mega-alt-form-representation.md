# Mega & Alt-Form Representation — Post Mortem

2026-10-22, four legs, same day.

## What shipped

- **Leg 1** (`de36abf`): `usePokemonFormToggle`, a shared per-roster-slot
  display-override toggle (module-level store via `useSyncExternalStore`,
  session-only — Mega/Blade-Shield never persist) for the three consumers
  below.
- **Leg 2** (`39d56af`, `ddfe933`): team card flip — toggling a held Mega
  Stone's badge swaps the ability capsule/stats grid/type badges to the
  Mega's own values (sprite swap was already always-on and untouched).
  Follow-up same day replaced placeholder glyph/emoji badges with
  Showdown's real sprite assets.
- **Leg 3** (`64edf44`, `1d7d83c`): Aegislash Blade/Shield toggle in the
  team builder card, defaulting to Shield; stats derived via the real
  Attack↔Defense/Sp. Atk↔Sp. Def swap rule, not a second table. Follow-up
  same day added the sprite flip after live feedback.
- **Leg 4** (`0961243`, `191bd70`, `2eed364`): battle log Mega-Evolved
  marking, one toggle per roster tile. Two same-day redesigns after live
  feedback: first added real gating (`resolveOpponentMegaControl` —
  species/item-aware, X/Y/Z picker for ambiguous forms) in place of an
  unconditional toggle, then fixed the picker collapsing to a plain toggle
  the instant it resolved an item, which left no way to correct a misclick.

All three milestone "Done when" criteria met (team card flip verified live
against a real stat/ability/type-changing Mega, confirmed manually at
close-out; the other two had explicit `run-desktop` verification recorded
in COMPLETED.md).

## What went well

- The shared-toggle foundation (Leg 1) paid off immediately: Legs 2-4 each
  consumed it without needing their own state design, and `useMegaSprite`'s
  existing per-slug PokeAPI fetch was reused twice (team card Mega, then
  Aegislash Blade) instead of adding new fetch paths.
- Pure logic was split out for unit testing without React in both Leg 3
  (`aegislashForme.ts`) and Leg 4 (`battleMegaToggle.ts`), keeping the
  one-Mega-per-side rule and the stat-swap rule covered by fast tests
  rather than only exercised through `run-desktop`.
- Leg 4's live feedback loop caught a real correctness gap (any Pokémon
  markable regardless of Mega capability) and a real UX dead-end (no way
  to fix a misclick) same day, before the milestone closed.

## What didn't / friction points

- Leg 2's "Done when" criterion explicitly required live verification
  against a stat/ability/type-changing Mega, but its COMPLETED.md entry
  documented only the build and an icon-asset follow-up — no verification
  note. `/close-milestone`'s acceptance-criteria review caught the gap, but
  only at the end of the milestone, and the check then still relied on
  recalling an unrecorded manual check rather than evidence in the log.
- Leg 4 needed two full redesigns in one day: unconditional toggle →
  species/item-gated control → picker-no-longer-collapses fix. The
  underlying cause both times was the same — ambiguous multi-form species
  (Charizard X/Y, etc.) weren't designed for up front, so "what if the
  picker's answer is wrong" wasn't considered until it was live-tested.
- Both Leg 2 (placeholder glyph/emoji) and Leg 3 (stats-only, no sprite)
  shipped visually incomplete on the first pass and needed a same-day
  follow-up once seen live. Neither gap was a logic bug — both were "this
  toggle changes X, Y, and Z" where one of X/Y/Z was dropped from the
  initial scope.

## Scope creep observed

None beyond the same-day follow-ups above — each stayed scoped to its own
leg's feature (no unrelated work pulled in), but four of the six follow-up
commits were fixing something the leg's own done-when should have caught
before calling it finished.

## What changes for the next milestone

1. When a leg's done check includes a live-verification step, record that
   it happened (not just the build) in the COMPLETED.md entry at the time —
   don't let `/close-milestone` be the first place the gap surfaces.
2. For a feature with ambiguous/branching selection (multiple forms of one
   species, etc.), design the correction path — "what if the resolved
   choice is wrong" — as part of the initial scope, not as a live-feedback
   follow-up.
3. When a toggle changes more than one visible property of a Pokémon
   (ability, stats, typing, sprite), list all of them explicitly in the
   leg's scope before building, rather than discovering a missed one live.

See TODO.md for where these land as active checks.
