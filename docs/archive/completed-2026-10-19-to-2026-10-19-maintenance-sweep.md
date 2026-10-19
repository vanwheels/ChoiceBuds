# Completed Work Archive: 2026-10-19 to 2026-10-19 (Maintenance Sweep: useSavedPokemon Split & Housekeeping)

Split out of `COMPLETED.md` at the 2026-10-19 Maintenance Sweep:
useSavedPokemon Split & Housekeeping boundary (see `MILESTONES.md`) - named
with the milestone slug since it shares its date range with the Profile
Social Scoping & Maintenance archive
([docs/archive/completed-2026-10-19-to-2026-10-19.md](completed-2026-10-19-to-2026-10-19.md)).

**Split useSavedPokemon.ts (Leg 1)** - 2026-10-19
`useSavedPokemon.ts` had grown to 685 lines; mirrored the `useTeams.ts` split
by moving pure load-path migration logic to `utils/savedPokemonMigrations.ts`
and the sync-reconciliation algorithm to a pure `reconcileSyncedSavedPokemon`
in `utils/savedPokemonSyncReconciliation.ts`, with CRUD mutators staying in
the hook behind two new shared helpers (`commitSavedPokemon`,
`updateEntryById`) needed to clear the cap given this file's heavier doc
comments. `/leg-review` flagged a stale `ARCHITECTURE.md` reference (fixed in
the same commit) and a pre-existing (not introduced here) sync-reconciliation
gap - `reconcileSyncedSavedPokemon` doesn't migrate incoming records the way
`reconcileSyncedTeams` does - now tracked as its own TODO.md item. File is
497 lines. See commit def5a86.

**Comment Hygiene Sweep (Leg 2)** - 2026-10-19
Fixed the three change-history comments flagged by the 2026-10-16 Project
Revision v2 audit (`App.tsx`, `TeamOverflowMenu.tsx`, `pokeapi.test.ts`) -
each rewritten to state the current behavior/rationale in present tense
instead of narrating what it used to do. Grepped the renderer for the same
narration patterns ("used to", "previously", "no longer", etc.) as a
broader spot-check: most hits turned out to be legitimate - either a real
WHY (a race-condition/gotcha the comment explains to prevent regressing),
or part of this codebase's established "Leg N, see TODO.md" architectural-
provenance convention (BoxPage.tsx, AppWeb.tsx, TeamPickerDropdown.tsx,
etc.) or dated data-source citations in `config/` files, both out of scope
for this sweep. Three more genuine no-value instances were rewritten
anyway (`damageCalcEngine.ts`'s `STATUS_LABELS`, `clonePokemon.ts`,
`CalcLauncherButton.tsx`). Lint and type-check clean. See commit bd9d064.

**Stored-Snapshot Audit (Leg 3)** - 2026-10-19
Grepped `src/renderer` + `worker/src` for persisted fields that are
one-time snapshots (like the old `spriteUrl`) read directly instead of
recomputed from canonical fields, per `.claude/rules/stored-snapshot-vs-
live-recompute.md`. Found and fixed one real instance: `RecordMatchForm.tsx`'s
`snapshotRoster` built the Battle Logger's brought-4 picker from the
stored `ImportedPokemonInfo.spriteUrl` snapshot instead of recomputing via
`getPixelSpriteUrl` - `handleShinyToggle` never rewrites that stored field
(only `handleGenderToggle` does, and only for the four `FORM_DIVERGENT`
species), so a Pokemon toggled shiny after import showed the wrong sprite
in that one picker. Checked and ruled out: `FavoritePokemon.spriteUrl`/
`shinySpriteUrl` (explicitly documented intentional snapshot), `types`/
`baseStats` (always refreshed together through `enrichPokemonWithAPI`),
`calculatedStats` (declared but never populated), `Battle.playerRoster`
as a whole (already-documented intentional historical snapshot), and
several Statistics/Speed Tiers/Type Matchup sprite reads (species-keyed
cache data, no gender/shiny concept). Full findings in
`docs/investigations/stored-snapshot-audit.md`. Full suite (875 tests),
lint, and type-check clean. See commit 7308853.

This closes all three Done-when criteria for Maintenance Sweep:
useSavedPokemon Split & Housekeeping - milestone ready for
`/close-milestone`.
