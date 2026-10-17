# TeamCard Notes: Data Loss on First Blur After Expand

Root-cause investigation for TODO.md's "TeamCard Notes: Data Loss on First
Blur After Expand" (TeamCard Bug Fixes & Dev Tooling milestone, Leg 1).

## Repro attempts that didn't work

Scripted repro via `.claude/skills/run-desktop` (expand a disposable test
team, `focus()` the notes textarea, type, dispatch `focusout` immediately -
both with a zero-Pokemon team and with a real 2-Pokemon team) never
reproduced the loss, even stacked back-to-back. The card-expand animation
(`CARD_EXPAND_ENTER_TRANSITION`, 220ms) was the first suspect - typing
during it - but automated rapid-fire attempts against it came back clean
both times. That ruled out the animation itself as the trigger and pointed
at something that doesn't happen on every expand.

## Root cause

`useSync.ts`'s debounced auto-sync, not the expand animation or the
render-time `prevPropNotes`/`localNotes` resync pattern itself (that
pattern is a correct, necessary fix for a *different* bug - see its own
comment in `TeamCard.tsx` - and isn't what's wrong here).

Sequence:

1. Any local team mutation (reordering, adding a Pokémon, favoriting,
   etc.) resets a 5s debounce timer (`AUTO_SYNC_DEBOUNCE_MS`,
   `useSync.ts`). When it fires, `syncNow()` reads `teamsState.teams` and
   pushes that snapshot to the Worker.
2. If the user expands a card and types into Strategy Notes *after* one of
   those mutations but *before* the debounce fires, the push's snapshot
   still has the pre-edit notes - correct, since the edit isn't saved yet.
3. The user blurs the textarea. `onNotesBlur` calls `updateTeam(id, {
   notes })`, which goes through `useTeams.ts`'s `enqueueMutation` queue
   and (usually) resolves fast - it's a local disk write.
4. The push from step 1 is still in flight (real network round-trip). When
   it resolves, `syncNow()` calls `applySyncedState(merged.teams)`, which
   also goes through `enqueueMutation` - queued *after* step 3's call,
   since it was only issued once the network response landed.
5. `applySyncedState` (both before this fix and in sibling hooks still
   unfixed - see below) unconditionally overwrote `teamsRef.current`/
   `teams` with `records`, the Worker's merge of the *stale* pre-edit
   snapshot from step 1. That discards the notes write from step 3, even
   though the enqueueMutation queue ran it first - the queue only
   guarantees write *order*, not that a late-resolving call's payload is
   still current. The notes textarea (driven by `localNotes`, resynced off
   `team.notes` via `TeamCard.tsx`'s render-time `prevPropNotes` check)
   visibly clears.
6. A second type+blur right after works because no sync is in flight
   anymore in that narrow window - matches "typing again and blurring a
   second time saved correctly."

This explains every observed symptom: the intermittency (depends on sync
timing lining up with the edit), "first blur only" (the stale response is
consumed once, then the new state becomes the baseline), and why name/
author rarely showed it (they're usually edited *before* expanding/editing
the roster, i.e. before whatever mutation would have started the 5s
debounce that notes - edited *after* roster changes - is more likely to
land inside).

Confirmed `vanny`'s real app data has sync actively enabled
(`syncUsername`/`syncToken` set), consistent with the global CLAUDE.md note
that work happens across two machines - this path is exercised in normal
use, not just hypothetically.

## Fix

`useTeams.ts::applySyncedState` now reconciles instead of blindly
overwriting: per team, keeps whichever side (local `teamsRef.current` vs.
the sync response's `records`) has the newer `updatedAt`, and keeps any
local-only team `records` doesn't know about yet (the same overwrite flaw
would otherwise silently drop a brand-new team added mid-flight, not just
a field). A team that loses the race this cycle isn't lost - it keeps its
newer local value, and the next debounced sync (its own `teams` reference
changed, so the debounce reschedules) pushes it for real.

See the two new tests in `useTeams.test.ts` right above
`setTeamOrder reorders...`.

## Leg 2: the same race, for deletes

`/leg-review` on Leg 1's fix found it left one shape of the same flaw open:
`reconciled`'s `records.map` fell back to `remote` for any id missing from
`localById`, which also matches a team deleted locally (via `deleteTeam`,
which removes it from `teamsRef.current` and records a tombstone) after the
push snapshot was taken but before the response landed - so the delete lost
the race and the team came back. The unconditional `tombstonesRef.current =
[]` on the same success path compounded it: it discarded that fresh
tombstone too, so the next sync wouldn't even know to tell the server about
the deletion.

Fix: `applySyncedState` now takes a second argument, `pushedTombstones` (the
tombstone list `useSync.ts`'s push actually sent, captured before the
`pushSyncData` call - see its `payload.teamTombstones`). Any `records` entry
whose id still has a pending tombstone in `tombstonesRef.current` is dropped
rather than falling back to `remote`, and only tombstones named in
`pushedTombstones` are cleared - a tombstone added after the push snapshot
stays pending for the next cycle. New regression test in `useTeams.test.ts`
right after the two Leg 1 tests.

## Known follow-up (not fixed here, out of this leg's scope)

`useBattles.ts::applySyncedState` and `useSavedPokemon.ts::applySyncedState`
share the exact same shape (the former's own doc comment says so
explicitly: "mirrors useTeams.ts::applySyncedState") and so share this same
race, unverified live but almost certainly real for the same reason. Not
fixed in this leg since it wasn't the reported bug and touching three sync
paths at once is more than one leg should carry - flagged as a new
TODO.md item instead. This is a different bug class from the closure-based
lost-update race `sibling-hooks-lost-update-audit.md` already covered (that
one was about concurrent mutations racing on a stale `useState` closure;
this one is about a sync response racing a local mutation that already won
the `enqueueMutation` queue).
