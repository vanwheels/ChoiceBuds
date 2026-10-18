---
paths:
  - "src/renderer/hooks/**"
  - "src/renderer/services/**"
---

# Correcting already-persisted data

A fix that corrects data already saved to disk must bump `updatedAt` and
write through the real mutator (the hook's normal save path), not a
read-boundary-only correction applied at display time. If sync is enabled
for the collection being touched, a display-only fix never actually
propagates — the stale/wrong value is still what gets synced.

Before changing what an existing field means (not just its value), grep
every call site first. A field-meaning change that passes its own tests but
missed a call site elsewhere is a real regression, not a false alarm —
confirmed live in `sync-clipboard-reliability-fixes` (see
`docs/postmortems/sync-clipboard-reliability-fixes.md`).

A shallow spread-over-defaults migration (`{ ...DEFAULT, ...saved }`) only
backfills a top-level key missing from the saved file entirely — it does
nothing for a *nested* field added later to an object that already exists
on disk (that field just loads as `undefined`). This has hit twice in
`useSettings.ts` (`defaultRegulation`, then `playerProfile`/
`favoritePokemon`'s `updatedAt` — see
`docs/postmortems/public-profiles-and-team-sharing.md`), and the second
time `undefined` dropped out of `JSON.stringify` on sync push and failed
the Worker's required-field check for the *entire* payload, not just the
one singleton. Any field added to an already-live nested singleton or
object needs its own explicit backfill check on load, not just a type
change.
