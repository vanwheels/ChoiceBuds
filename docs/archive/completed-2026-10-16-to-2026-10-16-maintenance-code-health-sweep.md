# Completed Work Archive: Maintenance & Code Health Sweep (2026-10-16)

Archived out of `COMPLETED.md` at the 2026-10-16 Maintenance & Code Health
Sweep milestone boundary, per `CLAUDE.md`'s archiving rule. Shares its date
range with the preceding Prettier Adoption boundary (see
[completed-2026-10-16-to-2026-10-16.md](completed-2026-10-16-to-2026-10-16.md)),
so this file is named with the milestone slug to disambiguate. Covers the
Maintenance & Code Health Sweep milestone's seven legs; see
[../postmortems/maintenance-code-health-sweep.md](../postmortems/maintenance-code-health-sweep.md)
for the full write-up.

**File Cap Splits: CalcPokemonPanel.tsx — Leg 1** (2026-10-16)
Split `src/renderer/components/calc/CalcPokemonPanel.tsx` (511 lines,
commit c4b037c) into `CalcPokemonPanelFields.tsx` (species/mega/gender row,
stat-forme toggle, item/ability, nature/status, stat rows, usage
stat-spread chips, real-sets section) - same pure-JSX-extraction shape as
`TeamCard.tsx`/`BoxPage.tsx`'s earlier splits. `CalcPokemonPanel.tsx` itself
is now a 497-line state/handler orchestrator; the new file is 217 lines.
`npm run build`/`lint`/`test` all pass (783 tests, no regressions), and the
split was live-verified via `run-desktop` after a stale dev-server restart
(Vite's optimize-dep cache needed a fresh process to pick up the new
module) - species autocomplete select, usage auto-fill (item/ability/
nature/moves/SPs), gender cycle, Mega toggle (ability swap and restore on
toggle-back), Aegislash Blade/Shield stat-forme toggle, usage stat-spread
chip click, Real Sets section, and Copy Text/Save Set all confirmed working
with no new console errors. This was the last of the milestone's four
file-cap splits (`TeamCard.tsx`, `BoxPage.tsx`, `useSync.test.ts`, this
one) - the other two done-when criteria for Maintenance & Code Health Sweep
were already satisfied earlier in the milestone, so it's ready to close via
`/close-milestone`.

**File Cap Splits: useSync.test.ts — Leg 1** (2026-10-16)
Split `src/renderer/hooks/useSync.test.ts` (514 lines) into
`useSync.test.ts` (status/signUp/logIn/logOut), `useSync.syncNow.test.ts`
(the `syncNow` describe block), and `useSync.autoSync.test.ts` (the
debounced/interval/online auto-sync-trigger describe block), with shared
fixtures (`makeSettings`/`makeTeam`/`makePokemon`/`emptyMergedPayload`/
`PLAYER_PROFILE`/`setup`) pulled into a new non-test helper module,
`useSyncTestHelpers.ts` (named without `.test.` so Vitest's
`src/**/*.test.ts` glob doesn't pick it up as its own suite). All three
test files stay well under the 500-line cap. All 22 original test cases
preserved 1:1, just redistributed - `npm run type-check`/`lint`/`test` all
pass (783 tests across 75 files, no regressions). See commit 7d913d1.

**File Cap Splits: BoxPage.tsx — Leg 1** (2026-10-16)
Split `src/renderer/components/BoxPage.tsx` (583 lines) into
`BoxPageToolbar.tsx` (search + sort-mode header), `BoxPageGrid.tsx`
(loading/error states, mobile compact grid, desktop Reorder.Group card
grid), and `BoxPageOverlays.tsx` (New Build picker/save-name dialog,
Add-to-Team dialog, grid-level paste context menu) - same header/roster-
grid/overlays split shape as `TeamCard.tsx`'s own split below. `BoxPage.tsx`
itself is now a 483-line state/handler orchestrator; all three new files
stay well under the 500-line cap. `npm run build`/`lint`/`test` all pass,
and the user live-verified the Box tab in the running app with no
regression. See commit e70baea.

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
