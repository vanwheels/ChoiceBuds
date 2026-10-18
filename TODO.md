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

## Current Milestone: Scoping Sweep

Done when:
- Tourney Tab: Schedule Change Detection has a recorded decision — build a
  periodic Serebii diff-check poll (and on what cadence), or stay fully
  manual.
- Pokepaste Import: New Showdown Client Team Links has a recorded decision —
  add `teams.pokemonshowdown.com/api` as a second import source now, or wait
  and re-check later.
- Public Team Browse & Upload Database has a recorded decision — a
  moderation model for public uploads, or not building it.

- **[Scoping Sweep] — Leg 1** *(Last touched: 2026-10-18 · Re-checks: 0)*
  Scoping pass for Tourney Tab: Schedule Change Detection. TPCi's
  announcement cadence for Regionals/Internationals is irregular enough that
  even a fixed re-check interval could miss changes - this past week alone
  added 2 unannounced Regionals mid-season. No live/structured schedule
  source exists (confirmed in
  `docs/investigations/tourney-tab-schedule-source-research.md`), so
  `config/tourneyEvents.ts` stays hand-authored per
  `external-data-sources.md` exception #2 regardless. Decide whether a
  periodic (e.g. monthly) automated diff-check against Serebii's
  `playpokemon` pages - flagging a change for manual review/update rather
  than auto-writing the config - is worth building, or whether manual
  re-check stays fully user-driven. Research/decision only - no
  implementation this leg.
  Done check: decision recorded (build the poll + cadence, or stay manual).
  Manual verification: no. Review: no.

- **[Scoping Sweep] — Leg 2** *(Last touched: 2026-10-18 · Re-checks: 0)*
  Scoping pass for Pokepaste Import: New Showdown Client Team Links.
  Showdown's new client (in public beta/transition, not yet default - see
  `docs/investigations/pokepaste-format-research.md`) generates
  `psim.us/t/<teamid>` / `teams.pokemonshowdown.com/view/<teamid>` share
  links from its own first-party team database instead of Pokepaste. Today's
  current-default client and `services/pokepaste.ts` still work unaffected.
  A JSON API exists at `teams.pokemonshowdown.com/api/<action>` (same
  `/api/` pattern Showdown uses site-wide) that a new import path could call,
  parallel to `services/pokepaste.ts`'s existing `pokepast.es/<id>/json`
  fetch - but unlike pokepast.es, saving a team there requires an
  autoconfirmed Showdown account, which may or may not affect read-only
  fetches by ID. Decide whether/how to add this as a second import source
  now, or wait and re-check once Smogon signals the new client is becoming
  default. Research/decision only - no implementation this leg.
  Done check: decision recorded (add the second import source now, or wait).
  Manual verification: no. Review: no.

- **[Scoping Sweep] — Leg 3** *(Last touched: 2026-10-18 · Re-checks: 0)*
  Scoping pass for Public Team Browse & Upload Database. Split out of Public
  Profiles & Team Sharing's scoping (2026-10-17): a shared public team
  browse/upload database, beyond the per-team visibility toggles that
  milestone covers. Decide the abuse/moderation model for public uploads (or
  decide not to build this) before any implementation legs get written.
  Research/decision only - no implementation this leg.
  Done check: moderation model picked, or decision recorded not to build
  this.
  Manual verification: no. Review: no.

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

(none)

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

Public Profiles & Team Sharing was promoted to current 2026-10-17 and
shipped the same day (see `MILESTONES.md`) - its original leg 4 (shared
public team browse/upload database) split back out to Unscheduled above
since its moderation model still needs its own scoping pass.

