# ChoiceBuds - Completed Work Log

Archive of finished work, split out of `TODO.md` (2026-07-08) to keep the
active task list quick to scan. Newest entries first. Cross-references to
still-open items point to `TODO.md`; references to other entries here stay
local ("see below"/"see above").

Archived at milestone boundaries as of the 2026-09-08 split (Card UI Polish
- see `MILESTONES.md`), per CLAUDE.md's archiving rules: a shipped milestone
becomes the real cutoff instead of an arbitrary entry count. The first split
(2026-08-31) predates any milestone and used a rolling ~50-entry window
instead - that habit has now stopped in favor of splitting at each new
milestone boundary going forward. Entries prior to this file's oldest are
in:
- [docs/archive/completed-2026-06-17-to-2026-07-09.md](docs/archive/completed-2026-06-17-to-2026-07-09.md)
  (the 50 oldest entries as of the 2026-08-31 split)
- [docs/archive/completed-2026-07-09-to-2026-09-01.md](docs/archive/completed-2026-07-09-to-2026-09-01.md)
  (everything through the Battle Logger Re-eval + Data & Process Cleanup
  milestone, split out at the 2026-09-08 Card UI Polish boundary)

- **[In-App Auto-Update: Windows Not Triggering] - Leg 1** (2026-09-09) -
  Pure investigation, no shipped code change (the diagnostic logging added
  mid-leg was reverted once its job was done - see below). Reproduced live
  with a locally-built, unpublished NSIS installer (temporarily versioned
  below the real latest release so `checkForUpdates()` would see 0.3.0 as
  newer, same as the original report) plus file-based diagnostic logging
  added to `main.ts`'s `registerAutoUpdater()` (`console.log` doesn't
  reliably surface for a packaged Windows GUI-subsystem exe even with
  stdio redirected - confirmed live when a first attempt produced a
  totally empty log file). Two live runs gave different outcomes with
  identical code: one showed the GitHub-API fallback's "View Release"
  link-out (matching the original report), the other showed the native
  "Restart & Update" flow working correctly end-to-end. The diagnostic log
  from the successful run captured the native flow's full timeline
  (`registerAutoUpdater` start to `update-downloaded`/ready-to-install in
  ~1.15s). Root cause: `useUpdateCheck.ts` runs the plain GitHub-API check
  and the native `autoUpdater` IPC status as two independent,
  unsynchronized status sources - the GitHub-API check is a single small
  HTTPS call that often resolves first, and if the user clicks its
  "View Release" button before the native flow's `ready-to-install` status
  arrives, they're sent to the browser instead of getting the working
  in-app install. Not a broken updater - a UI race. Fix scoped separately
  as [In-App Auto-Update: Windows Race Condition] - Leg 2 in `TODO.md`.

- **[EV Grid / Move Bubble Overflow at Extreme Narrow Widths] - Leg 1**
  (2026-09-08) - Resolved during scoping itself, no code change. Live
  `run-desktop` resize pass confirmed the ~550px/~183px-per-card danger
  zone this item was worried about isn't reachable through any real
  window-size/layout combination: at `main.ts`'s enforced `minWidth: 1280`
  floor (sidebar expanded, single team expanded - the same reference
  conditions as the Team Card Grid Layout Re-check fix), `TeamCard.tsx`'s
  own `@container` measured 859px, landing in 3-column mode at ~276px per
  card with no bleed in either the EV stat grid or the move-bubble grid.
  Closing as a confirmed non-issue rather than carrying it forward as an
  open item.

- **[Automate 'Mark as Checked' for Champions Balance/Season Data] - Leg 1**
  (2026-09-08) - Resolved during scoping itself, no code change. Auditing
  `useChampionsDataCheck.ts` and `useSeasonDataCheck.ts` showed both
  checks' staleness signals are already derived entirely from
  locally-hand-maintained config (`config/seasons.ts`'s latest
  regulation/season-end date), not from any live external feed in the
  first place - there's nothing to poll against, unlike `useUpdateCheck.ts`'s
  GitHub-Releases case this item was modeled on. `useSeasonDataCheck.ts`'s
  own header comment already states season/regulation dates can't be
  fetched live under the project's no-scrape policy (CLAUDE.md). Closing:
  the "Mark as Checked" action itself is inherently manual (it represents a
  human having done the Serebii-sourced research), not an automation gap.

- **[Pokémon Card Drag Without Handle] - Leg 1** (2026-09-08) - Replaced the
  dedicated grip-handle icon with `draggable` on the whole `PokemonCard.tsx`
  card div, gated by a target check in `handleDragStart` that bails when the
  drag started on an `input`, `button`, or a new `data-no-drag`-tagged
  element (sprite/swap box, gender/shiny corner badges, `ItemSpriteBox`,
  `AbilityCapsule`). See commit `6ecedd2`.

