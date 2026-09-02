# `set-state-in-effect` lint rule fix — scoping

Scoping pass for the "set-state-in-effect Lint Rule Fix" TODO item. No code
changed by this pass beyond this doc and TODO.md — see CLAUDE.md's
scoping-before-building convention.

## Current state

`eslint.config.js` disables `react-hooks/set-state-in-effect` file-wide for
six files: `useTeams.ts`, `useSettings.ts`, `useSavedPokemon.ts`,
`useBattles.ts`, `useDatabase.ts`, `useSync.ts`. These are the leftover 6 of
the 13 files found in the 2026-07-14 investigation (see COMPLETED.md) — the
other 7 were fixed for real that session using React's "adjust state during
render" pattern, which doesn't apply here (that pattern is for
derived-state-reset, not genuine async data fetching on mount).

## What the rule actually flags here (verified empirically)

Ran eslint with the rule temporarily forced to `warn` (`--rule
'{"react-hooks/set-state-in-effect":"warn"}' --no-inline-config`) against
all 6 files. Result: **exactly one violation per file**, always the same
shape — a mount `useEffect` calling a component-scope-defined loader
function by reference:

```ts
useEffect(() => {
  loadTeamsFromDisk(); // <- flagged: "Avoid calling setState() directly within an effect"
}, []);
```

Confirmed via two throwaway reproductions (not committed) exactly what
trips the rule:

- A loader defined as a **named function in outer/component scope** and
  called by reference from the effect gets flagged, **even when its own
  first statement is an `await`** (i.e. even with zero synchronous setState
  before the first await) and **even when nothing else calls it**. This
  is why `useDatabase.ts`'s `initializeCacheWithSWR` (whose body starts
  with `await window.electron.readPokeAPICache()`, no sync setState at the
  top at all) still trips it — the rule doesn't do before/after-await
  analysis, it just conservatively flags any traceable call from an effect
  to a local function whose body (transitively) contains a setState call.
- The **same logic inlined directly inside the effect callback** — i.e.
  React's own canonical "fetch in effect" example from
  https://react.dev/learn/you-might-not-need-an-effect#fetching-data (an
  `async function startFetching() {...}` declared and invoked inside the
  effect body, plus an `ignore` flag guard) — is **not flagged at all**.
  The rule specifically recognizes that inline shape as the accepted
  data-fetching-in-effect idiom.

So the fix isn't about the loading-state semantics being wrong (they
aren't) — it's that these hooks reuse one outer-scope function for both the
mount path and a manually-triggered `refresh*()` path, and that reuse is
exactly what defeats the rule's recognized inline-fetch pattern. This
confirms the diagnosis already written in `eslint.config.js`'s header
comment.

## Fix pattern (5 of 6 files: `useTeams`, `useSettings`, `useSavedPokemon`,
`useBattles`, `useDatabase`)

All five share the identical shape: one `load*FromDisk`/
`initializeCacheWithSWR` function, called from a `useEffect(() => {...},
[])` on mount and reused by a `refresh*()` callback exposed to consumers.
In every case the loader's opening `setIsLoading(true)`/`setError(null)`
(or equivalent) are no-ops on the mount path specifically, since
`isLoading`/`error` already start at `true`/`null` — they only matter for
the refresh path, which re-enters after the initial load.

Fix: split into two copies of the same body —
1. **Inline the mount-path version directly inside the `useEffect`
   callback**, matching React's own accepted fetch-in-effect shape (inline
   `async function`, called inline, `ignore`-flag guard against
   post-unmount setState). This satisfies the linter and is a legitimate
   improvement on its own (the current code has no unmount guard at all,
   so a fast unmount-before-load-resolves could warn-log a setState-after-
   unmount today — not confirmed to have caused a real bug, just a gap the
   accepted pattern happens to close for free).
