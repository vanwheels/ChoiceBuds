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