- **[Card Action Button Placement] - Leg 1** (2026-09-08) - Delete now
  centers on `PokemonCard.tsx`'s top-right corner with a negative offset
  (`-top-2.5 -right-2.5`), extending outside the card's rounded border.
  Export moved out of that corner entirely into a right-click context menu
  on the card, built as a new small reusable `ContextMenu.tsx` (portaled,
  click-coordinate-positioned, viewport-clamped, outside-click/Escape
  dismiss) since nothing like it existed in the codebase yet. See commit
  `b8865f6`.

- **[Card Content Overflow at Mid Widths] - Leg 1** (2026-09-08) - added
  `min-w-0` up `PokemonCard.tsx`'s grid-item/card-shell/type-badge-row chain
  and `StatsColumn.tsx`'s root/header-block chain, plus `flex-wrap` on the
  type-badge row, so both rows shrink/wrap with the card instead of
  spilling past it. Live-verified via a `run-desktop` pass forcing the
  expanded grid's `@container` width down to 300px; surfaced a separate,
  not-yet-scoped overflow in the EV stat grid/move-bubble grid at even
  narrower widths, filed as its own TODO.md item rather than fixed here.
  See commit `bf03624`.

- **[Team Name Field Reg-Prefix Display] - Leg 1** (2026-09-08) - one-time
  migration: `useTeams.ts`'s `normalizeTeam` now strips a stale leading
  `Reg M-A `/`Reg M-B `/`Reg M-C ` from `team.name` at the read boundary,
  same pattern as its per-Pokemon `id` backfill. Nothing in the app re-adds
  the prefix, so it's never written back proactively - a team just drops it
  the next time it's saved through any normal mutation. `TeamCard.tsx`'s
  stale comment about the read-only view's separate prefix-stripped display
  (from before this change) updated to reflect that the input just reads
  `team.name` directly now. See commit `af65402`.

- **[Damage Calc Engine Test Coverage] - Leg 1** (2026-09-08) - added direct
  engine-level tests for `damageCalcEngine.ts`'s remaining pure-logic
  surface (`normalizeMoveSlug`, `getNatureStatEffect`,
  `computeBoostedStats`/`computeEffectiveSpeed`, and `computeSideResults`'s
  normal-move/blocked/multi-hit paths), merged into the file's existing
  Champions ability damage-effect tests rather than replacing them. See
  commit `6d6700d`.

- **[Move-Slot Drag Handle] - Leg 1** (2026-09-08) - re-enabled
  `MoveBubbleGrid.tsx`'s drag-to-reorder machinery by making the drag
  affordance unconditional through the `PokemonCard` -> `EditOverlays` ->
  `MoveBubbleGrid` chain instead of adding new grip-handle UI, and dropped
  the now-dead `isEditing` prop from both components rather than keeping it
  always-true. See commit `d47124e`.

- **[Release Notes Popup] - Leg 2** (2026-09-08) - added a startup "What's
  New" popup plus a full-history section in Settings, both sourced from
  GitHub Release bodies via a new `fetchReleaseHistory()` in
  `services/github.ts` rather than a second hand-maintained changelog. Fresh
  installs mark the current version seen with no popup. New
  `react-markdown`/`remark-gfm` deps render the Release-body markdown. See
  commit `a178503` (Leg 1 scoping: commit `6280abf`,
  [docs/investigations/release-notes-popup-scope.md](docs/investigations/release-notes-popup-scope.md)).

- **[Sprite Corner Badges] - Leg 1** (2026-09-08) - removed
  `PokemonCard.tsx`'s footer gender/shiny row and repositioned both as
  absolute corner badges on the sprite box itself (gender top-left, shiny
  top-right), each a ~22px icon inside a ~34px padded hit zone, transparent
  by default. See commit `4f0b026`.

