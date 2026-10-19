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

## Current Milestone: Profile Editing & Visibility Controls

Done when:
- Team visibility (open/closed) can be changed from all three new surfaces
  — the section add-team picker, cross-section drag, and the Teams tab —
  each persisting through the existing `updateTeam` path.
- The profile page's editing controls (visibility dropdowns + favorite-
  Pokemon search) are hidden by default behind an explicit Edit toggle,
  with favorite-Pokemon editing moved onto its sprite.
- Full test suite passes and all four legs are manually verified live.

- **[Profile Section Add-Team Picker] — Leg 1** *(Last touched: 2026-10-18 ·
  Re-checks: 0)*
  Each Open/Closed teamsheet section (`ProfileTeamSection.tsx`) gets a
  "+ Team" box at the bottom; clicking it opens a scrollable picker of your
  own Teams reusing `MobileTeamRow.tsx`'s sprite-strip + team-name row
  display, and picking one sets that team's `visibility` to the section's
  tier.
  Done check: the picker lists every team not already in that tier; picking
  one adds it to the section and persists through the normal `updateTeam`
  path.
  Manual verification: yes

- **[Profile Section Drag-and-Drop Between Open/Closed] — Leg 2**
  *(Last touched: 2026-10-18 · Re-checks: 0)*
  `ProfileTeamSection.tsx`'s drag-reorder deliberately never crosses between
  Open and Closed (see its own header comment) since a cross-section drag
  used to have no defined meaning. This flips that: dragging a team card
  from one section into the other changes its `visibility` tier,
  auto-persisting through `updateTeam` on drop. Needs its own
  `useGridReorder`-adjacent design since the hook is currently scoped to one
  section's ids at a time.
  Done check: dragging a team card across the Open/Closed boundary updates
  its visibility and the team re-renders in the destination section.
  Manual verification: yes · Review: yes (new cross-section drag state logic
  touching persisted visibility)

- **[Teams Page Profile-Visibility Indicator] — Leg 3** *(Last touched:
  2026-10-18 · Re-checks: 0)*
  The Teams tab itself (`TeamsPage.tsx`/`TeamCard.tsx`) should show a visual
  indicator on any team currently visible on your profile (open or closed
  tier), with the ability to add/remove/change that from the Teams page
  directly instead of only from the profile page's own editing controls.
  Done check: a team card on the Teams tab visibly marks its profile
  visibility state, and that state can be changed from there.
  Manual verification: yes

- **[Profile Edit Mode: Inline Favorite Pokemon Editing] — Leg 4**
  *(Last touched: 2026-10-18 · Re-checks: 0)*
  `ProfileEditControls.tsx`'s always-visible panel (team visibility
  dropdowns + a permanently-shown species search box for the favorite
  Pokemon) becomes an explicit "Edit" toggle on the profile page instead,
  with the favorite Pokemon editable by clicking directly on its own sprite
  rather than a separate search box below it.
  Done check: an Edit button on your own profile page toggles edit
  affordances on/off; clicking the favorite Pokemon's sprite while editing
  opens the species picker in place.
  Manual verification: yes

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

- **[Profile Notes & Moderation] — Leg 1** *(Last touched: 2026-10-18 ·
  Re-checks: 0)*
  Split out of Profile System Revamp scoping. Whether profile teams get a
  freeform notes field is still an open question from Vanny himself
  ("would need moderation as well?") — needs its own scoping pass on the
  moderation model (or lack thereof) before any implementation, same
  pattern as the public-team-database question Scoping Sweep Leg 3 closed.

- **[Player Search Directory] — Leg 1** *(Last touched: 2026-10-18 ·
  Re-checks: 0)*
  Split out of Profile System Revamp scoping. A browsable/searchable
  directory of usernames is the same shape of decision as the public team
  database Scoping Sweep Leg 3 decided against (2045642) — the Worker
  becoming a discoverable, centrally-hosted directory, not just a
  moderation question. Profile System Revamp ships exact-username lookup
  only; this item is a decide-first leg if that stance ever gets revisited.

- **[Player Favoriting / Friend System] — Leg 1** *(Last touched:
  2026-10-18 · Re-checks: 0)*
  Split out of Profile System Revamp scoping. Vanny's own framing was
  tentative ("maybe"). Depends on the Player Search Directory decision
  above — a friend/favorite system needs some way to find the other
  account first, so this stays unscheduled until that's resolved.

- **[Split useTeams.ts] — Leg 1** *(Last touched: 2026-10-18 ·
  Re-checks: 0)*
  Flagged by `/leg-review` on Teamsheet Open/Closed Visibility Tiers Leg 3
  (2026-10-18): `src/renderer/hooks/useTeams.ts` is now 634 lines, further
  over CLAUDE.md's 500-line hard cap (it was already at 588 before that
  leg). Not a live bug — a maintenance split, same shape as the four files
  the Project Revision v2 audit flagged that became Maintenance & Code
  Health Sweep's legs. Needs its own scoping pass on where the natural
  seams are (load/migration vs. the CRUD mutators vs. applySyncedState's
  reconciliation logic look like the obvious candidates, but worth
  confirming before splitting).
  Done check: `useTeams.ts` and whatever it's split into are each under the
  500-line hard cap, with no behavior change (full suite still passes).

## Future Milestones (unscheduled)

Profile System Revamp: Previews & Import was promoted to current
2026-10-18 and shipped the same day (see `MILESTONES.md`) - its Leg 5
manual-review follow-ups split back out to Unscheduled above, with
Profile Section Drag-and-Drop Between Open/Closed flagged as the pick for
the next milestone's planning.

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

UI Shift Assessment Sweep — Post Card UI Polish, dropped as stale
2026-10-17 (last touched 2026-09-08, never scoped past its open-ended
framing). Any future UI-focused requests get scoped fresh as needed rather
than carrying this placeholder forward.

Password reset flow, deferred out of Web Version: Teams & Box MVP's scoping
(2026-09-29, see `docs/investigations/web-version-scope.md`) - not yet
worth its own leg: needs a transactional email API + SPF/DKIM
deliverability setup on a dedicated vannyproductions.com subdomain.

Public Profiles & Team Sharing was promoted to current 2026-10-17 and
shipped the same day (see `MILESTONES.md`) - its original leg 4 (shared
public team browse/upload database) split back out to Unscheduled above
since its moderation model still needs its own scoping pass.

Public route bundle split (noted 2026-10-18, during Profile Page Sections &
Layout Leg 3's routing discussion): `/u/<username>` currently shares the
main `web/` bundle with the full signed-in app (`web/main.tsx` statically
imports both `AppWeb` and `PublicProfilePage`) rather than being a
dedicated lightweight bundle the way `web/download/` is - `PublicProfilePage`
just never calls the heavier Teams/Box/sync hooks, so the "no app state for
anonymous visitors" goal is achieved at the runtime-behavior level, not the
bundle-size level (an anonymous `/u/<username>` visitor still downloads the
entire app bundle). Worth splitting into a dedicated `web/public/` Vite
entry (served via the same `404.html` redirect trick `/u/<username>`
already uses, since it needs a dynamic path segment `web/download/`
doesn't) once a second public dynamic route actually gets built - e.g.
public team displays not tied to a profile. Not worth restructuring the
build for a pattern with only one real example today.