2. **Keep the existing outer-scope function as the `refresh*()` path only**
   — untouched otherwise (it's never called from an effect, so the rule
   doesn't care about it).

This duplicates the load logic once (mount inline vs. refresh named), which
is the same shape `eslint.config.js`'s comment already anticipated
("splitting each into an effect-safe silent variant and a refresh
variant"). Per file this is a small, mechanical, same-pattern change - no
behavior change to what gets fetched or when, just where the two copies of
the fetch logic live. `useDatabase.ts` is the same shape but slightly
larger (the SWR revalidation step chains a second async call
`performBackgroundRevalidation` after the initial read) - same fix, just
more to inline.

None of the 5 files are near CLAUDE.md's ~300-line soft cap after adding a
few lines of duplicated inline logic (current line counts: `useTeams.ts`
283, `useSettings.ts` 147, `useSavedPokemon.ts` 168, `useBattles.ts` 219,
`useDatabase.ts` 298).

## Fix pattern (1 of 6: `useSync.ts`)

Different shape, more work. `refreshStatus` is called both from the mount
effect (keyed on `syncIdentifier` only, with an existing
`exhaustive-deps` suppression - `push()`/`pull()` deliberately don't
retrigger it) *and* from `push()`/`pull()` with an `overrides` param (fresh
`lastPushedAt`/`lastPulledAt` values not yet visible via the closed-over
`settings`, since those callers `updateSettings()` and `refreshStatus()` in
the same async call). The mount-effect call never passes `overrides`; the
`push`/`pull` calls always do. Two early-return branches
(`!syncIdentifier`, both timestamps `null`) setState synchronously with no
await at all - the shape the `eslint.config.js` comment describes as
`useSync.ts`'s specific variant.

Simply duplicating the whole body (like the other 5) would duplicate real
branching logic, not just a fetch call. Cleaner fix: extract a pure
`computeSyncStatus({ identifier, effectivePushedAt, effectivePulledAt })
=> Promise<SyncStatus>` with **no setState calls at all** - just the
existing branching/fetch/compare logic, returning the resulting
`SyncStatus`. Then:
- `refreshStatus` (unchanged call sites in `push`/`pull`) calls it and does
  `setStatus(result)` - fine, never called from an effect.
- The mount effect inlines its own tiny async callback that calls
  `computeSyncStatus({ identifier: syncIdentifier, effectivePushedAt:
  lastPushedAt, effectivePulledAt: lastPulledAt })` then `setStatus(...)`,
  preserving the current `[syncIdentifier]`-only dependency array (and its
  existing `exhaustive-deps` suppression - unrelated pre-existing
  suppression, not part of this fix).

This avoids duplicating the actual status-computation logic - only the
thin "call it, then setStatus" wiring is duplicated (~5 lines each site).

## Test coverage

`useTeams.test.ts`, `useSettings.test.ts`, `useSavedPokemon.test.ts`,
`useDatabase.test.ts`, `useSync.test.ts` already exist. **`useBattles.ts`
has no test file** - worth adding basic coverage (mirroring
`useTeams.test.ts`'s shape, its closest sibling) as part of this fix rather
than fixing it blind, since it's the one file in this batch with zero
existing test safety net.

## Suggested legs

- **Leg 1**: the 5 uniform files (`useTeams`, `useSettings`,
  `useSavedPokemon`, `useBattles`, `useDatabase`) - same mechanical pattern
  each, plus adding `useBattles.test.ts`. Remove those 5 filenames from the
  `eslint.config.js` override (keep `useSync.ts` disabled, update the
  comment to say why only it remains).
- **Leg 2**: `useSync.ts` - the `computeSyncStatus` extraction, its own
  smaller surface but the one requiring most care given the
  overrides-vs-closure timing comment already in the code. Remove the rule
  override entirely once done (whole `eslint.config.js` block can go, or
  shrink to nothing left to disable).

Both legs: run the existing test suites plus `npm run lint` after each, and
manually smoke-test the affected hook's mount + refresh paths live (Teams
page load, Settings load, a Saved Pokémon reload, a Battle reload, first-
launch cache init, and Sync's status badge after a push/pull) per this
project's default manual-verification-for-UI convention - no `run-desktop`
run needed since none of this touches persisted-state mutations in a way
manual checking can't see.