- **[Always-On Editing] - Leg 2** (2026-09-05) - gave the structural actions
  Leg 1 left without a trigger their own always-visible affordances: a
  dedicated grip-handle button (team header's controls pill, each
  PokemonCard's top-left icon) is now the sole drag source for team-level and
  Pokémon-slot reorder, instead of the whole header/card - the ambiguous
  whole-card-draggable version Leg 1's commit message mentions reverting.
  Delete-slot and the swap-picker click are unconditionally on now; the
  Add-Pokémon dashed-box button is back, gated on roster room (<6) instead of
  edit-mode. Move-slot drag-to-reorder inside `MoveBubbleGrid.tsx` stays
  deliberately unwired - a move bubble is both the click target and the
  would-be drag source, so it needs its own design rather than this leg's
  pattern; logged as a new backlog item (Move-Slot Drag Handle) in
  `TODO.md`. See commit `cb0cc98`.

- **[Always-On Editing] - Leg 1** (2026-09-05) - removed the
  `isEditingTeam`/`isEditing` edit-mode toggle (and TeamCard's Edit button)
  for field-level edits: team name/author/notes and per-Pokemon
  nickname/item/ability/moves/nature/EVs are all permanently interactive now,
  Showdown-style, since every one of them already committed on blur/click
  with no separate save step. Structural actions the same toggle used to
  gate (drag-reorder, delete-slot, swap picker, Add-Pokemon button) are left
  without a trigger pending Leg 2's own affordance rather than made
  always-on. See commit `91235ab`.

- **[Team Header Sprite Strip] - Leg 1** (2026-09-05) - reverted the
  collapsed team card's 3D coverflow mini-sprite row back to a flat,
  non-animated strip and sized its sprites up from 32px to 56px. See
  commit `b29196f`.

- **[Card Popup Consistency] - Leg 3** (2026-09-05) - replaced
  `StatsColumn.tsx`'s native `<select>` nature control (the one popup with
  zero positioning/styling control, and the confirmed worst offender - it
  spilled over the notes textarea and bottom toolbar) with a new
  `NaturePickerPanel.tsx`, floated via Leg 1/2's `FloatingCardPanel`
  primitive, same shape as `AbilityPickerPanel.tsx`. See commit `4135707`.
  Completes this item - all three legs done, nothing left unscheduled for it.

- **[Card Popup Consistency] - Leg 2** (2026-09-05) - migrated
  `ItemPickerPanel.tsx`/`AbilityPickerPanel.tsx`/`EditOverlays.tsx`'s move
  picker off their "fills the slot in place" pattern onto Leg 1's
  card-width-locked float (new `FloatingCardPanel.tsx` +
  `utils/floatingCardPanel.ts`, shared with `Tooltip.tsx`). See commit
  `80b9303`.

- **[Card Popup Consistency] - Leg 1** (2026-09-05) - built the shared
  floating-popup primitive Legs 2/3 migrate onto: `Tooltip.tsx` now locks its
  width to the hovered trigger's closest `[data-pokemon-card]` ancestor
  instead of centering a fixed 256px box on the cursor, so it can no longer
  spill past a card's left/right edge. See commit `f081584`.

- **[Item Picker Sprite-less Item Bug] - Leg 1** (2026-09-05) - the Teambuilder's
  item search was silently dropping any item with no PokeAPI sprite,
  surfaced by testing Reg M-C's new Mega Stones (PokeAPI has pre-release
  entries for them already, but with `sprites.default: null`). `useGameData`'s
  `items` list was built via `getCachedItem`, which deliberately treats a
  spriteUrl-less cache entry as a miss so it keeps retrying against PokeAPI -
  but that meant the placeholder entries the background-load effect
  synthesizes for exactly this case (see that effect's own "still shows up
  and is selectable" comment) were excluded from the list they were meant to
  populate, not just from individual lookups. A prior test
  (`useGameData.test.ts`) had encoded the exclusion as intended behavior;
  git-blame traced the original commit's own message ("so those items remain
  selectable instead of disappearing") to confirm the comment reflected the
  real intent and the code/test didn't. Fixed by reading the raw cache entry
  for the `items` list instead of going through `getCachedItem`. See commit
  `4d0e44a`.

- **[Regulation M-C Prep] - Leg 1** (2026-09-05) - hand-curated Reg M-C's
  roster ahead of its 2026-09-08 release: 4 new species (Rillaboom,
  Baxcalibur, Salamence, Golisopod), 6 new Mega Stones (3 ordinary Megas for
  the first 3, plus a confirmed brand-new second "Mega Z" form for
  Absol/Garchomp/Lucario - Absolite Z/Garchompite Z/Lucarionite Z), and
  widened the app's `RegulationId`/`Team.format`/`AppSettings.
  defaultRegulation` unions (11 call sites) to a 3rd regulation end to end -
  Import modal, Settings/Teams-page pickers, and RegulationBadge already
  looped over `ALL_REGULATION_IDS` so no UI rework was needed beyond that.
  Also corrected `megaEvolution.ts`/`calcFormes.ts`'s prior "spurious
  -Mega-Z duplicate" comments (from the 2026-08-31 Mega Eligibility audit,
  before Reg M-C existed) now that it's real, and fixed a
  `useSpeciesRoster.ts` Mega-form-filter regex that only matched -x/-y
  suffixes. Movepools for the 4 new species aren't hand-curated - PokeAPI's
  existing Gen 9 SV learnset pipeline covers them automatically once legal;
  Legends Z-A-exclusive move/ability accuracy and official-source
  re-verification are deferred to Leg 2 (see TODO.md's Blocked section) once
  Reg M-C actually ships. See commit `6a46613`.

- **[Calc Auto Ability-Effect Application] - Leg 3** (2026-09-05) - added
  `config/championsAbilityDamageEffects.ts` and applied it in
  `damageCalcEngine.ts::computeSideResults` so the calc engine now corrects
  Champions' actual damage math for the two live cases (Unseen Fist's
  25%-through-Protect nerf, Mega Lucario Z's Aura Guard halving contact
  damage taken), not just their display text. Closes out this item - Legs 1
  and 2 (rescoping, crash-on-zero-damage fix) shipped earlier. See commit
  `8f03c83`.
