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

Saved Builds Box shipped 2026-09-11 (all 8 legs - see `COMPLETED.md` and
`MILESTONES.md`). Building Flow Tweaks shipped 2026-09-11 (see
`COMPLETED.md` and `MILESTONES.md`). Regular Calc Popup shipped 2026-09-13
(see `COMPLETED.md` and `MILESTONES.md`) - includes the retired Live Calc
Tuning work that preceded its pivot; see
[docs/postmortems/regular-calc-popup.md](docs/postmortems/regular-calc-popup.md)
for the full arc. VGCPastes Real-Set Sourcing promoted to current milestone
2026-09-14 (folds in the Tailwind/Terrain-Ability Speed Modeling leg that
had been sitting in Unscheduled); its own Scoping leg finished the same day,
splitting into a Sample Team Catalog leg and a Per-Species Real-Set
Extraction leg (see `COMPLETED.md`). Sample Team Catalog Legs 1, 2, 3, and 4
shipped the same day (see `COMPLETED.md`). Per-Species Real-Set Extraction's
own scoping pass finished 2026-09-15, splitting into an Extraction Pipeline &
Cache leg and a Calc Panel Real Sets UI leg; both shipped 2026-09-15 (see
`COMPLETED.md`). Calc Real Sets Section: Visual Polish Legs 1 and 2 shipped
2026-09-15 (see `COMPLETED.md`). Team Builder Real Sets Integration's own
Scoping leg finished the same day, splitting into a build leg; that build leg
(Leg 2) also shipped 2026-09-15 (see `COMPLETED.md`). VGCPastes Sample Team
Catalog: Search/Filter Leg 1 shipped 2026-09-15 (see `COMPLETED.md`). Team
Builder Stat Display: SP / Base / Real Total Toggle Leg 1 - unrelated in
topic, just pulled into this milestone's current-milestone slot per Vanny's
call since only one milestone can be "current" at a time - also shipped
2026-09-15 (see `COMPLETED.md`). VGCPastes Real-Set Sourcing milestone
shipped 2026-09-15 (see `MILESTONES.md` and
[docs/postmortems/vgcpastes-real-set-sourcing.md](docs/postmortems/vgcpastes-real-set-sourcing.md)).
[Calc Stat Rows: SP / Stat Total Toggle] — Leg 1 was killed 2026-09-16
instead of scoped - see `COMPLETED.md`. Maintenance & Bug Fix Sweep promoted
to current milestone 2026-09-16, pulling in three previously-Unscheduled
items plus a newly-reported Real Sets bug. [Real Sets: Mega Evolution
Species Matching Bug] — Leg 1 shipped the same day (see `COMPLETED.md`).
[Team Gap Analysis: Usage Cutoff Tuning] — Leg 1 resolved (decision, no
diff to the cutoff) 2026-09-16 (see `COMPLETED.md`). [Dev Console GPU
Overlay Error Noise] — Leg 1 shipped the same day (see `COMPLETED.md`).
Maintenance & Bug Fix Sweep milestone shipped 2026-09-16 (see
`MILESTONES.md` and
[docs/postmortems/maintenance-bug-fix-sweep.md](docs/postmortems/maintenance-bug-fix-sweep.md)) —
its 4th item, Reg M-C Z-A-Exclusive Movepool Audit, stays in `Blocked`
below rather than closing with the rest, since it's still waiting on
PokeAPI. Web Version: Teams & Box MVP promoted to current milestone
2026-09-29; its own Scoping leg finished the same day, splitting into 7
build legs (see `COMPLETED.md` and
[docs/investigations/web-version-scope.md](docs/investigations/web-version-scope.md)).
[Sync Accounts: Username + Password] — Leg 1 shipped the same day (see
`COMPLETED.md`). [Sync Data Model: Per-Record Merge & Auto Sync] — Leg 1
shipped 2026-09-29 (see `COMPLETED.md`) — this is the Worker deploy point:
`npx wrangler deploy` ships both this leg's and the accounts leg's Worker
changes together. Re-scoped 2026-09-29: migration does NOT need to happen in
the same window as the deploy - local storage stays canonical (per
`docs/investigations/web-version-scope.md`), so an un-migrated friend's data
is never at risk, only their cross-device sync stops working until they sign
up and get migrated. Deploy whenever, migrate people as they get to it. [Web App Scaffold: Storage
Adapter] — Leg 1 shipped 2026-09-29 (see `COMPLETED.md`). [Web Teams
Parity] — Leg 1 shipped the same day (see `COMPLETED.md`) — Teams import/
CRUD/display now work on web against the IndexedDB adapter; auto-sync
wiring was deliberately deferred to land alongside Web Hosting & Domain's
sign-up/log-in UI instead of wiring `useSync` in with no UI to trigger it
yet. Also ported `useSavedPokemon` to the storage adapter as part of this
leg (Teams Parity needed it too), which narrows what's left in Web Box
Parity below. [Web Box Parity] — Leg 1 shipped 2026-09-29 (see
`COMPLETED.md`) - `BoxPage` wired into `AppWeb.tsx` with no further hook
porting needed; its own dependencies (`useRosterActions`, the type/move/
ability filter hooks, `clipboardPayload.ts`) had no Electron dependency to
begin with. [Web Hosting & Domain] — Leg 1 shipped 2026-09-29 (see
`COMPLETED.md`) - narrowed to deploy+domain only after a sequencing
check-in, and pivoted from the originally-planned Cloudflare Pages to
GitHub Pages mid-leg once a live attempt showed Cloudflare's Workers
Custom Domains need the whole DNS zone moved to Cloudflare, not just a
CNAME record - too much risk to vannyproductions.com's existing
IONOS-hosted email for what this leg needed. The site is live at
https://choicebuds.vannyproductions.com. Login/signup UX split into its
own [Web Login/Signup UX] — Leg 1, below. [Web Login/Signup UX] — Leg 1
shipped 2026-09-29 (see `COMPLETED.md`) - signing in is opt-in on web, same
as desktop (Showdown-style: never lock the player out of using the app over
an account) - Teams/Box/the calc work fully signed-out, and a sidebar
"Sign in to sync" prompt opens a dismissible `WebAuthScreen` modal that
turns on `useSync`'s background auto-sync once signed in.

