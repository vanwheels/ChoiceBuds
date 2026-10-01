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

## Current Milestone: Post-Parity Polish

Settings/Sync/Box/Battle Log feedback batch flagged 2026-09-30 by Vanny after
live-verifying Web Settings Parity (Full Web Feature Parity milestone).
Scoped 2026-09-30 - decisions resolved: sync status indicator drops from the
sidebar entirely (Settings page is the sole status source), Season/Champions
Data Check sections are removed outright (not automated), and Player Profile
sync uses a whole-section reveal toggle. Sequenced decision-free fixes first
per Vanny's call.

- **[Battle Log Card Grid Cleanup] — Leg 1** *(Last touched: 2026-09-30 ·
  Re-checks: 0)*
  `PastBattlesList.tsx`'s `BattleRow`: cards render at different heights
  depending on team-name length and whether `battle.notes` is set, which
  Vanny finds visually messy. Wants uniform card height, truncated team
  names, a note icon (paper+pencil) replacing the inline notes text, and a
  re-evaluation of whether the `grid-template-columns: repeat(auto-fill,
  ...)` layout (lines 94/113) is even the right shape here vs. a plain list.

- **[Floating Calc Button Repositioning] — Leg 1** *(Last touched:
  2026-09-30 · Re-checks: 0)*
  `App.tsx:273` and `AppWeb.tsx:298` both hardcode the Calc launcher at
  `fixed bottom-6 right-6`, which can sit over Settings' last section (see
  Leg 2). Let the user reposition it (at least between corners, ideally
  freeform) and persist the choice per-device, accounting for window
  resize. Still needs its own design pass before implementation - storage
  key, corner-snap vs. freeform drag, resize behavior - that wasn't one of
  the decisions resolved in this scoping pass.

- **[Sidebar Sync Status Indicator Removal] — Leg 1** *(Last touched:
  2026-09-30 · Re-checks: 0)*
  Decision (2026-09-30, Vanny): drop the sync status indicator from the
  sidebar entirely rather than just debounce it further. Scoped to
  `AppWeb.tsx:95-167`: remove `SYNC_STATUS_LABEL`, the colored dot, and the
  "Synced"/"Syncing..."/error status text from the `renderFooter` slot.
  Keep `syncUsername` + the log-out button in that footer - that's identity,
  not sync status. `SyncSection.tsx` on the Settings page stays the sole
  place sync status is shown.

- **[Season/Champions Data Check Removal] — Leg 1** *(Last touched:
  2026-09-30 · Re-checks: 0)*
  Decision (2026-09-30, Vanny): remove the manual "mark as checked" sections
  entirely rather than automate them. Cleanly isolated - both hooks and both
  section components are only wired in `SettingsPage.tsx` (imports at
  lines 15-16/20-21, instantiation at 43-44, render at 95/97). Delete
  `SeasonDataCheckSection.tsx`, `ChampionsDataCheckSection.tsx`,
  `useSeasonDataCheck.ts`, `useChampionsDataCheck.ts` (+ their tests), and
  `config/championsDataChecks.ts`; remove the now-dead check-state fields
  from `AppSettings` in `types/settings.ts`.

- **[Player Profile Cross-Device Sync] — Leg 1** *(Last touched: 2026-09-30
  · Re-checks: 0)*
  Decision (2026-09-30, Vanny): whole-section reveal toggle, not per-field.
  Biggest leg in this batch. `SyncPayload` (`types/settings.ts:92`) has no
  `playerProfile` field; the Worker (`worker/src/index.ts`) merges every
  existing collection as an array of id/updatedAt records via
  `mergeCollection`, but `playerProfile` is a single object, so it needs its
  own last-write-wins-by-timestamp merge path, not that helper. Worker is
  infra each user deploys themselves (see `worker/README.md`) - an
  un-redeployed Worker will silently ignore the new field rather than error
  (it only validates the fields it knows about), so this must degrade
  gracefully rather than assume every deployment is current. UI side: add
  the reveal toggle to `PlayerProfileSection.tsx` gating the PII fields
  (legal name, Support ID, Player ID, birthday).

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

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

Settings/Sync/Box/Battle Log feedback batch flagged 2026-09-30 by Vanny -
scoped into concrete legs 2026-09-30, see `## Current Milestone: Post-Parity
Polish` above.

