# Cross-device sync (Worker)

Deep-dive split out of `ARCHITECTURE.md`; the summary there links here.

- `worker/` — a standalone Cloudflare Worker (own `package.json`/
  `wrangler.toml`), storing one JSON blob per pairing identifier in Workers
  KV via `PUT`/`GET /sync/:identifier`. No accounts, no auth beyond the
  identifier itself — infrastructure each user deploys and owns themselves
  (see `worker/README.md`).
- `src/renderer/services/syncApi.ts` — the only renderer code that talks to
  the Worker's HTTP API; pushes/pulls the app's `TeamsDatabase`/
  `BattlesDatabase` as one `SyncPayload`.
- `src/renderer/hooks/useSync.ts` — orchestrates sync. Deliberately manual
  and one-directional-at-a-time (push *or* pull, user-triggered) rather than
  continuous background sync, since there's no backend arbitrating real
  conflicts.
- Unrelated despite the similar name: `useUsageSync.ts` keeps
  `ChampionsUsageEntry` ladder-usage data fresh from championsbattledata.com
  — nothing to do with this cross-device Worker sync.
- `useTeams.ts`/`useBattles.ts`/`useSavedPokemon.ts`'s own `applySyncedState`
  all reconcile rather than blindly overwriting local state with a
  pull/push response: per record, each keeps whichever side (local vs. the
  response) has the newer `updatedAt`, rebuilds its base order from local
  order (not the response's) so a locally-added record the response doesn't
  know about yet keeps its position instead of landing at the end, and
  drops any response record that still has a pending local tombstone rather
  than letting a late response resurrect a local delete — see
  `docs/investigations/teamcard-notes-sync-race.md` for the race this
  closes (first fixed in `useTeams.ts`, then mirrored into the other two).
  `useTeams.ts`'s own version of this algorithm is a pure
  `reconcileSyncedTeams` in `utils/teamSyncReconciliation.ts` (split out of
  the hook itself, see Split useTeams.ts in COMPLETED.md); `useSavedPokemon.ts`
  mirrors that as `reconcileSyncedSavedPokemon` in
  `utils/savedPokemonSyncReconciliation.ts` (see Split useSavedPokemon.ts in
  COMPLETED.md). `useBattles.ts` still keeps theirs inline. Both
  `reconcileSyncedTeams` and `reconcileSyncedSavedPokemon` also run every
  incoming sync-merge-sourced record through the same normalization the
  load-path migration applies (`normalizeIncomingSyncTeam`/
  `normalizeIncomingSyncSavedPokemonEntry`), bumping `updatedAt` only when
  that changed something sync-relevant, so a corrected copy can out-rank a
  stale sender on the next push — see
  `.claude/rules/sync-merge-migration-parity.md` for why this has to mirror
  the load path and not just run there.
- `GET /profile/:username` (no auth) is the one place the Worker reads
  inside an otherwise-opaque `Team`/`SavedPokemonEntry` record on purpose —
  `worker/src/publicProfile.ts`'s pure `extractPublicTeam`/
  `extractPublicFavoritePokemon` filter the stored `SyncPayload` down to
  whichever teams/the account's `FavoritePokemon` are toggled visible
  (private by default), dropping a team whose name fails `safetyFilter.ts`'s
  check entirely and blanking just a Pokémon's nickname if that fails
  instead (Public Profiles: Per-Item Visibility Toggles, see TODO.md).
  `FavoritePokemon` keeps the original binary `isPublic` toggle; a `Team`
  instead carries a 3-state `visibility` (`'private'`/`'closed'`/`'open'` —
  Teamsheet Open/Closed Visibility Tiers, see TODO.md/COMPLETED.md): a
  `closed` team exposes species/nickname/sprite only (the original exposure
  shape), an `open` team additionally exposes its full competitive set
  (item/ability/moves/EVs/nature) per Pokémon. An existing `isPublic: true`
  team migrated to `closed`, never `open`, on `TeamsDatabase`'s
  schemaVersion 1-to-2 bump (`utils/teamMigrations.ts`'s
  `migrateTeamsDatabase`/`normalizeTeam`, split out of `useTeams.ts` itself
  — see Split useTeams.ts in COMPLETED.md) — widening to the new full-set
  tier needs an explicit choice, not a silent migration. `FavoritePokemon`
  is a second account-wide singleton alongside `PlayerProfile`, merged the
  same `mergeSingleton` last-write-wins way.
  A Team Pokemon's own stored `spriteUrl` field is a static value captured
  once at import time and is never shiny-aware (every real on-screen card
  in the renderer recomputes it live instead via `utils/spriteUrl.ts`'s
  `getPixelSpriteUrl`, which does respect the live `shiny` flag), so
  `extractPublicPokemon` recomputes it the same way from the record's own
  `pokedexNumber`/species/gender/shiny via `worker/src/spriteUrl.ts` — a
  hand-duplicated port of that same renderer function, same "separate build
  targets, no shared package" reasoning as `safetyFilter.ts` — falling back
  to the stored field only when `pokedexNumber` is missing/malformed (very
  old data predating that field).
- The order teams appear in on a profile is its own field, `Team
  .profileOrder` — deliberately separate from the private Teams tab's own
  `sortOrder` (Drag-to-Rearrange Previewed Teams, see TODO.md/COMPLETED.md),
  since reordering one must never silently reorder the other.
  `handleProfileGet` sorts by it (`worker/src/publicProfile.ts`'s
  `sortTeamsForProfile`) before `extractPublicTeam` filters/shapes the
  result; the renderer's `useTeams.ts::setProfileTeamOrder` stamps it (plus
  a fresh `updatedAt`) only on the teams named in a completed drag on your
  own profile page, leaving every other team - including the array's own
  element order - untouched.
