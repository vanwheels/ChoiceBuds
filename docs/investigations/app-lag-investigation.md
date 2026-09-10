# App Lag Investigation

`[Investigate App Lag] — Leg 1`, UI Polish & Performance milestone. Root-caused
via static analysis + real userData file measurements, not live profiling —
see "Why no live repro" below for why that turned out to be unnecessary to
reach a confident diagnosis.

## Finding

The lag isn't dev-vs-prod (`npm run dev` vs. a packaged build) — it's a
structural persistence pattern present in both, and it gets *worse over
time* as the on-disk caches grow, which matches "the app has started to
lag" (implying it wasn't laggy originally) better than any dev-tooling
explanation would.

**`useGameData.ts` persists its entire cache object to disk on every single
mutation**, not just on user-driven saves:

```ts
// useGameData.ts:104-109
useEffect(() => {
  if (!isInitialized || !cache) return;
  window.electron.writeGameDataCache(cache).catch(...);
}, [isInitialized, cache]);
```

Every `getMoveData`/`getItemData`/`getAbilityData`/`getSpeciesLearnset`/
`getChampionsUsage` cache-miss resolves through `cacheManager.ts`'s
`runCachedFetch`, which calls `setCache(prev => withCacheEntry(prev, ...))`
— a full shallow copy of the *entire* `GameDataCache` object for one new
key. That state change re-runs the effect above, which serializes and
writes the **whole cache** (`JSON.stringify(data, null, 2)` in
`fileHandlers.ts`'s `file:write-game-data-cache` handler, then an atomic
temp-write + rename) — not just the one new entry.

`useDatabase.ts` (`pokeapi-cache.json`) does the same thing for
`setCacheEntry`.

### Why this compounds instead of staying flat

Cache entries "never expire" by design (`NEVER_EXPIRES`, see CLAUDE.md), so
`game-data-cache.json` only ever grows. Measured live on this machine:

| file | size | entry counts |
|---|---|---|
| `game-data-cache.json` | 2.1 MB | 676 moves, 167 items, 203 abilities, 258 learnsets, 224 usage |
| `pokeapi-cache.json` | 144 KB | (species stats/types) |

`JSON.stringify(data, null, 2)` on the current 2.1 MB object measured
**~6.3 ms** per call (Node, this machine — `JSON.stringify` compact was
~4.1 ms). That's cheap in isolation, but:

- It runs in the **main process**, which is single-threaded — every one of
  these stringify+write calls blocks IPC/window responsiveness for its
  duration, and disk I/O (temp-file write + rename) adds more on top,
  more on Windows specifically (Defender real-time scanning newly-written
  files is a known source of extra latency per write, not measured here).
- It happens **once per cache entry**, not once per batch.

### The actual burst: `useUsageSync`

`useUsageSync.ts` re-syncs Champions ranked-usage data for every roster
species whose cached entry has expired (5-day TTL) — and per its own doc
comment, **this runs on every app launch**, not just first-launch like
`useInitialSync`. `runWithConcurrency` (`utils/concurrency.ts`) resolves 8
items at a time, each one independently calling `getChampionsUsage` →
`setCache` → the write-through effect above.

Since the whole legal roster's usage entries were originally seeded close
together, their 5-day TTLs tend to expire close together too — so a given
launch can hit a burst where most/all ~224 roster species are "stale" at
once. That's up to ~224 sequential full-object writes of a 2+ MB file,
serialized through `atomicWriteFile`'s per-path write queue (it doesn't let
these run concurrently even though the fetches themselves do), on **every
launch that happens to land after a TTL-expiry wave**. `useInitialSync`
itself is not implicated the same way post-first-sync — it gates on
`lastSyncedSpeciesNames` and does nothing once the roster is fully synced
(confirmed: this machine's roster is fully synced, so `useInitialSync`
currently runs zero network calls on launch).

### Secondary smell (not measured, but worth noting for the fix)

`useGameData`'s `items` (`useMemo`) and every `getCached*` callback
recompute whenever *any* part of `cache` changes — a `usage` write
invalidates the same memo/callback identities as a `moves` write, so any
component consuming `useGameData()`'s return value re-renders on cache
mutations unrelated to what it actually reads. Not the primary suspect
(re-render cost of returning a stable reference is cheap next to a 2 MB
disk write), but compounds the same burst.

## Why no live repro (dev vs. packaged) was needed

The mechanism above is pure JS/IPC/fs behavior — identical in `npm run
dev` and a packaged build (Vite/esbuild's dev-vs-prod differences don't
touch how `useGameData`'s effect or the main-process file handlers work).
A live A/B would have cost real time to set up (build + launch both,
instrument, compare) without changing the diagnosis, so this stopped at
the static/measured evidence above rather than doing that pass — flagging
this as a deliberate scope call, not an oversight, in case a live
before/after profile of the *fix* (rather than of dev-vs-prod) is wanted
in the follow-up leg instead.

## Recommended fix direction (next leg, not done here)

Leg 1 was investigation-only. The fix belongs in a new TODO item — likely:

- Debounce/batch the write-through effects in `useGameData.ts` and
  `useDatabase.ts` (e.g. write once after a burst of mutations settles,
  not once per mutation) — the biggest lever, since it turns an O(n) full-
  file-writes-per-sync-batch into O(1).
- Consider writing only the changed section/entries instead of the whole
  object, if the IPC/file-format boundary allows it without a bigger
  refactor.
- The `items`/`getCached*` cross-section re-render smell above is optional
  cleanup, not required for the main fix.