Decided 2026-09-29 (Vanny): the Worker deploy and the app release are two
separate gates, not one - the Sign Up UI (`SyncSection.tsx`) only exists on
`main`'s source, not in any built/distributed app. The last actual release
is `v0.8.1` (`bd5a171`), which predates the accounts leg entirely, so every
installed app today (including Vanny's own) is still on the old shared-
secret push/pull UI regardless of what the Worker is running. Deploying the
Worker now is fine (see the re-scoping note above), but the next app release
is deliberately being held back so existing users transition straight from
the old push/pull UI to a build that already has more of the web-sync story
done, rather than a standalone release for just the accounts/merge changes.

Web Version: Teams & Box MVP milestone shipped 2026-09-29 (see
`MILESTONES.md` and
[docs/postmortems/web-version-teams-box-mvp.md](docs/postmortems/web-version-teams-box-mvp.md)),
closed without waiting on [Existing Account Migration], which moved to
`Blocked` below rather than holding the milestone open - it has no natural
closing moment of its own (it's gated on friends messaging their IDs and on
a future release, both outside this codebase), matching the lesson from
Maintenance & Bug Fix Sweep's postmortem about not letting a `Blocked` item
hold a milestone's `Current Milestone:` section open indefinitely.

Full Web Feature Parity promoted to current milestone 2026-09-29 (Vanny's
call), the natural next step on the web track now that Teams & Box MVP is
live - continue porting the app's remaining features to the web build via
the same hook-by-hook storage-adapter approach. Its own Scoping leg finished
the same day, splitting into 5 build legs (see `COMPLETED.md` and
[docs/investigations/web-feature-parity-scope.md](docs/investigations/web-feature-parity-scope.md)).
Survey turned up less porting work than expected: `CalcPopup`/
`TypeMatchupPage`/`SpeedTiersPage` have zero Electron dependency of their
own (every hook they need is already storage-adapter-clean from Teams/Box
Parity) - only Battle Log/Statistics need a real hook port
(`useBattles.ts`). Also decided live during scoping: `AppWeb.tsx`'s
hand-rolled 2-button nav gets replaced with the real `Sidebar.tsx` + `App.tsx`'s
lazy-tab pattern now that the tab list is about to match desktop's, rather
than continuing to grow a second nav implementation.

Full Web Feature Parity milestone shipped 2026-09-30 (see `MILESTONES.md`
and
[docs/postmortems/full-web-feature-parity.md](docs/postmortems/full-web-feature-parity.md)) -
[Web Nav Shell: Adopt Sidebar.tsx], [Web Calc & Matchup Tools Parity],
[Web Battle Log Storage Adapter Port], [Web Battle Log & Statistics
Parity], and [Web Settings Parity] all shipped as Leg 1s (see
`COMPLETED.md`). Every Sidebar tab now renders its real page on both
desktop and web.

Mobile-Friendliness Pass promoted to current milestone 2026-09-30 (Vanny's
call) - its gating condition (web feature set stable enough to design
against) was met the same day Full Web Feature Parity shipped. Its own
Scoping leg finished the same day, splitting into 6 build legs (see
`COMPLETED.md` and
[docs/investigations/mobile-friendliness-scope.md](docs/investigations/mobile-friendliness-scope.md)).
Survey found almost zero existing responsive-breakpoint usage anywhere in
the renderer, and two functionality-breaking (not just cramped) touch
gaps: native HTML5 drag-and-drop never fires on touch at all (affects
roster/move/Calc-tray reordering in 6 files), and the shared
`Tooltip`/`FloatingCardPanel` hover popups are unreachable without a mouse
(affects 7 files). Decided live during scoping: swap touch drag-and-drop
to framer-motion's `Reorder` primitive (already a dependency, no new
package) rather than `dnd-kit` or touch-only fallback controls; mobile nav
becomes a hamburger/slide-out drawer built from `Sidebar.tsx`'s existing
content rather than a bottom tab bar or an auto-collapsed icon rail.
[Touch Drag-and-Drop: Framer Motion Reorder] — Leg 1 shipped the same day
(see `COMPLETED.md`) - narrowed mid-leg to 5 files, not 6:
`CalcTeamTray.tsx` turned out to be a drag-*to-transfer* (tray onto a Calc
panel), not a reorder, so `Reorder` doesn't apply there at all - left
untouched, since tap-to-load already covers touch fully.
[Touch-Accessible Hover Content] — Leg 1 shipped 2026-09-30 (see
`COMPLETED.md`) - asked Vanny live to pin down the tap-interaction model
(long-press, the recommended option, over a two-tap pattern or a dedicated
info icon) before implementing, since the TODO item specified the problem
but not that design call. Narrowed from the scoped 7 files to 4 real
changes: `RealSetsButton.tsx`/`StatsColumn.tsx`/`TooltipContent.tsx` turned
out not to need touching (the first two only consume `FloatingCardPanel`
via `onClick`, already tap-friendly; the third just renders content handed
to it, no hover wiring of its own) - the actual `onMouseEnter` sites were
only `MoveBubbleGrid.tsx`/`AbilityCapsule.tsx`/`ItemSpriteBox.tsx`, plus
`EditOverlays.tsx`'s shared hover-state wiring.
[Mobile Compact Top Bar: Teams & Box] — Leg 1 shipped 2026-09-30 (see
`COMPLETED.md`) - `TeamsPage`/`BoxPage`'s stacked mobile `<header>` is now
hidden entirely below `md`, replaced by a page-aware extension to
`Sidebar.tsx`'s mobile top bar (`useMobileHeaderActions.tsx`, a new context/
hook pair) that lets the active tab publish its own title + icon-only
action buttons there. Caught and fixed a real infinite-render-loop bug live
via run-desktop before shipping - see the commit for the root cause and
fix.

