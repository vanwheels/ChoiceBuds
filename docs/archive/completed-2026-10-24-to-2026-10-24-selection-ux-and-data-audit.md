# ChoiceBuds - Completed Work Archive (2026-10-24 to 2026-10-24, Selection UX & Data Audit)

Archived at the 2026-10-24 Selection UX & Data Audit milestone boundary,
split out of `COMPLETED.md` per `CLAUDE.md`'s archiving rules. Named with
the milestone slug since it shares its date range with the Display Bug Fix
Sweep archive.

- **[Missing Description Curated Fallbacks] — Leg 3** (2026-10-24)
  Wrote curated fallback descriptions for all 52 moves Leg 2's audit found
  falling back to PokeAPI's "No description available" text (Upper Hand,
  Temper Flare, Tera Blast, etc. — full list in
  `docs/investigations/missing-move-ability-descriptions.md`), hand-authored
  from Bulbapedia/Serebii's move pages per the project's external-data-
  sources research convention. Added `config/missingMoveDescriptions.ts`
  (with a Vitest suite covering the normalize/already-has-a-description/
  not-in-table cases plus a count check against the full 52-move list) and
  wired it into `useGameData.ts`'s existing read-boundary override pattern
  alongside `championsMoveOverrides.ts`, rather than `pokeapiService.ts`'s
  fetch-time Fairy Feather precedent, so the fix self-heals move data
  already sitting in a user's `NEVER_EXPIRES` game-data-cache.json instead
  of requiring a cache-version bump. Live-verified in the running app: the
  picker panels now show real description text instead of "No description
  available" for the spot-checked sample (Upper Hand, Tera Blast, Shed
  Tail). All three of Selection UX & Data Audit's "Done when" criteria are
  now met — next step is `/close-milestone`.
  See commit f513bec8a9e52b90208290557eca75c01ebd06b1.

- **[Missing Move/Ability Description Audit] — Leg 2** (2026-10-24)
  Enumerated every move/ability across the full Reg M-C (most inclusive)
  Champions-legal species pool via live PokeAPI data — 266 species slugs
  (1 redundant duplicate skipped), yielding 614 unique moves and 201 unique
  abilities actually offered in the app's picker panels — and checked each
  against `pokeapiService.ts`'s `extractEffectDescription` fallback
  condition. Found 52 moves currently fall back to "No description
  available" (Upper Hand and Temper Flare both confirmed among them, per
  the item's spec) and 0 abilities do, after excluding 15 moves/2 abilities
  already fixed via existing `championsMoveOverrides.ts`/
  `championsAbilityOverrides.ts` description overrides. Full list and
  methodology in
  `docs/investigations/missing-move-ability-descriptions.md`; a related
  Tera Blast movepool-correctness gap found along the way was split out as
  its own Unscheduled TODO.md item rather than folded into this leg. See
  commit 080d1b8223787a72790ed4e962a39c88dca1a46a.

- **[Selection Dropdown Description Truncation] — Leg 1** (2026-10-24)
  Removed the `truncate` className on the description `div` in
  `MovePickerPanel.tsx`, `AbilityPickerPanel.tsx`, and `ItemPickerPanel.tsx`
  so descriptions wrap in full instead of clipping to one line. Live-verified
  in the running app: a long move/ability/item description now wraps fully
  in all three picker dropdowns. See commit 0711d9094709e63533089c3b7338404f2bc3140e.
