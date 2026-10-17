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

## Current Milestone: Mobile Web & UI Polish

Done when:
- The 5 unpadded mobile-web tabs (Battle Log, Statistics, Type Matchup,
  Speed Tiers, Settings) each supply their own mobile content-area padding,
  matching TeamsPage/BoxPageGrid's existing pattern.
- The "Get the desktop app" sidebar link in the web app is more
  discoverable (styling/placement improved from its current small/easy-to-
  miss state).
- All 4 team-picker call sites (`CalcTeamTray.tsx`, `SpeedTierFieldPanel.tsx`,
  `TypeMatchupPage.tsx`, `RecordMatchForm.tsx`) use a shared sprite-aware
  dropdown component instead of a plain native `<select>`.

- **[Download App Sidebar Link Visibility] — Leg 2** *(Last touched:
  2026-10-17 · Re-checks: 0)*
  The `/download/` link added to `AppWeb.tsx`'s sidebar footer is small and
  easy to miss. Improve its styling/placement so it reads as a real call to
  action without overpowering the rest of the sidebar footer.
  Done check: link is visually distinct and easy to notice in the sidebar
  footer on both desktop and mobile web widths.
  Manual verification: yes. Review: no.

- **[Team Picker Sprites: Shared Component] — Leg 3** *(Last touched:
  2026-10-17 · Re-checks: 0)*
  `CalcTeamTray.tsx`, `SpeedTierFieldPanel.tsx`, `TypeMatchupPage.tsx`, and
  `RecordMatchForm.tsx` all pick a team via a plain native `<select>` with
  text-only options, which can't show sprites inline. Build one shared
  sprite-aware team-picker dropdown component, following the existing
  icon-row dropdown pattern already implemented in
  `AbilityPickerPanel.tsx`/`ItemPickerPanel.tsx`.
  Done check: new component renders a team list with sprites per option,
  matching the look/interaction of the existing ability/item picker
  pattern; not yet wired into any of the 4 call sites.
  Manual verification: yes. Review: no.

- **[Team Picker Sprites: Adoption] — Leg 4** *(Last touched: 2026-10-17 ·
  Re-checks: 0)*
  Depends on Leg 3. Replace the native `<select>` in `CalcTeamTray.tsx`,
  `SpeedTierFieldPanel.tsx`, `TypeMatchupPage.tsx`, and `RecordMatchForm.tsx`
  with the shared sprite-aware component from Leg 3.
  Done check: all 4 call sites use the shared component; team selection
  still works correctly at each site (including any site-specific
  behavior, e.g. `CalcTeamTray`'s existing sprite row below the dropdown).
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

- **[Mobile Empty-Team Add Pokémon Bug] — Leg 1** *(Last touched:
  2026-10-17 · Re-checks: 0)*
  Reported live 2026-10-17: on mobile web, tapping into an empty team (no
  Pokémon yet) doesn't let you add one. Unknown how long this has existed
  or whether it's mobile-only vs. also broken on desktop/App.tsx - not yet
  reproduced or root-caused, just the live report. Needs its own repro
  pass on `dev:mobile` before it's scoped into concrete legs.
  Done check: repro confirmed (or ruled out) and root cause identified;
  fix scoped as a follow-up leg once the cause is known.
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