## Current Milestone: Mobile-Friendliness Pass

Make the renderer usable on a phone-sized touch viewport - today it's a
from-scratch pass, not a tuning one (see the scoping doc for the full
survey). Ordered by severity first (the two functionality-breaking touch
gaps before any layout work), then by what's foundational (reclaiming nav
width before auditing page layouts that assume it), then remaining layout
audits in traffic-priority order.

[Mobile Nav Shell: Drawer] — Leg 1 shipped 2026-09-30 (see `COMPLETED.md`) -
`Sidebar.tsx` now hides the rail entirely below `md` (768px) and replaces it
with a hamburger trigger + off-canvas drawer, self-contained in that one
component (no new wiring needed in `App.tsx`/`AppWeb.tsx`). The layout-audit
legs below now have a real reclaimed-width nav shell to design against.
[Responsive Layout Audit: Teams & Box] — Leg 1 shipped the same day (see
`COMPLETED.md`) - `TeamCard`'s header now stacks vertically below `md`
instead of overflowing outright, and its expanded roster grid gained two new
container-query tiers ahead of the existing 1040px one. Surfaced a real,
pre-existing "Maximum update depth exceeded" bug unrelated to this leg's CSS
work - see its own new entry below. Live mobile testing the same day (Vanny,
on an iPhone 16) turned up three more issues, all fixed immediately rather
than queued: [TeamOverflowMenu Viewport Clamp] — Leg 1 (the team "..." menu
had no bottom-of-viewport clamp and dismissed itself on any scroll, so
overflow content was genuinely unreachable), [Mobile Calc Launcher
Placement] — Leg 1 (the floating Calc button covered page content at the
bottom of a phone viewport - moved to the mobile top bar, desktop
unchanged), and [Short-List Scroll Stuck on iOS Safari] — Leg 1 (a single
empty team/very short Box left zero scroll overflow, which iOS Safari's
touch-scroll handling gets stuck on - a first bottom-padding attempt didn't
work for a real CSS reason, see its own entry; fixed with a forced 1px
min-height overflow instead). See `COMPLETED.md` for all three.

