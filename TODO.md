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

## Current Milestone: Bug Fix & Research Sweep

Done when:
- Mobile empty-team "Add Pokémon" bug is reproduced (or ruled out) and
  either fixed in this milestone or has a concretely scoped follow-up leg.
- Pokepaste format-deprecation rumor is confirmed or closed, with a
  citation recorded.
- Tourney Tab schedule-source question is resolved - either a live source
  identified (with a drafted new exception for
  `external-data-sources.md`) or a decision to fall back to a
  hand-maintained config - enough to scope the actual Tourney Tab UI leg
  later.

All three done-when items are now satisfied (see `COMPLETED.md`'s Bug Fix
& Research Sweep section for all three legs) - this milestone is ready for
`/close-milestone`.

## Unscheduled (not yet scoped, highest-to-lowest priority)

- **[Mobile Teams: Add Pokémon Entry Point] — Leg 1** *(Last touched:
  2026-10-17 · Re-checks: 0)*
  Mobile's Teams swipe-card flow (`MobileTeamSwipeOverlay.tsx`/
  `MobilePokemonCard.tsx`) has no way to add a new Pokémon to a team at all -
  only to swap an existing slot's species. Discovered via the empty-team
  repro in Bug Fix & Research Sweep's Mobile Empty-Team Add Pokémon Bug Leg 1
  (see `docs/investigations/mobile-add-pokemon-entry-point.md`); the
  empty-team case was just the most visible symptom, since
  `MobileTeamSwipeOverlay.tsx` currently bails out and auto-closes the
  instant a team's roster is empty instead of showing anything. Needs a
  design decision on where an "Add Pokémon" entry point lives in a
  single-card swipe-paging deck (an extra page past the last one, a
  persistent header button, or an empty-state screen for the 0-roster case)
  before it's buildable.
  Done check: entry-point placement decided and `AddPokemonStatTable` wired
  up for both the empty-team case and adding beyond an existing roster;
  the current close-on-empty auto-close behavior resolved as part of the
  same change.
  Manual verification: yes. Review: yes (touches persisted team data).

- **[Pokepaste Import: New Showdown Client Team Links] — Leg 1** *(Last
  touched: 2026-10-17 · Re-checks: 0)*
  Showdown's new client (in public beta/transition, not yet default - see
  `docs/investigations/pokepaste-format-research.md`) generates
  `psim.us/t/<teamid>` / `teams.pokemonshowdown.com/view/<teamid>` share
  links from its own first-party team database instead of Pokepaste.
  Today's current-default client and `services/pokepaste.ts` still work
  unaffected, but once the new client goes default, users will increasingly
  share the new link format instead. Needs scoping: a JSON API exists at
  `teams.pokemonshowdown.com/api/<action>` (same `/api/` pattern Showdown
  uses site-wide) that a new import path could call, parallel to
  `services/pokepaste.ts`'s existing `pokepast.es/<id>/json` fetch - but
  unlike pokepast.es, saving a team there requires an autoconfirmed
  Showdown account, which may or may not affect read-only fetches by ID.
  Not urgent while the old client remains default; re-check when Smogon
  signals the new client is becoming default.
  Done check: scoping pass decides whether/how to add this as a second
  import source, or to wait and re-check later.
  Manual verification: no. Review: no.

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

**Competitive Events: Tourney Tab UI** (rescoped 2026-10-17, originally
proposed 2026-09-29 as "Battle Logging: special events / Global
Challenge"; Leg 1's schedule-source research moved into the current Bug
Fix & Research Sweep milestone 2026-10-17). Decided: a curated list, not
freeform user-created events - GC (Global Challenge), Regionals,
International Championships, and Worlds, i.e. The Pokémon Company
International's own sanctioned/sponsored events only. Schedule-source
research resolved 2026-10-17: no live source exists, so this builds on a
hand-maintained config (same pattern as `config/championsMoveOverrides.ts`,
hand-authored from Serebii's `playpokemon` pages) - see
`docs/investigations/tourney-tab-schedule-source-research.md`. Not yet
scoped into a concrete leg: UI showing upcoming events with dates,
location, and signup deadlines where available, plus the config file
itself.

