---
paths:
  - "src/renderer/hooks/**"
---

# Sync-merge migration parity

Any load-path migration or normalization step added to a persisted,
syncable collection must also run on records merged in through that
collection's own `applySyncedState`, not just on load. A sync pull can hand
back a legacy-shaped record from a device that hasn't picked up the
migration yet; if `applySyncedState` doesn't normalize it the same way the
load path does, that stale-shaped record can win the merge (newer
`updatedAt`) and read back with the new field `undefined` until the next
reload re-runs the load-path migration.

This has now hit three times: `docs/investigations/teamcard-notes-sync-race.md`
first, then `Team.visibility` during Profile System Revamp: Foundation Leg
3 (fixed via `normalizeIncomingSyncTeam` routing every sync-merge-sourced
team through `normalizeTeam`, bumping `updatedAt` only when normalization
actually changed something sync-relevant so the fix can out-rank the
stale sender on the next push), then the same gap in
`reconcileSyncedSavedPokemon` during Team Editor & Box Fixes Leg 5 (fixed
via the mirrored `normalizeIncomingSyncSavedPokemonEntry`). All three
hooks (`useTeams.ts`/`useBattles.ts`/`useSavedPokemon.ts`) have now had
this check applied at least once — `useBattles.ts` is next in line if it
ever gains a load-path migration, since it hasn't needed one yet.

When adding a migration to `useTeams.ts`/`useBattles.ts`/
`useSavedPokemon.ts`'s load path, check that collection's
`applySyncedState` for the same gap before closing the leg.
