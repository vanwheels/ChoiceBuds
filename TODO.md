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

## Current Milestone: Search & Filter: Tag-Chip Redesign

Done when:
- Team builder (Roster Swap + the "+ Add Pokémon" slot, both served by
  `AddPokemonStatTable.tsx` since 2026-10-16 - `SpeciesPickerCard.tsx` no
  longer serves either, see COMPLETED.md's Leg 2 entry) and Box search
  (`BoxPage.tsx`/`BoxPageToolbar.tsx`) all use multi-select type/move/
  ability chips instead of free-text `#tag` syntax; multiple chips still
  AND together.
- Chip matching ignores spaces/hyphens in move/ability names ("fireblast" =
  "fire blast" = "fire-blast") and disambiguates a name that's both a type
  and a move (e.g. Psychic) via distinct chip options, not text guessing.
- Mega forms surface as results wherever an active chip matches the Mega's
  own type/ability, consistently across both `AddPokemonStatTable.tsx` and
  Box's saved-build search - no separate "Mega" chip required anywhere.

- **[Search & Filter: Tag-Chip Redesign] — Leg 4** *(Last touched:
  2026-10-24 · Re-checks: 0)*
  Narrowed from its original scope now that Leg 2 already wired
  `TagChipInput` into `AddPokemonStatTable.tsx`: flip its Mega-row gating
  from Leg 2's interim "only in the unfiltered browse view" behavior (no
  chip category exists for the old standalone `#mega` tag) to implicit -
  any active type/move/ability chip that matches a Mega form's own stats/
  type/ability also surfaces that Mega's row, no separate Mega chip needed.
  Update `docs/investigations/mega-form-rows-scoping.md`'s recorded
  `#mega`-tag decision to reflect the reversal.
  Done check: a chip like "Dragon" surfaces Mega Charizard X without a
  Mega chip present, across Roster Swap/the "+ Add Pokémon" slot/Box's
  "+ New Build"; existing non-Mega filtering still matches Leg 2's behavior.
  Manual verification: yes. Review: no.

- **[Search & Filter: Tag-Chip Redesign] — Leg 5** *(Last touched:
  2026-10-23 · Re-checks: 0)*
  Extend Box's chip matching so a saved build holding a Mega Stone matches
  an active chip against the Mega form's own type/ability, not just the
  base species' - a predicate-only change (Box filters existing builds, it
  doesn't create new rows), lighter than Leg 4.
  Done check: a saved build holding a Mega Stone whose Mega form (not its
  base form) matches an active chip shows up in Box search results.
  Manual verification: yes. Review: no.

(A Leg 5 previously listed here - "Add Mega rows to `SpeciesPickerCard.tsx`
... so Mega forms are selectable here for the first time" - was dropped
2026-10-24 as moot: its premise assumed `SpeciesPickerCard.tsx` still
served Roster Swap/the Add-Pokémon slot, which Leg 2's correction found was
already false as of 2026-10-16 - `AddPokemonStatTable.tsx` has served both
since then and already has Mega rows. Nothing left to do there; the old
Leg 6 was renumbered up to fill the gap.)

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

- **[Type-Changing Ability Move Badge Color] — Leg 1**
  *(Last touched: 2026-10-23 · Re-checks: 0)*
  On Team/Box/Builder cards, a move whose type an equipped ability changes
  (Aerilate, Pixilate, Refrigerate, Galvanize, Normalize, Liquid Voice) still
  shows its badge in the move's raw listed type color rather than the
  effective type the ability produces. `MoveBubbleGrid.tsx`'s move bubbles
  (and `TooltipContent.tsx`) should color via
  `config/typeChangingAbilities.ts`'s `getEffectiveMoveType` - already used
  by `hooks/useTeamMoveTypes.ts` for the same purpose in Type Matchup's
  Offensive Coverage - instead of the move's own `type` field directly.
  Surfaced 2026-10-23 during Ability-Affects-Move Indicator & Type Matchup
  Mega Toggle Leg 3; flagged as separate scope rather than folded into that
  leg since it's a different surface (card move bubbles, not Type Matchup)
  and outside that milestone's done-when.

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
pass (Mega sprite/toggle gating, useSavedPokemon sync migration gap). The
remaining three, to be scoped in turn:

- **Search & Filter: Tag-Chip Redesign** — replace the `#`-prefixed text
  search (team builder, Box, add-Pokémon flows) with Showdown-style
  multi-select chips (type/move/ability/tier/egg group/...). Folds in two
  bugs as side effects of the new model rather than separate patches:
  `#`-filtered searches currently exclude Mega evolutions from results
  (e.g. `#dragon` should surface Mega Charizard X), and single-text search
  can't disambiguate a term that's both a type and a move name (`#psychic`
  as type vs. the move Psychic).
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

