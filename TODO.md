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

## Current Milestone: Calc Page Rework

Rework of the Calc popup for web and app first; mobile may diverge later and
is out of scope here. Scoped 2026-10-26. Decisions: sprites are
semi-transparent and sit behind text, so sprites and move boxes can flex
around each other; doubles weather/terrain follows the game rule (slower
setter wins), re-applies only on species/ability change, and manual chip
clicks override it; Saved Sets are wiped with no migration (everything lives
in Box); each side gets its own bottom Box panel showing the same Box
Pokémon, click loads into that side; smart pickers show learnable/legal
entries first, then an "All" section when searching beyond them.

- **[Calc Page Rework: Layout] — Leg 1** *(Last touched: 2026-10-26 ·
  Re-checks: 0)*
  Widen the popup (`CalcPopup.tsx` is `max-w-6xl`), cut move boxes to ~50%
  width, color move boxes by type, replace weather/terrain dropdowns with
  always-visible chips, and color natures with +/- next to names. Done when:
  all five render correctly in `dev` and `dev:web`. Manual verification.
  Implemented 2026-10-26; user verified move colors, weather, widths. Left:
  recheck inactive weather/terrain chips' colored outline.

- **[Calc Page Rework: Sprites & Icons] — Leg 2** *(Last touched: 2026-10-26 ·
  Re-checks: 0)*
  Semi-transparent animated sprites for each side, behind text, in the space
  freed by Leg 1's narrower move boxes (P1 far left, P2 far right). Add
  sprites/icons beside names in species and item search results
  (`CalcAutocomplete.tsx`). Manual verification.

- **[Calc Page Rework: Current HP] — Leg 3** *(Last touched: 2026-10-26 ·
  Re-checks: 0)*
  Add current HP as both % and flat value, kept in sync like Showdown's
  calc, and feed it into the damage engine. Done when: tests cover the
  %/flat sync and the engine result at partial HP.

- **[Calc Page Rework: Auto Weather & Terrain] — Leg 4** *(Last touched:
  2026-10-26 · Re-checks: 0)*
  Weather/terrain setting abilities (Drought, Psychic Surge, etc.) update the
  field on species/ability change, per the decisions above. Needs a
  comprehensive curated table in `config/` per the curated-effect-table
  rule, including Megas. Tests written from the rule before the code.

- **[Calc Page Rework: Smart Pickers & Hover Details] — Leg 5** *(Last
  touched: 2026-10-26 · Re-checks: 0)*
  Ability and move pickers list the current species' own options first
  (Champions ability overrides and movepool changes respected), with search
  for the rest. Item, ability, and move show descriptions on hover. Split
  into abilities/hover and moves if it won't fit one session.

- **[Calc Page Rework: Box Integration] — Leg 6** *(Last touched: 2026-10-26 ·
  Re-checks: 0)*
  Remove the Saved Sets feature (`CalcSavedSetsModal.tsx`, its persisted
  data, and the tab), make "Save Set" write a Pokémon to Box, and add a
  per-side bottom Box panel. Touches persisted data, so it gets a
  `/leg-review` before closing. Manual verification.

- **[Calc Page Rework: Custom Dropdowns] — Leg 7** *(Last touched: 2026-10-26 ·
  Re-checks: 0)*
  Replace the native Nature (and Status) `<select>`s in
  `CalcPokemonPanelFields.tsx` with a custom picker so options can carry
  mixed-color `+Atk −SpA` text and usage %. Start from the team builder's
  `NaturePickerPanel.tsx` (add optional usage-% and sort-order props; it
  already colors via `getStatLabelColor`) rather than building new. Should
  land before Leg 5 so the smart pickers share it. Manual verification.

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

- **[Mega Golisopod Steel Filter Bug] — Leg 1** *(Last touched: 2026-10-26 ·
  Re-checks: 0)*
  Found during manual testing: Mega Golisopod doesn't show up under the
  Steel filter in + Add Pokemon. Likely cause: species filtering there
  isn't accounting for the type change caused by mega evolving, so
  Golisopod's base (non-Steel) typing is used instead of its Mega's
  Bug/Water + Steel-relevant typing. Needs scoping to confirm whether this
  affects other Megas with altered typing, not just Golisopod.

- **[Team Search by Species] — Leg 1** *(Last touched: 2026-10-26 ·
  Re-checks: 0)*
  Searching a Pokémon's name in any team search should return every team
  containing that Pokémon. Needs scoping first: which search boxes exist
  across app and web, and whether one shared matcher can serve them all.

## Future Milestones (unscheduled)

Password reset flow, deferred out of Web Version: Teams & Box MVP's scoping
(2026-09-29, see `docs/investigations/web-version-scope.md`) - not yet
worth its own leg: needs a transactional email API + SPF/DKIM
deliverability setup on a dedicated vannyproductions.com subdomain.

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

