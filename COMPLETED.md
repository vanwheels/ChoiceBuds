# ChoiceBuds - Completed Work Log

Archive of finished work, split out of `TODO.md` (2026-07-08) to keep the
active task list quick to scan. Newest entries first. Cross-references to
still-open items point to `TODO.md`; references to other entries here stay
local ("see below"/"see above").

Archived at milestone boundaries as of the 2026-09-30 split (Post-Parity
Polish - see `MILESTONES.md`), per CLAUDE.md's archiving rules: a shipped
milestone becomes the real cutoff instead of an arbitrary entry count.
Entries prior to this file's oldest are in:
- [docs/archive/completed-2026-06-17-to-2026-07-09.md](docs/archive/completed-2026-06-17-to-2026-07-09.md)
  (the 50 oldest entries as of the 2026-08-31 split)
- [docs/archive/completed-2026-07-09-to-2026-09-01.md](docs/archive/completed-2026-07-09-to-2026-09-01.md)
  (everything through the Battle Logger Re-eval + Data & Process Cleanup
  milestone, split out at the 2026-09-08 Card UI Polish boundary)
- [docs/archive/completed-2026-09-01-to-2026-09-13.md](docs/archive/completed-2026-09-01-to-2026-09-13.md)
  (Card UI Polish through Regular Calc Popup and everything shipped between
  them, split out at the 2026-09-13 Regular Calc Popup boundary)
- [docs/archive/completed-2026-09-13-to-2026-09-30.md](docs/archive/completed-2026-09-13-to-2026-09-30.md)
  (VGCPastes Real-Set Sourcing through Post-Parity Polish and everything
  shipped between them, split out at the 2026-09-30 Post-Parity Polish
  boundary)
- [docs/archive/completed-2026-09-30-to-2026-10-16.md](docs/archive/completed-2026-09-30-to-2026-10-16.md)
  (Web TeamCard Expand Infinite-Loop Bug through Project Revision v2 and
  everything shipped between them, split out at the 2026-10-16 Project
  Revision v2 boundary)
- [docs/archive/completed-2026-10-16-to-2026-10-16.md](docs/archive/completed-2026-10-16-to-2026-10-16.md)
  (the Prettier Adoption milestone's three legs, split out at the
  2026-10-16 Prettier Adoption boundary)

**File Cap Splits: TeamCard.tsx — Leg 1** (2026-10-16)
Split `src/renderer/components/TeamCard.tsx` (761 lines) into
`TeamCardHeader.tsx` (identity/sprite-strip/controls header row),
`TeamCardRosterGrid.tsx` (expanded roster grid + Add Pokémon + notes), and
`TeamCardOverlays.tsx` (context menus + Export/Export Image/Export
PDF/Add-Pokémon-picker modals); `TeamCard.tsx` itself is now a 398-line
state/handler orchestrator. Live-verified against the full behavioral
surface (expand/collapse, header fields, favorite, regulation badge,
both drag-reorders, Add Pokémon, both right-click menus, overflow menu,
responsive stacking) - no regression from the split. Three pre-existing,
unrelated issues surfaced during verification and were logged as their own
TODO.md items rather than fixed in this pass: a notes-textarea data-loss
bug on first blur after expand, Paste Team's card briefly appearing above
its pasted slot before alphabetical re-sort settles, and the overflow
menu's Validate Team popup covering its own dropdown until dismissed. See
commit 7b1352e.

**Audit Sibling Hooks for useTeams' Lost-Update Race — Leg 2** (2026-10-16)
Applied the same ref+queue fix `useTeams.ts` got to `useSavedPokemon.ts`,
`useBattles.ts`, and `useSettings.ts` per Leg 1's audit findings below.
`/leg-review` flagged two gaps in the first pass: no regression test
proving the fix itself (unlike `useTeams.test.ts`'s existing concurrent-
write test) and a stale cross-referencing comment in
`usePokedexNumberSelfHeal.ts` still describing `useSavedPokemon.ts` as
unserialized. Added a concurrent-write regression test to each of the
three hooks' test files (modeled on `useTeams.test.ts`'s) and corrected the
stale comment. `type-check`/`lint`/`test` all pass (783 tests). Manual
verification: no. Review: re-reviewed, no further findings.
See commit e2faada.

**Audit Sibling Hooks for useTeams' Lost-Update Race — Leg 1** (2026-10-16)
Audited `useSavedPokemon.ts`, `useBattles.ts`, `useSettings.ts`, and
`useDatabase.ts` for `useTeams.ts`'s pre-fix "closure over state at render
time + no serialization between concurrent mutations" pattern. Found the
race present in the first three (each reads its state closure directly
with no ref mirror or mutation queue); `useDatabase.ts`'s hot path is
already immune via a different fix (a functional `setState` update, added
earlier for an unrelated incident). Findings with line references in
`docs/investigations/sibling-hooks-lost-update-audit.md`; no code changed.
See commit 7dee38d.

**Delete Dead useActiveEditor Hook — Leg 1** (2026-10-16)
Removed `useActiveEditor.ts` and its test file, plus the dead `editorState`
prop threaded through `App.tsx`/`AppWeb.tsx` into `TeamsPage` (never
consumed there since Always-On Editing replaced that flow). Confirmed via
grep that no references remained outside git history and archived docs
before deleting; `npm run build`, `lint`, and `test` all passed afterward.
See commit dcc0f7e.

