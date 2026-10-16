# Sibling hooks lost-update race audit

Audit pass for "Audit Sibling Hooks for useTeams' Lost-Update Race" Leg 1
(see TODO.md). No code changed by this pass — findings only, to scope
Leg 2's fix work.

## The pattern being checked for

`useTeams.ts`'s pre-fix bug (TODO.md's Team Edit Needs Double Action /
Export Shows Stale Data, see COMPLETED.md and
`docs/archive/completed-2026-09-30-to-2026-10-16.md`): a mutator derives
its "next state" by reading the hook's own `useState` value from the
**render closure**, builds `[...closureArray]` or `{...closureObject}`,
persists it, then calls `setX(next)`. Two mutations issued back-to-back
before React re-renders (EV hold-to-repeat timers, two quick field edits,
a bulk loop) both read the *same* stale closure value, each compute their
own "base + my one change," and persist independently — whichever
read/write pair resolves last wins, silently dropping whichever edit
actually lost the race, regardless of issue order.

The fix `useTeams.ts` got: a ref mirroring the state array
(`teamsRef`/`tombstonesRef`), updated synchronously the instant a mutation
computes its result, that every mutator reads as its base instead of the
state closure — plus a `writeQueueRef`-backed `enqueueMutation` serializing
every mutation (including disk I/O) so the underlying writes land in
strict issue order too. A hook needs **both halves** (fresh base + ordered
writes) to actually be immune; either one alone just narrows the window.

## Findings

### `useSavedPokemon.ts` — **Yes, has the race**

