# Selection UX & Data Audit — Post-Mortem

2026-10-24. Three legs, same day.

## What shipped

- **Description truncation fix** (Leg 1): removed the `truncate` className
  on the description `div` in `MovePickerPanel.tsx`,
  `AbilityPickerPanel.tsx`, and `ItemPickerPanel.tsx` so long move/ability/
  item descriptions wrap in full instead of clipping to one line. Commit
  0711d909.
- **Missing-description audit** (Leg 2): enumerated every move/ability
  across the full Reg M-C Champions-legal species pool (266 species slugs,
  614 unique moves, 201 unique abilities) via live PokeAPI data, and
  checked each against `pokeapiService.ts`'s "No description available"
  fallback condition. Found 52 moves hit the fallback (Upper Hand and
  Temper Flare confirmed among them, per the item's spec) and 0 abilities
  did, after excluding ones already fixed by existing override tables.
  Full list and methodology captured in
  `docs/investigations/missing-move-ability-descriptions.md`. Commit
  080d1b82.
- **Curated fallback descriptions** (Leg 3): hand-authored descriptions for
  all 52 gap moves from Bulbapedia/Serebii, added as
  `config/missingMoveDescriptions.ts` with a Vitest suite, wired into
  `useGameData.ts`'s read-boundary override pattern (self-heals move data
  already sitting in a user's cache, no cache-version bump needed).
  Live-verified in the running app against a spot-check sample (Upper
  Hand, Tera Blast, Shed Tail). Commit f513bec8.

## What went well

- Leg 2's audit was built from live PokeAPI data against the actual
  Champions-legal pool rather than guessing at a gap list, so Leg 3 had a
  concrete, verifiable target (52 moves, exact names) instead of
  discovering misses after the fact.
- The side-finding mid-audit (Tera Blast's movepool-removal rule being
  dead code for virtually the whole roster — see Unscheduled in `TODO.md`)
  was split out as its own Unscheduled item instead of being folded into
  this milestone or silently dropped. Scope stayed exactly the three
  "Done when" criteria.
- Leg 3 picked the existing `useGameData.ts` read-boundary override
  pattern (matching `championsMoveOverrides.ts`) over extending
  `pokeapiService.ts`'s fetch-time Fairy Feather precedent, specifically so
  the fix self-heals pre-existing cached data rather than requiring users
  to bust their cache. A deliberate architectural call, not a default.

## What didn't / friction points

None worth flagging — all three legs landed clean, tests/lint/type-check
passed throughout, and no re-scoping or rework was needed mid-milestone.

## Scope creep observed

None. The Tera Blast side-finding was the one temptation to expand scope
and it was correctly deferred rather than absorbed.

## What changes for the next milestone

Nothing procedural to change — this milestone ran the way the process is
supposed to.
