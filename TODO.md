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

## Current Milestone: TeamCard Bug Fixes & Dev Tooling

Done when:
- Dev-env mobile-preview script confirmed working live.
- TeamCard Notes blur bug has a reliable repro, root cause, and verified
  fix.
- Overflow Menu's "Validate Team" popup no longer blocks the dropdown's
  other items.
- Paste Team jump is either fixed or explicitly deferred with reasoning.

- **[TeamCard Notes: Data Loss on First Blur After Expand] — Leg 2** *(Last
  touched: 2026-10-17 · Re-checks: 0)*
  `/leg-review` on Leg 1's fix found it left the same blind-overwrite flaw
  open for a different race: `applySyncedState`'s `reconciled` list falls
  back to `remote` for any id missing from `localById`, which also matches
  a team deleted locally after the push snapshot was taken but before the
  response landed - so the deleted team gets put back, and the unconditional
  `tombstonesRef.current = []` on the same success path throws away the
  tombstone that would've told the server about the deletion on the next
  sync. Fix: check `tombstonesRef.current` for ids being dropped before
  falling back to `remote`, and only clear the tombstones that were actually
  included in this sync's push, not all of them. Also fix `applySyncedState`'s
  public doc comment on `UseTeamsReturn` (still says records are "stored
  exactly as given" - no longer true post-Leg-1).
  Done check: new regression test covering "local delete wins" (mirroring
  the existing "local edit wins" / "local-only new team survives" tests),
  doc comment matches actual behavior, full suite/lint/type-check pass.
  Manual verification: no - unit-test coverage of the queue-ordering race is
  sufficient, same reasoning as Leg 1. Review: recommended - same
  sync/persisted-data merge logic as Leg 1.

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

- **[applySyncedState Reconciliation Loses Local-Only Team's List Position]
  — Leg 1** *(Last touched: 2026-10-17 · Re-checks: 0)*
  Flagged by `/leg-review` on the TeamCard Notes data-loss fix (Leg 2 of
  that item). `useTeams.ts::applySyncedState`'s `reconciled` array appends
  surviving local-only teams after all of `records`, rather than preserving
  their original position - a team added during the sync race window (no
  `sortOrder` yet) lands at the end of the list instead of the front
  `addTeam` normally inserts at. Cosmetic and self-correcting on the next
  reorder/sync; low priority.
  Manual verification: no. Review: no.

- **[Sibling Hooks' applySyncedState Stale-Overwrite Race] — Leg 1** *(Last
  touched: 2026-10-17 · Re-checks: 0)*
  Flagged while fixing TeamCard Notes: Data Loss on First Blur After
  Expand (see `docs/investigations/teamcard-notes-sync-race.md`).
  `useBattles.ts::applySyncedState` and `useSavedPokemon.ts::
  applySyncedState` share the exact same blind-overwrite shape that bug's
  fix just closed in `useTeams.ts::applySyncedState` (the former's own doc
  comment says "mirrors useTeams.ts::applySyncedState") - a debounced
  auto-sync response landing after a local edit already won the
  `enqueueMutation` queue would silently discard that edit, same mechanism,
  different collections (battle notes/edits, Box entries). Not verified
  live as an actual reported symptom yet, unlike the Teams case. Likely
  fix mirrors `useTeams.ts`'s: reconcile per-record on `updatedAt` instead
  of overwriting wholesale, plus keep local-only records the sync response
  doesn't know about yet.
  Done check: same reconciliation applied to both hooks' `applySyncedState`,
  regression tests mirroring `useTeams.test.ts`'s two new cases, full suite
  passes.
  Manual verification: no (unit-test coverage is sufficient, same as the
  Teams fix). Review: recommended - touches sync/persisted-data merge logic.

- **[Web Download/Landing Page] — Leg 1** *(Last touched: 2026-10-17 ·
  Re-checks: 0)*
  Scoped 2026-10-17 out of the Web Hosting & Domain fast-follow note below.
  A landing/download page on choicebuds.vannyproductions.com that calls
  `api.github.com/repos/vanwheels/ChoiceBuds/releases/latest` (same call
  `services/github.ts`'s in-app update checker already makes), detects the
  visitor's OS, and links to that release's OS-appropriate installer asset.
  GitHub Releases stays the actual file host — no universal/self-fetching
  installer needed.
  Done check: OS detection correct on both Windows and macOS, links resolve
  to the right asset, page deployed live and reachable.
  Manual verification: yes. Review: no.

- **[Web Content-Area Padding Fix] — Leg 1** *(Last touched: 2026-10-17 ·
  Re-checks: 0)*
  Scoped 2026-10-17, originally flagged 2026-09-30 during live verification
  of Battle Log & Statistics Parity. `AppWeb.tsx`'s `<main>` has no padding
  at all, unlike `App.tsx`'s desktop `<main>` (2rem/1.5rem inline styles),
  so ported pages render edge-to-edge in the browser — visible on the
  Battle Log page's card grid butting against the viewport edges. Fix:
  mirror `App.tsx`'s `<main>` padding onto `AppWeb.tsx`. Confirm first that
  no existing web page relies on `<main>` having zero padding before
  applying it everywhere.
  Manual verification: yes. Review: no.

- **[Teams Tab Search Bar] — Leg 1** *(Last touched: 2026-10-17 ·
  Re-checks: 0)*
  Scoped 2026-10-17, proposed 2026-09-29. Search for a specific Pokémon by
  name and surface which of the user's saved Teams include it. Partial
  (substring) match on species or nickname; Teams-only, not the Box.
  Done check: typing a partial species/nickname name filters the Teams list
  to matching teams live.
  Manual verification: yes. Review: no.

- **[Item Usage Percentage Ordering] — Leg 1** *(Last touched: 2026-10-17 ·
  Re-checks: 0)*
  Scoped 2026-10-17. `championsBattleData.ts` already fetches `held_item`
  usage rows (`items: rowsFor('held_item')`) from the same
  championsbattledata.com source the existing move/ability usage-percentage
  ordering already uses — this wires that existing data into
  `ItemPickerPanel.tsx`'s ordering, mirroring the move/ability pattern.
  Manual verification: yes. Review: no.

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

UI Shift Assessment Sweep — Post Card UI Polish, dropped as stale
2026-10-17 (last touched 2026-09-08, never scoped past its open-ended
framing). Any future UI-focused requests get scoped fresh as needed rather
than carrying this placeholder forward.

Password reset flow, deferred out of Web Version: Teams & Box MVP's scoping
(2026-09-29, see `docs/investigations/web-version-scope.md`) - not yet
worth its own leg: needs a transactional email API + SPF/DKIM
deliverability setup on a dedicated vannyproductions.com subdomain.

**Public Profiles & Team Sharing** (rescoped 2026-10-17, originally
deferred 2026-09-29 out of Web Version: Teams & Box MVP - account system
and username design now shipped, see `docs/investigations/web-version-scope.md`).
Display name = the existing login username (decided 2026-10-17, no
separate field). Candidate legs:
1. Public profile route showing a preset icon (not user-uploadable) +
   username, nothing else, public by default.
2. Per-item opt-in toggles for everything beyond the base profile - teams
   visibility, a new favorite-Pokémon field, whatever else gets decided at
   scoping time.
3. Profanity/safety filter for usernames, public team names, and public
   Pokémon nicknames - needs its own research pass on approach (word-list
   library vs. a filtering API) before it's a concrete leg.
4. Shared public team browse/upload database (scope widened 2026-09-29 by
   Vanny beyond per-team visibility toggles) - the biggest open question:
   abuse/moderation model for a public upload database. Flagged as needing
   its own dedicated scoping pass before any legs get written here; not
   leg-ready yet.

**Team Picker Sprites** (proposed 2026-10-17): the "Load From Team"
dropdown (`CalcTeamTray.tsx`), Speed Tiers (`SpeedTierFieldPanel.tsx`),
Type Matchup (`TypeMatchupPage.tsx`), and Battle Log's `RecordMatchForm.tsx`
all currently pick a team via a plain native `<select>` with text-only
options - team names aren't always a reliable indicator of what's on the
team, and a native `<select>` can't render sprites inside its own option
list (you only see sprites after picking, e.g. `CalcTeamTray`'s sprite row
below the dropdown). `AbilityPickerPanel.tsx`/`ItemPickerPanel.tsx` already
implement a custom icon-row dropdown pattern elsewhere in the app, so this
is building one shared sprite-aware team-picker component against that
existing pattern and adopting it in the 4 call sites above, not 4 one-off
fixes. Likely 2 legs: the shared component, then adoption across the 4
sites.

**Pokepaste Format Research** (proposed 2026-10-17): Vanny recalled
Showdown moving away from Pokepaste integration toward its own newer
format. A web search during scoping found no corroborating evidence -
general documentation and a 2026 third-party guide both still describe
`pokepast.es` as the standard, in-use export format. First leg is a direct
check (Smogon forums / Showdown's own GitHub changelog, not just a general
web search) to confirm or close this before any follow-up work gets
scoped - this project's existing Pokepaste integration
(`services/pokepaste.ts`, `.claude/rules/external-data-sources.md`
exceptions #3/#8) is active and working either way.

**Competitive Events: Tourney Tab** (rescoped 2026-10-17, originally
proposed 2026-09-29 as "Battle Logging: special events / Global
Challenge"). Decided: a curated list, not freeform user-created events -
GC (Global Challenge), Regionals, International Championships, and Worlds,
i.e. The Pokémon Company International's own sanctioned/sponsored events
only. No existing approved external data source covers tournament
schedules (`.claude/rules/external-data-sources.md` has 9 numbered
exceptions, none of them this). Candidate legs:
1. Research pass for a live/structured schedule source (e.g. Play!
   Pokemon's event locator) for the events above; falls back to a
   hand-maintained config file (same pattern as
   `config/championsMoveOverrides.ts`) if nothing reliable turns up. A live
   source would need its own new numbered exception added to
   `external-data-sources.md`.
2. Tourney tab UI (depends on Leg 1's outcome) showing upcoming events with
   dates, location, and signup deadlines where available.

