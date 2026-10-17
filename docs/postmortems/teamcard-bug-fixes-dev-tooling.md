# Post Mortem: TeamCard Bug Fixes & Dev Tooling

**Shipped:** 2026-10-17 (single-day milestone, 4 done-when criteria across 4
legs, 2 of them multi-commit).

## What shipped

1. **Dev Environment: Mobile Web Preview Script — live verification**
   (`79992b0`) — `npm run dev:mobile` (landed the day before, 2026-10-16)
   hadn't actually been run live yet. Doing so found two real bugs: Node 24
   on Windows throws `spawn EINVAL` through the bare `npx.cmd` shim without
   `shell: true` (fixed by spawning `node` directly against Vite's
   `bin/vite.js`), and the dev machine has no system Chrome at all, so
   `channel: 'chrome'` always failed (fixed with an Opera GX fallback via
   `executablePath`). Fixing the Chrome fallback also exposed a
   cleanup-ordering bug — a failed browser launch orphaned the self-started
   Vite server — fixed by registering `cleanup()` before the throwable
   launch call. Confirmed live end to end afterward.
2. **TeamCard Notes: Data Loss on First Blur After Expand — Leg 1**
   (`d0fa35a`) — root cause was `useSync.ts`'s debounced auto-sync racing a
   local edit: `useTeams.ts::applySyncedState` blindly overwrote local state
   with a stale pre-edit snapshot once a slow sync response landed, even
   though the edit had already won the `enqueueMutation` queue. Fixed by
   reconciling per-team on `updatedAt` instead of overwriting wholesale,
   plus keeping local-only teams the sync response doesn't know about yet.
   Full root-cause trail, including two repro approaches that came back
   clean before the real cause was found, in
   `docs/investigations/teamcard-notes-sync-race.md`.
3. **TeamCard Notes: Data Loss on First Blur After Expand — Leg 2**
   (`f17db5b`) — `/leg-review` on Leg 1 found the same blind-overwrite shape
   still open for deletes: a team deleted locally after the push snapshot
   was taken but before the response landed got resurrected, and its
   tombstone was discarded by the same success path's unconditional reset.
   Fixed by passing `applySyncedState` the tombstone list the push actually
   sent, dropping any `records` entry still carrying a pending local
   tombstone, and clearing only tombstones named in that sent list.
4. **TeamCard Overflow Menu: Validate Popup Covers Own Dropdown — Leg 1**
   (`636b522`) — `TeamValidationButton.tsx`'s result popup was
   `absolute`-positioned over `TeamOverflowMenu.tsx`'s dropdown, hiding
   Export/Export Image/Export PDF/Delete. Made it a normal in-flow element
   so it pushes the rows below down instead.
5. **TeamCard Paste Team: Pasted Card Jumps Before Re-sort — Leg 1**
   (`679abed`, `a506542`) — two compounding causes. `teamPaste.ts`'s
   `buildPastedTeam` carried over the source team's `sortOrder` verbatim,
   tying the pasted card to the team it was copied from instead of leaving
   it untied like a fresh import (fixed by clearing `sortOrder`). That
   surfaced a second, pre-existing bug: once untied, the card correctly
   rendered at the front of its group but jumped to the bottom ~3s later —
   `applySyncedState`'s `reconciled` array built its base order from the
   sync response rather than local order, so any locally-added team the
   response didn't know about yet got appended last on the next auto-sync
   round-trip. Fixed by rebuilding `reconciled` from local order instead,
   merging in the synced version per id only where newer, and appending
   only genuinely remote-only records at the end. This closed the same bug
   independently tracked as a TODO.md item about `applySyncedState` losing
   local-only teams' list position.

Full suite at close: lint/type-check/test all pass, 788 tests across 75
files.

## What went well

- `/leg-review` on Leg 1 of the Notes bug caught a second real race (the
  delete/tombstone case) that the same context, primed to believe its fix
  worked, would likely have missed — same payoff as the Maintenance & Code
  Health Sweep milestone's sibling-hooks review.
- Live-verifying `dev:mobile` instead of treating "it was written" as "it
  works" caught two bugs (`spawn EINVAL`, no system Chrome) that only show
  up on this actual machine, not in code review.
- Fixing the Paste Team card-jump surfaced a second, independently-tracked
  bug (`applySyncedState`'s base-order flaw) and the leg recognized the
  overlap and closed both under one commit pair instead of fixing the
  symptom twice in two different TODO items.
- The root-cause investigation for the Notes bug documented its dead ends
  (scripted repro against the expand animation, both with empty and
  populated teams) in `docs/investigations/teamcard-notes-sync-race.md`
  rather than silently discarding them — useful if the same symptom
  resurfaces and the animation gets re-suspected.

## What didn't / friction points

- The Notes bug and the Paste Team bug turned out to be the same underlying
  flaw (`applySyncedState` building its reconciled list without respecting
  local order/edits) hit from two different angles, and a third sibling
  flaw (the same shape in `useBattles.ts`/`useSavedPokemon.ts`) was found
  but deliberately deferred rather than fixed here. Three legs touching the
  same function in one milestone, with a known fourth fix still open, is a
  sign `applySyncedState`'s reconciliation logic needed one dedicated pass
  across all three hooks rather than being rediscovered independently once
  per symptom.

## Scope creep observed

None against the milestone's own four "Done when" criteria — each was hit
by its own leg(s), no criteria were added mid-flight. The known sibling-hook
gap (`useBattles.ts`/`useSavedPokemon.ts` sharing the same race) was
correctly kept out of this milestone and tracked as its own Unscheduled
TODO.md item instead of folded in.

## What changes for the next milestone

- `useTeams.ts::applySyncedState`, `useBattles.ts::applySyncedState`, and
  `useSavedPokemon.ts::applySyncedState` are three independent
  implementations of the same reconciliation contract (per-record
  `updatedAt` comparison, local-order-preserving base, tombstone-aware
  deletes) that have already drifted twice in one milestone from a single
  bug class. Worth a shared helper once the two sibling hooks are fixed
  (tracked as "Sibling Hooks' applySyncedState Stale-Overwrite Race" in
  TODO.md) rather than a third hand-copied implementation.