- **[Responsive Layout Audit: Calc & Modals] — Leg 1** *(Last touched:
  2026-09-30 · Re-checks: 0)*
  `CalcPopup` and the shared `Modal.tsx`-based modals (Import/Export/PDF/
  Image, the item/move/ability/nature pickers). `Modal.tsx`'s overlay
  shell already shrinks to viewport width via its `w-full` panel, so the
  real risk is internal fixed-width content (stat tables, picker grids)
  forcing horizontal scroll at phone widths, not the modal shell itself.

- **[Responsive Layout Audit: Remaining Pages] — Leg 1** *(Last touched:
  2026-09-30 · Re-checks: 0)*
  Battle Log, Statistics, Settings, Type Matchup, Speed Tiers - lower
  traffic and less data-dense than Teams/Box/Calc, grouped into one leg on
  that basis. Split further mid-leg if any one of them turns out to need
  disproportionate work.

Mobile Teams & Box Card View raised by Vanny 2026-09-30, right after
Responsive Layout Audit: Teams & Box shipped - a different ask than that
leg's overflow/squishing fixes: the grid/list-of-cards pattern itself isn't
right for mobile, not just cramped. Its own Scoping leg finished the same
day, splitting into 3 build legs (see `COMPLETED.md` and
[docs/investigations/mobile-teams-box-card-view-scope.md](docs/investigations/mobile-teams-box-card-view-scope.md)).
Key decisions: mobile-only (desktop grid untouched), a full-screen
swipeable Pokémon card replaces vertical scrolling through a team's roster,
Box gets both a compact sprite/favorite/name grid *and* the same swipe deck
(tap a tile to enter it), and each page's mobile header collapses into
`Sidebar.tsx`'s existing hamburger top bar instead of keeping its own
stacked `<header>`.
[Full-Screen Swipeable Pokémon Card + Teams List View] — Leg 1 shipped
2026-09-30 (see `COMPLETED.md`).

