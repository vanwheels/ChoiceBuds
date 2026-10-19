# Post Mortem: Maintenance Sweep: useSavedPokemon Split & Housekeeping

Dates: 2026-10-19 (single day, three legs). Planned off the back of Profile
Social Scoping & Maintenance shipping the same day; scoped fresh from a
maintenance audit rather than bundled from pre-existing TODO items.

## What shipped

- **Leg 1 — Split useSavedPokemon.ts** (commit `def5a86`): the file had
  grown to 685 lines, the next file-cap violation in line after
  `useTeams.ts`. Mirrored that earlier split: pure load-path migration logic
  moved to `utils/savedPokemonMigrations.ts`, the sync-reconciliation
  algorithm to a pure `reconcileSyncedSavedPokemon` in
  `utils/savedPokemonSyncReconciliation.ts`, CRUD mutators stayed in the
  hook behind two new shared helpers (`commitSavedPokemon`,
  `updateEntryById`). File landed at 497 lines. `/leg-review` caught a stale
  `ARCHITECTURE.md` reference (fixed same commit) and surfaced a
  pre-existing, not-introduced-here gap: `reconcileSyncedSavedPokemon`
  doesn't migrate incoming sync records the way `reconcileSyncedTeams`
  does. Correctly split out as its own TODO item rather than fixed inline.
- **Leg 2 — Comment Hygiene Sweep** (commit `bd9d064`): fixed the three
  change-history comments (`App.tsx`, `TeamOverflowMenu.tsx`,
  `pokeapi.test.ts`) flagged by the 2026-10-16 Project Revision v2 audit and
  never swept. Broader grep spot-check for the same narration patterns
  found most other hits were legitimate (real gotcha-explaining WHY
  comments, or the established "Leg N, see TODO.md" provenance convention,
  or dated data-source citations) — out of scope — but three more genuine
  instances were rewritten anyway.
- **Leg 3 — Stored-Snapshot Audit** (commit `7308853`): grepped
  `src/renderer` + `worker/src` for persisted one-time-snapshot fields read
  directly instead of recomputed, per
  `.claude/rules/stored-snapshot-vs-live-recompute.md`. Found and fixed one
  real instance: `RecordMatchForm.tsx`'s Battle Logger brought-4 picker read
  the stored `ImportedPokemonInfo.spriteUrl` snapshot instead of
  recomputing via `getPixelSpriteUrl`, so a Pokemon toggled shiny after
  import showed the wrong sprite there. Checked and ruled out several other
  candidates (`FavoritePokemon` snapshot fields, `types`/`baseStats`,
  `calculatedStats`, `Battle.playerRoster`, Statistics/Speed Tiers/Type
  Matchup sprite reads). Full findings in
  `docs/investigations/stored-snapshot-audit.md`.

All three Done-when criteria met. Full suite (875 tests), lint, and
type-check clean at milestone close.

## What went well

- Each leg had a crisply bounded Done-when criterion lifted straight from a
  prior audit (Project Revision v2, the stored-snapshot rule) rather than
  scoped live — no exploration overhead, no ambiguity about when a leg was
  finished.
- Leg 1 followed the split-scoping-from-building convention correctly: the
  sync-migration gap `/leg-review` found got written down as a new
  Unscheduled TODO item instead of being fixed in the same pass, even
  though the fix would likely have been small.
- `ARCHITECTURE.md` was updated in the same commit as the split that
  invalidated it (Leg 1), not deferred to a cleanup pass.

## What didn't / friction points

- None notable. Three legs, three clean commits, no re-work, no failing
  tests at any point.

## Scope creep observed

None. The milestone's three Done-when criteria were fixed at planning time
and none grew during execution; the one adjacent finding (Leg 1's
sync-migration gap) was deferred rather than absorbed.

## What changes for the next milestone

No new rule needed — this milestone was itself the output of two existing
rules (`external-data-sources.md`-style audit discipline via Project
Revision v2, and `stored-snapshot-vs-live-recompute.md`) doing their job.
The one actionable follow-up is the sibling check below, not a process
change.
