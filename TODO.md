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

## Current Milestone: Public Profiles & Team Sharing

Done when:
- [x] The safety filter is live across username, public team name, and
  Pokémon-nickname entry points, with existing accounts screened against it.
- [x] Any visitor can view another account's public profile (preset icon +
  username) by URL with no login required.
- [x] Teams and a new favorite-Pokémon field can each be individually toggled
  public from that account, off by default, and show/hide correctly on the
  public profile page.

All three done-when criteria are met as of Per-Item Visibility Toggles —
Leg 1 (commit f0bb5cb), and live verification (toggling a team/the favorite
pick public and confirming it shows/hides correctly on the live
`/u/<username>` page) is now also done as of Leg 2 (see COMPLETED.md) - this
milestone looks ready for `/close-milestone`.

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

- **[Tourney Tab: Schedule Change Detection] — Leg 1** *(Last touched:
  2026-10-17 · Re-checks: 0)*
  Raised while closing the Mobile Teams & Tourney Tab milestone: TPCi's
  announcement cadence for Regionals/Internationals is irregular enough
  that even a fixed re-check interval could miss changes - this past week
  alone added 2 unannounced Regionals mid-season. No live/structured
  schedule source exists (confirmed in
  `docs/investigations/tourney-tab-schedule-source-research.md`), so
  `config/tourneyEvents.ts` stays hand-authored per
  `external-data-sources.md` exception #2 regardless. Needs scoping: is a
  periodic (e.g. monthly) automated diff-check against Serebii's
  `playpokemon` pages - flagging a change for manual review/update rather
  than auto-writing the config - worth building, or does manual re-check
  stay fully user-driven?
  Done check: scoping pass decides whether to build a change-detection poll
  (and on what cadence) or leave this as a fully manual, no-automation
  process.
  Manual verification: no. Review: no.

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

- **[Public Team Browse & Upload Database] — Leg 1** *(Last touched:
  2026-10-17 · Re-checks: 0)*
  Split out of Public Profiles & Team Sharing's scoping (2026-10-17): a
  shared public team browse/upload database, beyond the per-team visibility
  toggles that milestone covers. The open question is the abuse/moderation
  model for public uploads - needs its own dedicated scoping pass before
  any legs get written here; not leg-ready yet.
  Done check: scoping pass picks a moderation model (or decides not to
  build this) before any legs get written.
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

Public Profiles & Team Sharing was promoted to current 2026-10-17 (see
`TODO.md`'s Current Milestone section) - its original leg 4 (shared public
team browse/upload database) split back out to Unscheduled above since its
moderation model still needs its own scoping pass.

