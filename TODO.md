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

## Current Milestone: Profile System Revamp: Foundation

Done when:
- From any tab, in-app, you can reach your own profile via a pinned sidebar
  entry and press back to return to where you were.
- Visiting another account's profile by exact username works the same way
  in-app.
- Editing your public teams/favorite Pokémon/teamsheet visibility
  (private/closed/open) happens directly on the profile page, not in
  Settings.

- **[Teamsheet Open/Closed Visibility Tiers] — Leg 3** *(Last touched:
  2026-10-18 · Re-checks: 0)*
  Replace the binary `Team.isPublic` with a 3-state visibility
  (`private`/`closed`/`open`) — closed keeps today's species+sprite-only
  exposure, open additionally exposes moves/items/EVs/IVs/nature. Bump
  `TeamsDatabase.schemaVersion`, migrate existing `isPublic: true` teams to
  `closed`, and extend `worker/src/publicProfile.ts`'s
  `extractPublicTeam`/`PublicPokemon` to include the extra fields only for
  open teams.
  Done check: toggling a team to "open" shows its full set on the public
  profile (desktop + web); "closed" shows species/sprite only as before;
  existing public teams migrate to "closed" with no visibility change. Full
  suite passes including new Worker fixture tests for the open-tier fields.
  Manual verification: yes
  Review: yes (persisted data shape + Worker + sync)

- **[Move Profile Editing Onto the Profile Page] — Leg 4** *(Last touched:
  2026-10-18 · Re-checks: 0)*
  Move team/favorite-Pokémon visibility toggles and the new teamsheet-tier
  picker (Leg 3) from Settings' `PublicProfileSection` onto the profile page
  itself, shown only when viewing your own profile. Settings keeps just a
  pointer/link into the profile page rather than duplicating the controls.
  Done check: editing a team's public/private state, teamsheet tier, or
  favorite Pokémon all happens from the profile page with no equivalent
  controls left in Settings.
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

## Future Milestones (unscheduled)

**Profile System Revamp: Previews & Import** — split off Profile System
Revamp's original 8-leg plan (2026-10-18) once Foundation (legs 1-4, above)
is scoped as its own current milestone; promote this to current once
Foundation ships. Legs, carried over as already scoped:

Done when:
- You can import an open-teamsheet team from another account's profile
  straight into your own Teams list.
- Your own profile page groups previewed teams into open/closed teamsheet
  sections with a drag-to-reorder order that persists, and a layout
  choice.
- Teams on a profile page can be filtered/broken down by regulation.

- **[Save/Import a Team From a Profile] — Leg 1**
  Add an "Import to my Teams" action on any open-teamsheet team shown on
  someone else's profile (own profile excluded), using the full set data
  Foundation Leg 3's open tier exposes to build a real `Team` record
  through the normal `useTeams().addTeam()` path. Closed-teamsheet teams
  don't get the action since there's no set data to import.
  Done check: importing an open-teamsheet team from another account's
  profile adds a working copy to your own Teams list with matching
  species/moves/items/EVs/nature; no import action appears on
  closed-teamsheet teams.
  Manual verification: yes

- **[Drag-to-Rearrange Previewed Teams] — Leg 2**
  Let the profile page's team list be drag-reordered, persisting a
  public-facing order. Decide during the leg whether this reuses the
  existing private Teams-list order or needs its own field (likely the
  latter, since reordering for public display shouldn't silently reorder
  the private Teams tab) — if a new field, bump schemaVersion and migrate.
  Done check: dragging a team on your own profile page changes the order
  teams appear in on the public profile, persists across reload/sync, and
  doesn't reorder the private Teams tab unless that's the decision made
  during the leg.
  Manual verification: yes
  Review: yes (likely a persisted data shape change)

- **[Profile Page Sections & Layout] — Leg 3**
  Group previewed teams on the profile page into separate open-teamsheet /
  closed-teamsheet sections, and add a layout control for how they're
  displayed (e.g. grid vs. list). Applies to both your own editable profile
  view and visiting another account's.
  Done check: a profile with both open and closed teams shows them in two
  distinct sections; switching the layout control changes the display
  without losing drag order from Leg 2.
  Manual verification: yes

- **[Regulation Filter on Profile Page] — Leg 4**
  Add a regulation filter/breakdown to the profile page's team list,
  matching how other pages already filter by regulation, so a profile with
  many teams can be narrowed down.
  Done check: filtering by a regulation on a profile page shows only teams
  in that regulation; clearing the filter shows all sections again.
  Manual verification: yes

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

