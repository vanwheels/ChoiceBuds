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

## Current Milestone: Mega & Alt-Form Representation

Six candidate milestones came out of a 2026-10-22 feedback/discussion pass
(see that session for full reasoning); this one was picked to go first
because Type Matchup Rework (below, in Future Milestones) depends on its
toggle state. The other five are summarized under Future Milestones below.
Planned via `/plan-milestone` 2026-10-22; Unscheduled triage found nothing
to bundle (both items there are unrelated systems, neither past the
re-check limit).

Done when:
- A shared per-Pokémon mega/alt-form toggle exists and is consumed by the
  team card, team builder, and battle logger.
- Toggling a held mega stone's icon flips the team card to show that
  Mega's ability/stats/typing (existing mega sprite display untouched),
  verified live on a stat/ability/type-changing Mega.
- Aegislash's Blade/Shield can be toggled in the team builder (defaulting
  to Shield, matching in-game start state) and a battle log entry can
  mark a Pokémon as mega-evolved with exactly one extra input.

- **[Battle Log Mega-Evolved Note] — Leg 4** *(Last touched: 2026-10-22 ·
  Re-checks: 0)*
  Add exactly one additional input to the battle logger for marking a
  Pokémon as mega-evolved during a battle. Done check: a mon can be marked
  mega-evolved and that shows up in the log entry/summary. Review: yes
  (adds a field to persisted, synced battle-log data). Manual
  verification: yes.

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

- **[Ability-Affects-Move Indicator: Scoping] — Leg 1** *(Last touched:
  2026-10-22 · Re-checks: 0)*
  From the 2026-10-22 discussion pass: an in-UI indicator for when a
  Pokémon's ability boosts/affects a specific move (e.g. Iron Fist boosting
  Fire Punch but not Close Combat), so that's visible without leaving the
  app to check Serebii/the calc. Scoping only — needs a data-layer design
  pass (likely a new per-ability-per-move applicability table alongside the
  existing curated effect tables in `config/`) before any build leg is cut.
  Done check: a scope doc exists covering data shape and which UI
  surface(s) show the indicator; no code yet. Review: no. Manual
  verification: no.

- **[useSavedPokemon Sync Doesn't Migrate Incoming Records] — Leg 1**
  *(Last touched: 2026-10-19 · Re-checks: 0)*
  Found during Split useSavedPokemon.ts's `/leg-review`:
  `reconcileSyncedSavedPokemon` (utils/savedPokemonSyncReconciliation.ts)
  never runs an incoming sync `records` entry through
  normalizeSavedPokemon/bumpUpdatedAtForFixedEntries before it can win a
  merge or get appended, unlike `reconcileSyncedTeams`'s
  normalizeIncomingSyncTeam step on the Teams side - a pre-migration
  device's stale data can land (and get persisted) here. Pre-existing gap,
  not introduced by that split. See
  `.claude/rules/sync-merge-migration-parity.md`. Done check: either fix
  (mirror normalizeIncomingSyncTeam) or confirm no still-live pre-migration
  devices make this moot, with the finding written down either way. Review:
  yes (sync reconciliation). Manual verification: no.

(The four items previously listed here were bundled into the Profile Social
Scoping & Maintenance milestone on 2026-10-19, now shipped; see
`MILESTONES.md`.)

## Future Milestones (unscheduled)

Profile System Revamp: Previews & Import was promoted to current
2026-10-18 and shipped the same day (see `MILESTONES.md`) - its Leg 5
manual-review follow-ups split back out to Unscheduled above, with
Profile Section Drag-and-Drop Between Open/Closed flagged as the pick for
the next milestone's planning.

Profile Editing & Visibility Controls (the milestone built from that pick)
was promoted to current 2026-10-18 and shipped 2026-10-19 (see
`MILESTONES.md`) - its own Leg 5 absorbed a planned Leg 6 and, per live
feedback mid-leg, reversed the milestone's Leg 4 Edit-mode toggle back to
always-on editing (see
`docs/postmortems/profile-editing-and-visibility-controls.md`). No new
follow-ups split out of this one beyond the `[Split useTeams.ts]` item
already above, now flagged for a third consecutive milestone.

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

2026-10-22 feedback/discussion pass produced six candidate milestones;
Mega & Alt-Form Representation was promoted to current above. The other
five, to be scoped in turn after that one ships and gets evaluated:

- **Search & Filter: Tag-Chip Redesign** — replace the `#`-prefixed text
  search (team builder, Box, add-Pokémon flows) with Showdown-style
  multi-select chips (type/move/ability/tier/egg group/...). Folds in two
  bugs as side effects of the new model rather than separate patches:
  `#`-filtered searches currently exclude Mega evolutions from results
  (e.g. `#dragon` should surface Mega Charizard X), and single-text search
  can't disambiguate a term that's both a type and a move name (`#psychic`
  as type vs. the move Psychic).
- **Type Matchup Rework** — color-code Not Very Effective/Super
  Effective/Total Weak/Total Resist by magnitude instead of one flat color
  per category; retire Team Gap Analysis (concluded 2026-10-22 it can't
  convey trustworthy information given set variance, Mega/Tera, and
  dynamic game state) in favor of an objective shared-weakness/resistance
  coverage view; wire in the Mega & Alt-Form Representation milestone's
  toggle state so matchups reflect Mega typing/ability changes (e.g.
  Aerilate). Depends on that milestone's Leg 1 toggle state.
- **Selection UX & Data Audit** — two different-kind legs, not one: (a)
  stop truncating move/ability/item descriptions in selection dropdowns —
  currently only the full text shows, and only after the fact on hover
  once already added to a Pokémon; (b) audit curated move/ability
  description coverage for gaps (Upper Hand flagged as missing; verify
  exact names before auditing further — "Temper Flare" as given doesn't
  match a known Gen 9 move/ability).
- **Calc Improvements** — highlight the selected Pokémon's sprite box in
  the calc; default-highlight and auto-display damage rolls for the
  faster Pokémon's highest-damaging move when two Pokémon are selected;
  item/Pokémon sprites in the calc UI (lowest priority of the three).
- **Team Editor & Box Fixes** — fix the bug where swapping an existing
  team Pokémon via its sprite box excludes Box Pokémon from the Add
  Pokémon picker (it shouldn't); switch the Box's expand-in-place
  (currently shifts the whole grid awkwardly) to a popup/modal; strip the
  irrelevant Aegislash blade/shield and Maushold family-size form picker
  from opponent-team selection in the battle logger (unrelated quick fix,
  not the Aegislash toggle feature above — Aegislash always defaults to
  Shield there and that's correct, the split is just noise in that
  specific picker).

