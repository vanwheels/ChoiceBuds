# ChoiceBuds TODO

Working task list for ongoing/planned work. Every item is titled
`[Item/Sweep Name] — Leg N` (say "Start [title]" to kick off a session on
it). Bodies stay short — commit-message-body length, not an investigation
log; deep cross-checks/history belong in `docs/investigations/<topic>.md`,
linked from the item. `Last touched` + `Re-checks` are tracked per item; no
status enum otherwise — absence of a `Blocked:` line means open. Blocked
items are exempt from the re-check counter and live in their own tier below
rather than mixed into the active list. This file adopted that format as of
2026-08-31 — all re-check counters started at 0 then regardless of how long
an item had been sitting. Reordered into priority order 2026-08-31; within
the current milestone and "Unscheduled", items are listed highest-to-lowest
priority. Only one milestone is "current" at a time — see root `CLAUDE.md`'s
Task Tracking rules for the full section-lifecycle (`## Current Milestone:
<name>` → `MILESTONES.md` + `COMPLETED.md` on ship). Finished work moves to
[COMPLETED.md](COMPLETED.md).

## Current Milestone: Data Audit & Bug Fix Sweep

Scoped 2026-09-30, pulling two already-ready items out of Unscheduled below.
Post-Parity Polish shipped 2026-09-30 (all 8 legs - see `MILESTONES.md` and
its [post-mortem](docs/postmortems/post-parity-polish.md)).

- **[Web TeamCard Expand Infinite-Loop Bug] — Leg 2** *(Last touched:
  2026-09-30 · Re-checks: 0)*
  Leg 1 root-caused this live (see
  `docs/investigations/web-teamcard-expand-infinite-loop.md` for the full
  repro trail) - this leg is the fix, scoped but not yet implemented.
  Confirmed mechanism, straight from `useGameData.ts`'s own source: every
  public getter it returns (`getCachedMove`/`getMoveData`/`getCachedItem`/
  `getItemData`/`getCachedAbility`/`getAbilityData`/
  `getCachedSpeciesLearnset`/`getSpeciesLearnset`/`getCachedChampionsUsage`/
  `getChampionsUsage`/`getEnrichedSpeciesOptions`) is `useCallback`'d with a
  dependency chain that bottoms out on the single `cache` state object -
  `getEnrichedSpeciesOptions`/`getChampionsUsage` get a brand-new identity on
  *every* `setCache` call anywhere in the app, not just ones touching their
  own species. `EditOverlays.tsx`'s two per-Pokémon data-fetch effects
  (learnset/moves+abilities at line ~151, Champions usage at line ~172) list
  those functions in their dependency arrays, so one `setCache` write from
  any mounted `PokemonCard` re-fires every other mounted `EditOverlays`
  instance's effects too. With several concurrently-mounted cards hitting
  real first-time cache misses (fresh/never-before-seen species), resolving
  fetches keep re-triggering each other's effects in a cascade. Live-verified
  the exact trigger: patching `console.error` in a Chromium tab (via a
  disposable Playwright script, not committed) to capture `new Error().stack`
  at the "Maximum update depth exceeded" call confirmed the looping
  `dispatchSetState` call originates inside one of `EditOverlays.tsx`'s two
  `.then()` callbacks. The narrow-width/4+-Pokémon correlation isn't a
  separate code path - grepped `src/renderer` for `ResizeObserver`/
  `matchMedia`/`IntersectionObserver`, none exist, so nothing branches on
  width in JS. It's a timing effect: `TeamCard.tsx`'s `@container` grid
  collapses to fewer columns below certain widths, stacking more
  `PokemonCard`s (and their Framer Motion `Reorder.Item` layout animations)
  into the same tight render window as the cache-churn cascade above, which
  is what pushes total re-renders over React's internal loop-detection
  threshold - reproduced reliably resizing to <768px *while already
  expanded* with a freshly-imported, not-yet-cached 4-species team; did not
  reproduce starting already-narrow before expanding, in 3/3 trials (a
  timing-sensitive trigger, not a hard requirement - matches why it felt
  inconsistent during Leg 1's original bisection too).
  Fix direction (not yet decided): the public getters in `useGameData.ts`
  need to stop changing identity on every unrelated cache write - e.g. read
  through a ref for the actual cache lookup instead of closing over `cache`
  directly in each `useCallback`, or otherwise decouple "a getter's identity
  is stable" from "the cache it reads has mutated." Whatever shape this
  takes, needs to preserve every one of the self-healing forced-miss
  behaviors documented inline in `useGameData.ts` (hasChampionsMoveData,
  target/meta presence, spriteUrl placeholder) - those are deliberate and
  still need to work once a miss is later filled in.

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

- **[Team Card Grid Layout Re-check] — Leg 1** *(Last touched: 2026-08-31 ·
  Re-checks: 0)*
  Blocked: waiting on the user to verify live on their physical MacBook —
  everything below was confirmed on a resized Electron window on the dev
  machine, not the actual hardware.
  Fixed and live-verified via `run-desktop` (added a `resize` command to
  `driver.mjs` — sets Electron's content size directly, matching what the
  renderer's CSS/`@container` actually measures). Root cause: not already
  fixed by the carousel rework — that rework is what introduced it.
  `TeamCard.tsx`'s 3-vs-6-column snap required a 1760px container (6*280px +
  5*1rem gaps), unreachable on any MacBook. First attempt (1100px, based on
  a theoretical estimate) still wasn't low enough — measured live at the
  reporter's actual conditions (14" MacBook, sidebar expanded, 2 real teams,
  single-column layout) the container only gets 1043px. Retuned to 1040px
  against that measured number; confirmed live it renders a clean 1x6 with
  no truncation at 1512x982/sidebar-expanded (screenshot:
  `.claude/skills/run-desktop/shots/06-fixed-1512-expanded-sidebar.png`).
  Doesn't cover a 13" MacBook (measured 818px there) — not this fix's
  target device. Also corrected a stale `TeamsPage.tsx` comment describing
  an auto-fill/minmax grid that no longer matches the real implementation.
  Ready to move to COMPLETED.md once the MacBook pass confirms it.

