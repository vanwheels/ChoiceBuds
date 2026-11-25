---
paths:
  - "src/renderer/hooks/useSettings.ts"
  - "src/renderer/types/settings.ts"
---

# Backfilling fields on nested settings singletons

`useSettings.ts`'s `{ ...DEFAULT_SETTINGS, ...database }` merge only
backfills a top-level key that's missing from the saved file entirely — a
nested singleton (`playerProfile`, `favoritePokemon`) that already existed
before a new field was added to its interface keeps that field
`undefined` through the shallow spread. `undefined` then drops out of
`JSON.stringify` on sync push, which the Worker's `isOptionalSingleton`
check rejects, failing the *entire* push. Any field added to an
already-live nested singleton needs its own explicit backfill check (see
the `playerProfile`/`favoritePokemon` `updatedAt` fix,
`docs/postmortems/public-profiles-and-team-sharing.md`), not just a type
change.
