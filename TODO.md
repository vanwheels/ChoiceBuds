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

## Current Milestone: Maintenance & Code Health Sweep

Done when:
- `useActiveEditor` hook, its test file, and the unused prop plumbing are
  fully removed.
- All four sibling hooks (`useSavedPokemon`, `useBattles`, `useSettings`,
  `useDatabase`) have a documented race-pattern finding, and any hook found
  to have the same lost-update race as `useTeams` has the same ref+queue
  fix applied.
- `TeamCard.tsx`, `BoxPage.tsx`, `useSync.test.ts`, and
  `CalcPokemonPanel.tsx` are each split below the 500-line hard cap with no
  behavior change - all four done (see `COMPLETED.md`).

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

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

- **[Dev Environment: Electron Zoom-Persistence Fix + Mobile Web Preview
  Script] — Leg 1** *(Last touched: 2026-10-16 · Re-checks: 0)*
  Flagged live 2026-10-16: `npm run dev`'s Electron window was rendering the
  mobile/phone layout despite `main.ts`'s enforced 1280x720 minimum size.
  First hypothesis (Windows DPI virtualization bitmap-stretching the
  rendered surface, worked around via `high-dpi-support`/
  `force-device-scale-factor=1` switches) was live-tested and ruled out - a
  confirmed-clean process restart (no orphaned `electron.exe`) was still
  zoomed, so those switches were reverted. Real cause, found live by Vanny:
  Chromium persists page zoom per-origin indefinitely (its HostZoomMap,
  stored in userData, survives app restarts) - an accidental Ctrl+scroll/
  View -> Zoom In on `localhost:5173` had stuck and kept re-applying on
  every future launch, shrinking the effective CSS viewport below
  Tailwind's 768px `md:` breakpoint with no in-app UI pointing at why
  (there's no custom `Menu` here overriding Electron's stock "View" menu
  zoom items). `View -> Actual Size` fixed it instantly for that session,
  confirming the diagnosis. Fix: `main.ts` now resets zoom to level 0 (100%)
  on every `did-finish-load`, overriding whatever HostZoomMap would
  otherwise re-apply, so a stray zoom can't outlive the session it was set
  in. Also added a third, genuinely separate dev mode for Mobile Web
  testing (the app only had Electron `npm run dev` and desktop-width
  `npm run dev:web` before): `npm run dev:mobile` (`scripts/devMobile.mjs`)
  opens a real Chrome window via `playwright-core`'s `channel: 'chrome'`
  (no separate browser download, same approach
  `.claude/skills/run-desktop/driver.mjs` already uses for Electron) sized
  to a 375x812 phone viewport against the web dev server on :5174 -
  self-starts `vite --config web/vite.config.ts` if nothing's already
  listening there (reuses it untouched if `dev:web` is already running
  elsewhere), so it's one command rather than two terminals.
  Done check: `npm run build`/`lint`/`type-check` pass (confirmed).
  `npm run dev` confirmed live 2026-10-16 - comes up at 100% zoom by
  default now. Still needs: a live try of `npm run dev:mobile` to confirm
  it cleanly self-starts `dev:web` and opens a phone-proportioned preview.
  Manual verification: yes. Review: no.

- **[TeamCard Notes: Data Loss on First Blur After Expand] — Leg 1** *(Last
  touched: 2026-10-16 · Re-checks: 0)*
  Found live during the TeamCard.tsx split's manual verification (see
  COMPLETED.md) - pre-existing, not a regression from that split (the
  notes `onBlur` handler is byte-for-byte unchanged, just relocated into
  `TeamCardRosterGrid.tsx`). Typing into a team's Strategy Notes textarea
  and clicking out cleared what was typed the *first* time after expanding
  a card; typing again and blurring a second time saved correctly. Smells
  like the "adjust state during render" `prevPropNotes`/`localNotes` resync
  pattern (same shape as `StatsColumn.tsx`'s own fix, see TODO.md's Web Bug
  Sweep Leg 1) racing against the async `updateTeam` call on first blur,
  but needs an actual repro/investigation pass before guessing at a fix -
  intermittent (didn't reproduce on the second attempt), and name/author
  fields in the same card (same pattern, in `TeamCardHeader.tsx`) didn't
  show the issue.
  Done check: reliable repro steps found, root cause identified, fix
  verified live across several expand/type/blur cycles.
  Manual verification: yes. Review: no.

- **[TeamCard Overflow Menu: Validate Popup Covers Own Dropdown] — Leg 1**
  *(Last touched: 2026-10-16 · Re-checks: 0)*
  Flagged live during the TeamCard.tsx split's manual verification (see
  COMPLETED.md), explicitly deferred by Vanny. `TeamOverflowMenu.tsx`'s
  "Validate Team" result popup renders on top of the "⋮" dropdown's other
  items (Export/Export Image/Export PDF/Delete), so they're unreachable
  until you click away to dismiss the popup first - annoying but not
  broken (the popup does eventually dismiss and the menu works normally
  after). Likely a z-index/stacking-order or positioning fix scoped to
  that one component.
  Manual verification: yes. Review: no.

- **[TeamCard Paste Team: Pasted Card Jumps Before Re-sort] — Leg 1** *(Last
  touched: 2026-10-16 · Re-checks: 0)*
  Flagged live during the TeamCard.tsx split's manual verification (see
  COMPLETED.md) - "for what it's worth," not urgent. Pasting a team via the
  right-click "Paste as New Team" menu always inserts the new card directly
  above the team it was copied from, then a couple seconds later it visibly
  jumps down to its real alphabetical-sort position. End state is correct;
  only the transient placement is off. Likely `addTeam`'s insertion point
  vs. whatever drives the list's sort-order animation being out of sync
  for one render/settle cycle.
  Manual verification: yes. Review: no.

- **[UI Shift Assessment Sweep — Post Card UI Polish] — Leg 1** *(Last
  touched: 2026-09-08 · Re-checks: 0)*
  Continue scoping/assessing UI shifts and changes to the rest of the app,
  following on from the UI/UX Overhaul and Card UI Polish milestones (see
  `MILESTONES.md`). Open-ended — needs a pass identifying which
  screens/components haven't had a UI-focused pass yet before it turns
  into concrete legs.

## Future Milestones (unscheduled)

`src/renderer/_archived/battle-logger/hooks/useBattleLogActions.ts` (1,001
lines) is also over the 500-line hard cap flagged by the Project Revision v2
audit (`docs/investigations/project-revision-v2-audit.md`), but it's dead/
archived code, not a live split candidate — the other four files that audit
flagged are now legs under the Maintenance & Code Health Sweep milestone
above.

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