Every mutator (`addSavedPokemonBatch`, `renameSavedPokemon`,
`toggleSavedPokemonFavorite`, `updateSavedPokemon`,
`applyPokedexNumberFixes`, `duplicateSavedPokemon`, `setSavedPokemonOrder`,
`deleteSavedPokemon`) reads the `savedPokemon` state closure directly,
builds its next array, and persists with no ref mirror and no mutation
queue:
[useSavedPokemon.ts:312-346](../../src/renderer/hooks/useSavedPokemon.ts#L312-L346)
(`addSavedPokemonBatch`),
[useSavedPokemon.ts:348-369](../../src/renderer/hooks/useSavedPokemon.ts#L348-L369)
(`renameSavedPokemon`),
[useSavedPokemon.ts:398-423](../../src/renderer/hooks/useSavedPokemon.ts#L398-L423)
(`updateSavedPokemon`),
[useSavedPokemon.ts:528-543](../../src/renderer/hooks/useSavedPokemon.ts#L528-L543)
(`deleteSavedPokemon`), and so on for the rest.

This is already self-documented in the code: `applyPokedexNumberFixes`'s
own doc comment
([useSavedPokemon.ts:425-434](../../src/renderer/hooks/useSavedPokemon.ts#L425-L434))
states outright "this hook has no useTeams.ts-style ref+queue mutation
serialization, so N individual updateSavedPokemon calls fired in a loop
would each read the same stale `savedPokemon` closure and silently drop
all but the last one's fix for a user with 2+ affected Box entries." Box
cards are editable in place (`updateSavedPokemon`) and favorited/renamed
from UI controls that can plausibly double-fire the same way `StatsColumn`'s
EV hold-to-repeat did on `useTeams`.

### `useBattles.ts` — **Yes, has the race**

Same shape, same gap. `addBattle`, `updateBattle`, `deleteBattle` all
derive their next array from the `battles` closure with no ref mirror and
no queue:
[useBattles.ts:229-242](../../src/renderer/hooks/useBattles.ts#L229-L242)
(`addBattle`),
[useBattles.ts:244-270](../../src/renderer/hooks/useBattles.ts#L244-L270)
(`updateBattle`),
[useBattles.ts:277-292](../../src/renderer/hooks/useBattles.ts#L277-L292)
(`deleteBattle`).

`updateBattle` is the one most exposed in practice — it's the single
mutator `useBattleLogActions.ts` (Battle Logger's in-progress editing:
add action, add opponent Pokémon, toggle Mega, etc.) funnels every live
battle-logging edit through. A user tapping through several logging
actions in quick succession is the same "two mutations before a
re-render" shape that caused `useTeams`' bug, just via a different UI
trigger than EV hold-to-repeat.

### `useSettings.ts` — **Yes, has the race**

`settings` is a single object rather than an array, but the same closure
pattern applies: both mutators spread `...settings` from the render
closure with no ref mirror and no queue:
[useSettings.ts:136-154](../../src/renderer/hooks/useSettings.ts#L136-L154)
(`setDefaultRegulation`),
[useSettings.ts:160-178](../../src/renderer/hooks/useSettings.ts#L160-L178)
(`updateSettings`).

Two calls issued close together (e.g. a sync completing and writing
`syncUsername`/`syncToken`/`lastSyncedAt` via `updateSettings` at the same
moment the user flips `defaultRegulation` or `boxSortMode`) would race the
same way: whichever `persistSettingsToDisk`/`setSettings` pair lands last
wins, silently discarding the other call's field changes since each built
its own full-object snapshot from the same stale `settings` value.

### `useDatabase.ts` — **No, already immune (different fix, not the ref+queue pattern)**

The hot mutation path, `setCacheEntry`, uses React's **functional
`setState` form** instead of spreading the closure value:
[useDatabase.ts:321-340](../../src/renderer/hooks/useDatabase.ts#L321-L340).
Its own doc comment explains this was already fixed for exactly this
reason — `useInitialSync` fires it "8-way concurrent off one captured
databaseState," and the old closure-spread version silently dropped all
but one new entry per sync pass (the "downloading forever" `LoadingScreen`
bug, see that comment and the referenced investigation). A functional
update always applies against React's latest pending state, not a stale
render closure, so concurrent calls can't stomp each other — this is a
different (lighter-weight, viable for a single nested-map object rather
than an array of independent records) fix for the same underlying lost-
update class of bug, not the ref+queue pattern, but it covers the hot
path.

`clearCache`
([useDatabase.ts:365-375](../../src/renderer/hooks/useDatabase.ts#L365-L375))
is an unconditional overwrite to a fixed empty value, so it has nothing to
lose regardless of ordering.

One residual gap, noted for completeness rather than as a "yes": the
maintenance path (`cleanExpiredEntriesInternal`,
[useDatabase.ts:65-96](../../src/renderer/hooks/useDatabase.ts#L65-L96),
called from `performBackgroundRevalidation` and the public
`cleanExpiredEntries`) still computes its next cache from a
`currentCache` **parameter** (a snapshot, not a functional update) and
commits with plain `setCache(updatedCache)`. If this ever fired
concurrently with a `setCacheEntry` call that lands in between the
snapshot being taken and this `setCache` committing, the cleaned object
would silently drop that entry. In practice this path only runs once per
mount (gated behind a 7-day-since-last-clean check) or via a manual
"clear"-adjacent debug action, never in a tight user-interaction loop like
the other hooks' CRUD mutators — a real but low-probability window, not
worth treating as the same finding class as the other three hooks. Not
recommending a Leg 2 fix for this on its own; flag if it ever shows up as
a real symptom (e.g. species data vanishing right after a cold start).

## Summary for Leg 2

| Hook | Race present | Leg 2 fix needed |
| --- | --- | --- |
| `useSavedPokemon.ts` | Yes | Yes — ref+queue, mirrors `useTeams.ts` |
| `useBattles.ts` | Yes | Yes — ref+queue, mirrors `useTeams.ts` |
| `useSettings.ts` | Yes | Yes — ref+queue (single object, not array — same approach, just one ref instead of per-array-field refs) |
| `useDatabase.ts` | No (functional-setState fix already covers the hot path) | No |
