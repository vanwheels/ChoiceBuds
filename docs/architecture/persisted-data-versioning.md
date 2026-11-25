# Persisted data versioning

Deep-dive split out of `ARCHITECTURE.md`; the summary there links here.

Every persisted collection (`TeamsDatabase`, `BattlesDatabase`,
`SavedPokemonDatabase`, `GameDataCache`, `AppSettings`) carries a
`schemaVersion` field (currently `1` for all of them) and a matching
migration hook — `migrateTeamsDatabase`/`migrateBattlesDatabase`/
`migrateSavedPokemonDatabase` in their respective hooks,
`migrateGameDataCache` in `utils/cacheManager.ts`, and `useSettings.ts`'s
existing spread-over-defaults merge. Each hook backfills a missing
`schemaVersion` to `1` in memory on load rather than rewriting the file; a
future format change bumps the number and adds the real migration logic to
the matching hook.