- **[In-App Auto-Update: macOS] — Leg 1** *(Last touched: not recorded ·
  Re-checks: 0)*
  Blocked: user needs a paid Apple Developer account ($99/yr) + notarization.
  Windows shipped in v0.2.1 (see COMPLETED.md). macOS is blocked: Squirrel.Mac
  (what `electron-updater` uses there) requires code signing to auto-update
  at all, and Gatekeeper heavily restricts unsigned builds regardless. Once
  unblocked, `registerAutoUpdater()`'s `process.platform !== 'win32'` guard
  in `main.ts` is the one line to revisit.
  - Separately, a paid Windows code-signing cert (~$100-400+/yr) isn't
    required for Windows auto-update to function, but would remove the
    SmartScreen warning — not yet decided.

- **[TypeScript 7 Upgrade] — Leg 1** *(Last touched: not recorded ·
  Re-checks: 0)*
  Blocked: waiting on real `typescript-eslint` 7.x support.
  `typescript-eslint` doesn't support TypeScript 7.0.2 yet (confirmed
  peer-range rejection + real runtime crash reports). Currently on
  TypeScript ^6.0.3.

## Unscheduled (not yet scoped, highest-to-lowest priority)

- **[UI Shift Assessment Sweep — Post Card UI Polish] — Leg 1** *(Last
  touched: 2026-09-08 · Re-checks: 0)*
  Continue scoping/assessing UI shifts and changes to the rest of the app,
  following on from the UI/UX Overhaul and Card UI Polish milestones (see
  `MILESTONES.md`). Open-ended — needs a pass identifying which
  screens/components haven't had a UI-focused pass yet before it turns
  into concrete legs.

## Future Milestones (unscheduled)

2026-09-10 feedback pass batched into 4 candidate milestones; Battle Logger
Overhaul, Statistics Improvements, and Team Management QoL were each
promoted to current and have since shipped (see `MILESTONES.md`). Live Calc
Tuning, the last of the four, was promoted 2026-09-11 and later retired in
favor of Regular Calc Popup (see `MILESTONES.md`). VGCPastes real-set
sourcing, deferred out of Regular Calc Popup, was itself promoted to
current 2026-09-14 and shipped 2026-09-15 (see `MILESTONES.md`).

Two fast-follows deferred out of Web Version: Teams & Box MVP's scoping
(2026-09-29, see `docs/investigations/web-version-scope.md`) - not yet
worth their own legs until the MVP milestone ships:
- Password reset flow (needs a transactional email API + SPF/DKIM
  deliverability setup on a dedicated vannyproductions.com subdomain).
- Public profile / team-sharing pages (the account model's username design
  already accommodates this, but the public routes/per-team visibility
  toggle need their own scoping pass). Scope widened 2026-09-29 (Vanny) to
  cover profile search and a shared team database where users can upload
  teams for others to browse in-app, not just per-team visibility toggles -
  needs a privacy-model decision (what's public by default) and abuse/
  moderation considerations for a public upload database before it's ready
  to scope into legs.

Download/landing page for choicebuds.vannyproductions.com (proposed
2026-09-29, out of Web Hosting & Domain's Leg 1): make the new site the
default download entry point instead of sending people straight to the
GitHub Releases page. No universal/self-fetching installer needed - a page
calling `api.github.com/repos/vanwheels/ChoiceBuds/releases/latest` (the
same call `services/github.ts`'s in-app update checker already makes) and
linking to that release's OS-appropriate asset is enough; GitHub Releases
stays the actual file host. Needs its own scoping pass (OS detection UI,
where the page lives relative to the app shell, page design) - not yet
worth a leg on its own.

General web content-area padding gap (flagged 2026-09-30 by Vanny during
live verification of Battle Log & Statistics Parity): `AppWeb.tsx`'s
`<main>` has no padding at all, unlike `App.tsx`'s desktop `<main>`
(2rem/1.5rem inline styles), so ported pages render edge-to-edge in the
browser - visible on the Battle Log page's card grid butting against the
viewport edges. Distinct from the mobile-friendliness pass above (that one's
about touch/breakpoints for phone-sized viewports; this is a plain desktop-
browser layout gap). Not fixed now per Vanny's call to worry about it later
- likely a quick fix (mirror `App.tsx`'s `<main>` padding) whenever a web UI
polish pass happens, but worth confirming it doesn't collide with any
page's own assumption that `<main>` has zero padding first.

Teams tab search bar (proposed 2026-09-29): search for a specific Pokémon
by name and surface which of the user's saved teams include it. Needs its
own scoping pass (exact vs. partial name match, whether it also searches
the Box or is Teams-only, UI placement) - not yet worth a leg.

Battle Logging: special events / Global Challenge (proposed 2026-09-29):
let a logged battle be tagged to a specific event so a user can filter/
view matches for that event specifically. Global Challenge is online,
dated, and officially endorsed by The Pokémon Company, so it's a plausible
source of truth to track. In-person Regionals are also official but (a)
there's no clear source for a complete/reliable schedule to pull from and
(b) players are unlikely to log in-person tournament games in the app
anyway (no external devices allowed at the event), so Regionals may not be
worth pursuing even once scoped. Open question from Vanny that needs a
decision before this can be scoped further: let users freeform-create
their own named events, vs. only tracking a curated list of official ones
(e.g. just GC).

