# Web Transition Playbook (ChoiceBuds → GW2 Squaded handoff)

Written for the future Claude Code session doing GW2 Squaded's web build.
This is a transfer of lessons from porting ChoiceBuds (an Electron + React +
TypeScript app) to a browser-hosted web build, so that work doesn't
rediscover the same traps from scratch. It's a one-time handoff doc, not a
living spec — GW2 Squaded's own CLAUDE.md/TODO.md own its actual plan once
that work starts.

ChoiceBuds' own current state of this effort lives in its `TODO.md` under
the Web Client Bug Fix Sweep / Web Version milestones (see `MILESTONES.md`)
— read those for what's still unported/unfixed there if useful as a
reference point, but don't treat this doc as needing to track them going
forward.

## 1. The core problem and the shape of the fix

An Electron app's renderer code normally reaches persistence through a
`window.electron` bridge (`contextBridge` + `ipcMain.handle`) that only
exists inside Electron's renderer process. A web build has no main process
behind it, so every one of those calls needs a browser-native equivalent —
but the renderer code shouldn't have to know or care which one it's talking
to.

The fix: define a small storage-adapter interface, write two
implementations (one wrapping the existing Electron bridge, one wrapping a
browser storage API), and have the interface be the only thing app state
hooks depend on. See ChoiceBuds' `src/renderer/services/storage/`:

- `StorageAdapter.ts` — the interface itself: `read<T>(key)` /
  `write<T>(key, value)`, keyed by a **closed string union** (`StorageKey`),
  not a plain string. Every new resource you port adds one union member
  here, forcing a matching case in both adapters — this is what catches a
  forgotten adapter branch at compile time instead of a silent runtime
  no-op.
- `electronAdapter.ts` — thin wrapper delegating to `window.electron`.
- `indexedDBAdapter.ts` — the new one. One IndexedDB database, one object
  store, keyed by `StorageKey`. (IndexedDB over `localStorage`: no
  practical size ceiling, and ChoiceBuds' persisted blobs are full
  JSON databases, not small key-value pairs — `localStorage`'s ~5-10MB
  synchronous-API ceiling would be a real risk for that shape of data. If
  GW2 Squaded's web data is small and simple, `localStorage` may be
  simpler and sufficient — don't default to IndexedDB without checking.)
- `index.ts` — picks between the two adapters with `getStorageAdapter()`,
  a **lazily-initialized singleton** (checked on first real call, not at
  module-eval time). This mattered because the Electron/web decision is
  `typeof window !== 'undefined' && window.electron ? ... : ...`, and in
  tests a mock `window.electron` gets installed by a `beforeEach` hook that
  runs *after* the module graph is first imported — an eager top-level
  check would sometimes resolve before the mock exists and wrongly cache
  the web adapter for an entire Electron-targeted test file. If GW2
  Squaded's test setup installs its Electron-equivalent mock the same way
  (a `beforeEach`, not a module-level stub), make this lazy for the same
  reason.

Every state hook that needs to work on both desktop and web (ChoiceBuds
ported `useTeams`/`useDatabase` first) persists through this adapter
instead of calling `window.electron` directly. Hooks not yet ported just
keep calling `window.electron` directly and simply don't work on the web
build yet — that's fine as an incremental state; port one hook at a time,
not all-at-once.

## 2. The second entry point, not a second app

Resist the temptation to fork the app. ChoiceBuds' web build is a sibling
*entry point* into the same renderer code, not a parallel codebase:

- `web/` — its own `index.html` + `main.tsx` + `vite.config.ts`, but it
  **shares the root `package.json`'s `node_modules`** rather than being a
  standalone project (contrast with ChoiceBuds' `worker/`, which genuinely
  is a separate Cloudflare runtime with its own `package.json` — don't
  confuse the two shapes). The web Vite config sets `root` to `web/`,
  `publicDir` to the project's existing `public/`, and aliases `@` to the
  *same* `src/renderer` the Electron build uses — so every component,
  hook, util, and type file is reused verbatim.
- `src/renderer/AppWeb.tsx` — a web shell **sibling** to `App.tsx`, not a
  modification of it. Only wires up the hooks that have actually been
  ported to the storage adapter. Trying to make one `App.tsx` conditionally
  branch between Electron and web would tangle both code paths together;
  keeping them as two top-level components that both render the same
  lower-level pieces (pages, cards, etc.) keeps the actual shared surface
  — which is almost everything below the top-level shell — genuinely
  shared, and the genuinely-different surface (what's wired up, what nav
  exists) cleanly separate.
- Two separate dev server ports (ChoiceBuds: 5173 Electron, 5174 web) so
  both can run side by side without colliding.
- A second `npm run build:web` / `tsc` type-check script, output to its own
  `dist/web/` — don't reuse the Electron build's output directory.

## 3. Ship the web build as a static deploy, separately from desktop releases

ChoiceBuds' `.github/workflows/deploy-web.yml`: on every push to `main`,
`npm run build:web` then publish `dist/web/` to GitHub Pages via
`actions/upload-pages-artifact` + `actions/deploy-pages`. This is
deliberately a **separate** workflow from the one building desktop
installers (`release.yml`, tag-triggered) — the web build ships
continuously on every main push since it's a static SPA with no install
step for the end user, while desktop releases are a deliberate, versioned,
user-facing event. Don't merge these into one workflow just because they
share a build step.

## 4. Bugs this surfaced that are worth watching for proactively

These weren't hypothetical risks — they were real, user-reported bugs
found during ChoiceBuds' web rollout. Both are generic React patterns, not
web-specific, but the web port's heavier async-persistence surface (every
mutation now round-trips through IndexedDB/an adapter instead of a
synchronous-feeling IPC call) is what surfaced them in practice.