[Box Mobile: Compact Grid + Swipe Deck] — Leg 1 shipped 2026-09-30 (see
`COMPLETED.md`) - new `MobileBoxGrid.tsx` (3-column compact sprite/favorite/
name tiles + its own "+ New Build" tile, replacing `BoxPage.tsx`'s desktop
grid below `md`), `MobileBoxSwipeOverlay.tsx`/`MobileBoxPokemonCard.tsx` (a
Box-flavored sibling to Teams' swipe deck, not a reuse of it - a Box entry's
action set is BoxCard.tsx's own, not a roster slot's). Caught and fixed a
real render-time-clamp bug live via run-desktop before shipping: see the
commit for the root cause and fix.

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

- **[Existing Account Migration] — Leg 1** *(Last touched: 2026-09-30 ·
  Re-checks: 0)*
  Blocked: waiting on the next app release cutting (deliberately held back
  for now - see the note above `## Blocked` in this file's intro section).
  Simplified 2026-09-30 (Vanny confirmed all ~4-6 friends have only ever
  used one device): no manual KV copy needed. Local storage is canonical
  and untouched by the client update, and `useSync.ts`'s sign-in effect
  auto-pushes whatever's in local state the moment a friend signs up under
  the new username+password system - that alone carries their teams/
  battles/saved Pokémon into the new account. Once the release cuts, each
  friend just updates and signs up; no coordination or per-friend script
  needed. Drops the KV eventual-consistency race risk previously noted here
  too (see `COMPLETED.md` for the original single-device incident during
  Vanny's own migration) - that was specific to a manual copy racing a
  device's own push, which no longer happens here.

- **[Reg M-C Z-A-Exclusive Movepool Audit] — Leg 1** *(Last touched:
  2026-09-16 · Re-checks: exempt, blocked)*
  Blocked: waiting on PokeAPI to backfill "champions"-tagged move data more
  broadly, the same way it eventually did for Reg M-B's 22 species (see
  `config/championsMovepoolChanges.ts`'s header). Deferred out of
  Regulation M-C Prep's Leg 2 (see COMPLETED.md/postmortem) rather than
  forced into that pass.
  Scope correction 2026-09-16 (per Vanny): Rillaboom/Baxcalibur/Salamence
  are not the actual audit target, they're cheap indicator species used to
  check whether PokeAPI has caught up yet (currently 0 champions-tagged
  moves each, vs. 51 for already-backfilled archaludon as control - checked
  live 2026-09-10 and again 2026-09-16, no change). The real scope is a
  full Champions movepool sweep across *all* Champions-legal species once
  PokeAPI's backfill catches up - not just these 3, and not just Reg M-C's
  roster. Golisopod (originally a 4th indicator) is separately resolved via
  hand-curation from user-provided source text - see COMPLETED.md's
  Champions M-C Balance Patch Corrections entry - but that was a one-off,
  not a template to repeat per-species while waiting; the plan is to wait
  for PokeAPI rather than hand-curate the rest.
  Next step: periodically re-run the live champions-tag query against
  Rillaboom/Baxcalibur/Salamence (indicator species); once any of them
  shows non-zero champions-tagged moves, PokeAPI has started backfilling
  Reg M-C and it's time to run the full sweep across all Champions-legal
  species, not just these 3.

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

- **[Web TeamCard Expand Infinite-Loop Bug] — Leg 1** *(Last touched:
  2026-09-30 · Re-checks: 0)*
  Discovered live while verifying Responsive Layout Audit: Teams & Box Leg 1
  (see `COMPLETED.md`). Expanding a `TeamCard` with **4+ Pokémon** at a
  viewport **narrower than 768px** throws a React "Maximum update depth
  exceeded" loop - doesn't crash outright but spams re-renders indefinitely
  (burns CPU/battery, degrades the UI). Only reachable on the web build or a
  resized browser - the desktop Electron app enforces a 1280px minimum
  window width (`main.ts`), so this has never been visible there.
  Confirmed via `git stash` + a clean rerun that it's pre-existing, not
  caused by that leg's CSS changes - reproduces identically on unmodified
  `main`. Bisected live via a Playwright-driven repro script (not yet
  written down anywhere beyond this entry): 3 Pokémon never loops at any
  width tested (375-1512px); 4 Pokémon loops reliably, but only below 768px
  - the identical 4-6 mon roster expanded fine at 1512px with the same
  timing. Root cause not yet identified - ruled out `ResizeObserver` (none
  exist anywhere in `src/renderer`) and simple squish-driven remeasurement
  (reproduces whether `PokemonCard` is squished to ~47px or rendering
  healthy at ~276px, so it's not about card width itself). Leading
  suspicion, not confirmed: something in `EditOverlays.tsx`'s per-card data-
  fetch effects (`getEnrichedSpeciesOptions`/`getChampionsUsage`) or
  `useGameData.ts`'s cache-update propagation misbehaving when 4+ instances
  mount concurrently at a narrow width - needs real debugging (add a
  `console.trace()`/React DevTools profiler pass at repro conditions), not a
  CSS fix. Needs its own scoping/investigation pass before this can become a
  concrete fix leg.

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

Settings/Sync/Box/Battle Log feedback batch (flagged 2026-09-30 by Vanny
after live-verifying Web Settings Parity, see the now-shipped Full Web
Feature Parity milestone above). None started - each needs its own
scoping pass:

- Sync status visual noise: `useSync.ts`'s `AUTO_SYNC_DEBOUNCE_MS` (5s)
  re-fires a sync after every local mutation while actively editing, which
  flips the sidebar footer dot/`SyncSection.tsx`'s status text between
  "Syncing..."/"Synced" every few seconds - visually distracting during a
  normal editing session. Vanny also wants the sidebar's synced-status dot
  removed outright, not just debounced further. Needs a decision: keep a
  status indicator somewhere (just less twitchy) vs. drop it from the
  sidebar entirely and leave sync status to Settings only.
- Player Profile isn't synced at all today (`SyncPayload` in
  `types/settings.ts` only carries teams/battles/savedPokemon, never
  `settings`/`playerProfile`) - Vanny wants it synced across devices, but
  `PlayerProfileSection.tsx` holds real PII (legal name, Support ID,
  Player ID, birthday), so he wants it hidden behind a reveal button/toggle
  rather than shown in the clear by default. Needs a decision on the
  reveal UX (per-field vs. whole-section) and how `playerProfile` joins the
  sync payload/merge model safely.
- Season Data Check / Champions Data Check sections
  (`SeasonDataCheckSection.tsx`/`ChampionsDataCheckSection.tsx`, their
  "mark as checked" buttons and subtext) bother Vanny as manual busywork.
  Needs a decision from him: remove the sections from Settings entirely, or
  find a way to automate the underlying checks so "mark as checked" stops
  being a manual step - two very different outcomes, not a UI tweak.
- Rename `AppStatusSection.tsx`'s "App Status" heading to "Account Status"
  and make its content more compact/inline - Vanny's concern is that this
  is the settings page's last section and the floating Calc launcher
  button (bottom-right, `fixed bottom-6 right-6` in both `App.tsx` and
  `AppWeb.tsx`) sits over it.
- Related: let the user reposition the floating Calc launcher button (at
  least between screen corners, ideally freely) and persist the chosen
  position per-device, accounting for window resize. Needs its own scoping
  pass (storage key, corner-snap vs. freeform drag, how it behaves on a
  resize).
- Battle Log card grid (`components/battlelog/PastBattlesList.tsx`):
  cards render at different heights depending on team-name length and
  whether the battle has notes, which Vanny finds visually messy. Wants
  uniform card height, team names truncated, a note icon (paper+pencil) on
  cards that have notes instead of showing the note text inline, and a
  re-evaluation of whether a grid is even the right layout here vs. a list.
- Box's "+ New Build" tile (`BoxPage.tsx`) renders over 2x the size of a
  collapsed saved-build tile next to it - visual mismatch Vanny wants
  matched to the collapsed tile size.
- When creating a new team, auto-fill the Author field with the signed-in
  sync username (when signed in) instead of leaving it blank.

