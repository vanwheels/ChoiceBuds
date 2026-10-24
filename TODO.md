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

## Current Milestone: Selection UX & Data Audit

Done when:
- Move/ability/item descriptions in the three selection dropdowns
  (`MovePickerPanel.tsx`, `AbilityPickerPanel.tsx`, `ItemPickerPanel.tsx`)
  show full text, not truncated to one line.
- Leg 2 has enumerated every move/ability currently falling back to
  `pokeapiService.ts`'s `'No description available'` text across the Gen 9
  VGC-legal pool, confirming Upper Hand and Temper Flare are among them.
- Curated fallback descriptions have been written for Leg 2's gap list
  (following the existing Fairy Feather hardcoded-fallback precedent, moved
  to a dedicated `config/` table if the list is long enough to warrant
  one), with any overflow too large for one session split to Unscheduled.

- **[Selection Dropdown Description Truncation] — Leg 1** *(Last touched:
  2026-10-24 · Re-checks: 0)*
  Remove the `truncate` className on the description `div` in
  `MovePickerPanel.tsx`, `AbilityPickerPanel.tsx`, and `ItemPickerPanel.tsx`
  so full text wraps instead of cutting off — matches the existing
  hover-tooltip text, just shown up front instead of only after adding to a
  Pokémon.
  Done check: all three picker dropdowns render full, unclipped
  descriptions for a move/ability/item with long text.
  Manual verification: yes.

- **[Missing Move/Ability Description Audit] — Leg 2** *(Last touched:
  2026-10-24 · Re-checks: 0)*
  Enumerate every move and ability currently falling back to
  `pokeapiService.ts`'s `extractEffectDescription`'s `'No description
  available'` text across the Gen 9 VGC-legal pool. Upper Hand and Temper
  Flare were flagged as examples, not the full list — confirm they're in
  it, then find the rest. Produces a gap list only, no fixes yet; size is
  unknown until this leg runs.
  Done check: a written list of every move/ability currently showing the
  fallback text, confirmed against Upper Hand/Temper Flare.
  Manual verification: no.

- **[Missing Description Curated Fallbacks] — Leg 3** *(Last touched:
  2026-10-24 · Re-checks: 0)*
  Write curated fallback description text for Leg 2's gap list, following
  the existing Fairy Feather hardcoded-fallback precedent in
  `pokeapiService.ts` — move to a dedicated `config/` table instead if the
  list is long enough to warrant one, per the project's curated-static-data
  convention. If the list is too large for one session, fix what fits and
  split the remainder to Unscheduled as a scoped follow-up rather than
  blocking this leg.
  Done check: every gap from Leg 2's list (or as much as fits one session)
  now shows real description text instead of the fallback, verified by
  spot-checking a sample in the picker panels.
  Manual verification: yes.

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

(Mega Form List Ordering and Type-Changing Ability Move Badge Color,
previously listed here, were bundled into the Display Bug Fix Sweep
milestone, promoted to current and shipped 2026-10-24; see
`MILESTONES.md`.)

(The Ability-Affects-Move Indicator + Type Matchup Mega Toggle item
previously listed here was promoted to current 2026-10-23 and shipped the
same day, see `MILESTONES.md`.)

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
Mega & Alt-Form Representation was promoted to current and shipped the
same day (see `MILESTONES.md`) - its toggle state (`usePokemonFormToggle`)
is now consumable by Type Matchup Rework. Type Matchup Rework was itself
promoted to current and shipped 2026-10-23 (see `MILESTONES.md`), and Team
Editor & Box Fixes was promoted to current and shipped the same day (see
`MILESTONES.md`), bundling in two Unscheduled bug fixes found since the
pass (Mega sprite/toggle gating, useSavedPokemon sync migration gap).
Search & Filter: Tag-Chip Redesign was itself promoted to current and
shipped 2026-10-24 (see `MILESTONES.md`). Selection UX & Data Audit was
itself promoted to current 2026-10-24 (see the Current Milestone section
above). The remaining one, still to be scoped:

- **Calc Improvements** — highlight the selected Pokémon's sprite box in
  the calc; default-highlight and auto-display damage rolls for the
  faster Pokémon's highest-damaging move when two Pokémon are selected;
  item/Pokémon sprites in the calc UI (lowest priority of the three).