### a) The lost-update race

**Symptom:** a field edit needs two tries to "stick," or a mutation applied
and then reverted on its own a few seconds later. Also showed up as a
hold-to-repeat control (e.g. an EV stepper) silently dropping some of its
rapid-fire updates.

**Root cause:** a hook's mutators each built their "next state" by reading
the *same* React-closured state variable (e.g. `teams` from `useState`) and
writing their own `[...closuredState, myChange]` independently. Two
mutations fired back-to-back, before React re-renders between them, both
read the same stale base, and whichever write finished last won — silently
discarding the other, regardless of which was issued last.

**Fix:** (see `useTeams.ts` in ChoiceBuds)
1. A `useRef` (`teamsRef`) holding the authoritative current state,
   **updated synchronously the instant a mutation computes its result**
   (not just once React re-renders and the `useState` value catches up).
2. Every mutator reads its base from that ref, never from the `useState`
   closure.
3. A single serializing write queue (`writeQueueRef`, a chained Promise)
   that every mutation goes through (`enqueueMutation`), so writes also
   land on storage in strict issue order, not just in-memory order.

If GW2 Squaded's web port has any hook with more than one mutator touching
shared array/object state, audit it for this shape before shipping, not
after a bug report — ChoiceBuds found three hooks sharing the exact
"closure over state array + persist via adapter, no serialization" shape
after fixing the first one (see its `TODO.md`'s "Audit Sibling Hooks"
item). It's cheap to get right the first time and annoying to track down
from a vague "fields don't save right" report.

### b) The stale-local-state prop-resync bug

**Symptom:** a value updates correctly in the underlying data (confirmed in
storage/devtools) but a component keeps displaying the old value until a
remount.

**Root cause:** `const [local, setLocal] = useState(prop)` only reads
`prop` on first mount. If something *other* than this component's own
`onChange` handler updates the prop later (an externally-applied update —
e.g. a "pick an existing saved value" action elsewhere in the tree that
bypasses this component's own optimistic click handler), the component's
local state silently goes stale and never re-syncs.

**Fix:** the "adjust state during render" resync pattern — not a
`useEffect`, which would fire a render late and show a one-frame flash of
stale content:

```tsx
const [local, setLocal] = useState(prop);
const [prevProp, setPrevProp] = useState(prop);
if (prop !== prevProp) {
  setPrevProp(prop);
  setLocal(prop);
}
```

This resets `local` synchronously within the same render pass whenever
`prop` changes, with no intermediate stale frame and no effect re-firing on
every incidental re-render (only on an actual prop change). ChoiceBuds has
this pattern in a few places by now (`TeamCard.tsx`'s `rosterIdsKey`,
`CalcTeamTray.tsx`'s `preferredTeamId`) — worth a small shared hook if GW2
Squaded needs this more than once or twice (ChoiceBuds hasn't extracted one
yet either, for what it's worth).

### c) Ordering/position isn't mergeable under last-write-wins sync

**Symptom:** a reorder (drag-and-drop list position) visibly applies, then
silently reverts a few seconds later — timed suspiciously close to a sync
interval, not a render or a remount.

**Root cause:** this one isn't the lost-update race or the stale-prop bug
above — it's a genuine sync-protocol gap, only possible once you add
cross-device sync (see ChoiceBuds' separate Worker-based sync, section 6
below) on top of the web port. A per-record last-write-wins merge resolves
conflicts on a record's own *fields* (whichever write has the newer
timestamp wins), but list *position* isn't a field on any single record —
it's an emergent property of the whole collection's array order. Nothing
about reordering touched any record's `updatedAt`, so the merge had no
signal that anything had changed, and the next sync round-trip silently
re-applied the old order.

**Fix:** (see ChoiceBuds' `Team.sortOrder` field) give the thing being
reordered its own explicit position field, and bump it (alongside the
record's normal `updatedAt`) every time it moves. That turns "list order"
back into a per-record field the existing last-write-wins merge already
knows how to resolve, instead of a cross-record concern the protocol has
no way to see.

If GW2 Squaded ever syncs anything the user can manually reorder (a list,
a priority ranking, a kanban-style board), decide the position-field shape
up front rather than discovering it the same way ChoiceBuds did — via a
live bug report a few seconds after a drag-and-drop.

## 5. Incremental porting, not a big-bang rewrite

Port one hook/page at a time, not everything at once. ChoiceBuds ported
`useTeams` and `useDatabase` first (the two most load-bearing), wired a
minimal `AppWeb.tsx` around just those, and shipped a working-but-partial
web build — other hooks still call `window.electron` directly and the web
build simply doesn't support those features yet. This kept each porting
step small, testable, and shippable on its own, rather than holding the
whole web build back on every single hook being ready.

**Caveat found later (Web Species Search Cold-Cache Stats):** a hook you
*do* port can still come up silently empty on web if it implicitly
depended on another hook's eager-sync behavior that hasn't been ported
yet. ChoiceBuds' desktop build runs `useInitialSync` on every launch to
eagerly backfill the full legal-species stat cache; the web build never
runs it, so the stat table's cache join was empty until a species
happened to get looked up some other way. Nothing errored — the ported
hook worked exactly as written, it just had cold data to work with. The
fix was a separate, non-gating background prefetch for web specifically,
not a port of `useInitialSync` itself. When porting a hook, check whether
it reads a cache that something *else* (not yet ported) was responsible
for keeping warm, and don't assume "the hook works" means "the hook has
data" on first web load.

## 6. What to decide early that ChoiceBuds didn't

- **Mobile/touch support** — ChoiceBuds' web build still needs a dedicated
  mobile-friendliness pass (deferred, flagged as a standing concern — see
  its own memory/TODO). If GW2 Squaded's web audience is meaningfully
  mobile, decide this up front rather than retrofitting breakpoints/touch
  targets after the desktop-browser layout is already locked in.
- **Account model, if any** — ChoiceBuds' web app works fully signed-out;
  an optional account only unlocks cross-device sync. If GW2 Squaded's web
  build might eventually need sync, decide now whether an account is
  required or optional — optional is harder to retrofit later than to
  design in from the start.
- **What "sync" even means, if you need it** — ChoiceBuds' cross-device
  sync (separate from this web-build effort entirely) is deliberately
  manual, one-directional-at-a-time (push *or* pull, user-triggered), not
  continuous background sync, specifically because there's no backend
  arbitrating real conflicts. If GW2 Squaded needs multi-device state,
  decide whether continuous sync is actually necessary before building it
  — it's a much bigger problem (conflict resolution) than manual
  push/pull.
