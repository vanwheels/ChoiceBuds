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

- **[Battle Logger: Selection UI Improvements] - Leg 1** (2026-09-10) - see
  commit `2b97738`. `RecordMatchForm`'s player brought-4 picker only
  signaled selection via a subtle border/background color swap; the
  opponent roster had no brought concept at all. Added
  `Battle.opponentBroughtIds` (optional, mirrors `broughtIds`) plus a
  shared `BroughtToggleTile` component (checkmark badge + dimmed
  unselected tiles) used by both pickers, so the brought 4 read as a group
  at a glance on either side.

- **[Battle Logger: Edit Saved Battle] - Leg 1** (2026-09-10) - see commit
  `8d7707a`. `RecordMatchForm` now doubles as the edit form for an
  already-saved battle (an `editingBattle` prop, wired through a new Edit
  button on `PastBattlesList`'s rows), saving via the existing
  `updateBattle` instead of `addBattle`. Team/date/setId are locked in edit
  mode - `Battle.playerRoster` is a point-in-time snapshot, not a live
  reference, so the stored snapshot is edited as-is rather than re-derived
  from the team's current state.

- **[Battle Logger: Maushold Missing From Opponent Selection] - Leg 1**
  (2026-09-10) - see commit `ca7eeac`. Root cause: PokeAPI has no bare
  "maushold" resource, only maushold-family-of-four/-three varieties, but
  `utils/pokemonRules.ts`'s legality list only had the bare slug -
  `validateSpeciesLegality` rejected both real roster entries, filtering
  Maushold out of `SpeciesPickerCard`'s opponent picker.

- **[Skip Redundant Unchanged-Cache Rewrite On Launch] - Leg 1** (2026-09-10)
  - see commit `89718de`. `useGameData.ts`/`useDatabase.ts`'s debounced
  write-through effect fired on the very first cache value it saw (loaded
  unchanged from disk on mount), queuing one redundant full-cache write per
  launch. `useDebouncedWrite` now takes a disk-snapshot string to compare
  against and skips the write when it matches.

- **[Move Tooltip Position Fix on 2x2 Grid] - Leg 1** (2026-09-10) - see
  commit `3fa6718`. Root cause: `Tooltip`/`floatingCardPanel`'s above/below
  flip is computed per-anchor-rect, so each bubble in the 2x2 move grid
  produced a different tooltip position - row 2's tooltip flipped to sit
  right above it, overlapping row 1. Fix: `MoveBubbleGrid` now anchors the
  shared Tooltip to the whole grid container's rect instead of the
  individual hovered bubble, so it renders fully above or fully below the
  entire grid regardless of which move is hovered.

- **[Team Card Collapse Animation Flicker] - Leg 1** (2026-09-10) - see
  commit `0997d17`. Root cause: `TeamCard.tsx`'s outer `col-span-full` class
  was driven directly off `isExpanded`, so clicking Collapse snapped the
  card's grid column back to single-width the instant the button was
  clicked - before the expanded content's own height/fade exit transition
  had actually played. The still-collapsing content got squeezed into the
  narrower column (re-triggering its own `@container` grid-cols-3/6
  breakpoint mid-animation) while framer's `layout="position"` FLIP-animated
  sibling cards into their post-collapse slots using that already-final
  narrow layout - producing the reported flicker. Fix: a new `isFullWidth`
  state now stays true for the whole exit transition and only clears via
  `AnimatePresence`'s `onExitComplete`, so the grid reflow that moves other
  cards happens after this card is actually done shrinking, not before.
  Expanding is unaffected (`isFullWidth` still flips true immediately on
  expand, same as before).

- **[Debounce Game-Data/PokeAPI Cache Persistence] - Leg 1** (2026-09-10) -
  see commit `73d29b5`. Added a shared `useDebouncedWrite` hook and used it
  as the sole write-through path in both `useGameData.ts` and
  `useDatabase.ts` (unifying the latter's several direct per-call-site
  writes into the same one-effect shape), so a burst of cache mutations
  collapses into a handful of writes instead of one per entry. Known,
  disclosed tradeoff: a quit within the ~500ms debounce window could lose
  the last unwritten mutation - acceptable since these are reconstructable
  API caches, not user data. Surfaced a follow-up (see TODO.md's Skip
  Redundant Unchanged-Cache Rewrite On Launch) rather than folding it into
  this leg.

- **[Investigate App Lag] - Leg 1** (2026-09-10) - Root-caused via static
  analysis + real userData file measurements rather than a live dev-vs-prod
  repro (the mechanism found is identical in both - see the doc for why
  that repro turned out unnecessary): `useGameData.ts`/`useDatabase.ts`
  write their *entire* cache object to disk on every single cache-entry
  mutation, and `useUsageSync.ts` re-syncing the whole roster's usage data
  on every launch is the main burst trigger against an already-2.1MB
  `game-data-cache.json`. Fix scoped as a new TODO item (Debounce Game-
  Data/PokeAPI Cache Persistence). Full analysis:
  `docs/investigations/app-lag-investigation.md`.

- **[Speed Tiers Save Override: Over-Cap SP Warning] - Leg 18** (2026-09-10) -
  see commit `65a7858`. Added `utils/evTotal.ts`'s `getTotalSP`/
  `MAX_TOTAL_SP` and used it to surface a non-blocking `⚠ total/66` badge
  (visually matching `StatsColumn.tsx:121`'s existing pill) wherever a team
  member's real SP total exceeds the cap: a per-sprite badge on `TeamCard
  .tsx`'s collapsed mini sprite strip (so the overage is visible without
  expanding the card at all), and a header-level badge on `PokemonCard.tsx`
  next to the species/pokedex line. Doesn't touch `StatsColumn.tsx` itself -
  that file's own inline total stays as-is, out of this leg's scope.

- **[Speed Tiers Preview Strip: Save Override to Team] - Leg 17** (2026-09-10) -
  see commit `453fa2e`. Added `patchPokemonWithOverride` (Speed SP + nature only,
  species excluded) to `utils/speedTierOverrides.ts`, plus a per-card Save
  button on `TeamPreviewCard.tsx` and a page-level "Save All" on
  `TeamPreviewStrip.tsx`, both wired through new `saveOverride`/
  `saveAllOverrides` actions in `SpeedTiersPage.tsx` that call
  `teamsState.updateTeam` directly (not the `useActiveEditor` overlay flow).
  Buttons are enabled only when the mon has an active entry in the strip's
  override Map; a successful save clears that entry (or, for Save All, every
  saved entry) since it now matches the team's real data. No confirmation
  dialog, matching existing app precedent. See
  [docs/investigations/speed-tiers-save-override-scope.md](docs/investigations/speed-tiers-save-override-scope.md)
  for the scoping session.

- **[Live Calc Turn-Order Speed Stage Boosts] - Leg 16** (2026-09-10) - see
  commit `c441d54`. Turn-order observations gain a per-observation
  `defenderSpeedStage` (-6..+6, default 0), applied directly to each scanned
  SP candidate's raw Speed via `boostMultiplier()` (newly exported from
  `damageCalcEngine.ts`); the attacker side now compares on
  `computeEffectiveSpeed()` (live boosts + status, weather always `''`)
  instead of raw unboosted Speed, reversing Leg 15's "both sides unboosted
  for symmetry" v1 call. New per-row stage input in
  `LiveCalcTurnOrderList.tsx` mirrors `CalcStatRows.tsx`'s existing
  boost-stage input. Defender status/Tailwind/weather-ability Speed changes
  remain a documented out-of-scope gap, not this leg's job.

- **[Speed Tiers Trick Room Sort-Order Bug] - Leg 14** (2026-09-10) - live
  re-check via `run-desktop` (team + species filter "Raichu", toggling Trick
  Room) confirms this doesn't reproduce anymore: normal order is a clean
  descending 200→117 (Mega Raichu-Y's 200 first, as expected) and Trick Room
  is a clean ascending 117→200 with no mirroring - Leg 17's duplicate-Mega
  fix was in fact the same root cause Leg 7 suspected. Screenshots
  `01-raichu-normal.png`/`02-raichu-trickroom.png` in
  `.claude/skills/run-desktop/shots/`. No code changed - verification only,
  nothing to commit.

- **[Speed Tiers Mega Sprite Fallback] - Leg 13** (2026-09-09/10) - Mega-form
  rows across the app (Speed Tiers roster/tier-list, Team Preview Strip,
  Teams overview mini sprite strip) rendered the base species' sprite
  instead of the Mega form's own. Root cause: the id/URL cache
  `getCachedMegaSprite` reads is in-memory only and only ever got populated
  by `useInitialSync`'s first-launch sync pass, which never runs again once
  the roster is fully synced - every later session found it empty. Fixed
  with a new per-session `useMegaSpritePrefetch` hook, then wired into every
  read site that still had base-sprite fallback, including one
  (`speedTierOverrides.ts`) that had left it as a documented, deliberate cut
  from an earlier leg. See commits `9ef4c17`, `78acf45`, `bc572f2`. Fully
  live-verified by Vanny across all three commits.

- **[Speed Tiers "Bounds Only" Toggle] - Leg 12** (2026-09-09) - added the
  checkbox suppressing usage-based spread rows entirely, leaving just each
  threat's 3 fixed min/neutral/max bound rows (plus any Live Calc pins). See
  commit `1e765e0`. Manually live-verified by Vanny.

- **[Speed Tiers "Threats Only" Toggle] - Leg 9** (2026-09-09) - added the
  checkbox and its `slotResistsThreat`-based filter. See commit `72782ce`.
  Manually live-verified by Vanny.

- **[Speed Tiers Usage Threshold Control] - Leg 11** (2026-09-09) - added
  the adjustable Min Spread Usage stepper (10% increments, clamped 5%-95%)
  next to the All/Top 60/Top 120 toggle. See commit `60ef386`. Manually
  live-verified by Vanny.

- **[Speed Tiers Per-Spread Value Placement Bug] - Leg 10** (2026-09-09) -
  live re-check via `run-desktop` found the bug doesn't reproduce: Blastoise
  (3 ranked usage spreads above the cutoff, two sharing SP 32 Speed and one
  at SP 0) rendered all 3 as separate tiles with their own percentage
  labels, correctly split into 2 speed tiers (130/130/98) rather than
  bundled under one; base Raichu's two 32-SP spreads (43%/12%) likewise
  rendered as two distinct 162-Speed tiles instead of collapsing into one.
  Confirms the pipeline was correct all along - `computeThreatSpeedProfile`
  deliberately doesn't apply a per-spread nature (see `speedTiers.ts`'s
  header on why nature isn't crossed with usage spreads at all), so two
  spreads sharing the same Speed SP investment landing on the same Speed
  number is a real tie, not a placement bug. What looked like "bundling" at
  report time was Leg 17's duplicate-Mega-candidate bug, already fixed and
  live-verified there. No code changed - verification only, nothing to
  commit.

- **[Speed Tiers Duplicate Mega Roster Candidates] - Leg 17** (2026-09-09) -
  fixed the duplicate-key bug Leg 7's verification pass found. Root cause
  and fix in commit `19b4fca`. Live-verified via `run-desktop`: tile counts
  for Raichu-Mega-X/-Y and Slowbro-Mega now hold steady at 3 (their bound
  rows only) across repeated roster-scope toggles instead of growing, and
  no duplicate-key console warnings appear. Leg 10's bundling bug and Leg
  14's Trick Room sort-order bug both need a live re-check against this fix
  before any further investigation on either (see their own TODO.md
  entries).

- **[Speed Tiers Verification Pass] - Leg 7** (2026-09-09) - from-scratch
  `run-desktop` pass over the whole Speed Tiers tab now that Legs 2/5/6/8/15
  are all built. Confirmed working: Leg 2's field-modified Speed layer
  actually reaches the UI (toggling "Your Tailwind" on doubled every team
  member's displayed Speed exactly, e.g. Rillaboom 105 → 210, not a raw
  base-stat display); the All/Top 60/Top 120 roster-scope toggle (282/545/
  1324+ tiles respectively); the Trick Room sort-direction flip for every
  entry except the one bug below; and Leg 6's full pin/unpin round-trip
  (pinning Incineroar on Live Calc added two correctly cyan-ringed "Live
  Min"/"Live Max" rows on Speed Tiers, ties rendered with the amber tie
  ring too, and Unpin removed them cleanly - 5 tiles back down to 3). Leg
  5's Team Preview Strip rendered and stayed interactive throughout.
  Surfaced a new, concretely-reproduced bug during this pass - see
  [Speed Tiers Duplicate Mega Roster Candidates] - Leg 17 in `TODO.md`,
  which also ties together the previously-unconfirmed root causes of Leg
  10's bundling bug and Leg 14's Trick Room order bug (the exact species
  Leg 14 named, Mega Raichu, is one of the three Leg 17 found duplicated).
  Screenshots in `.claude/skills/run-desktop/shots/` (01 through 14). No
  code changed - verification only, nothing to commit.

- **[Live Calc → Speed Tiers Tie-in] - Leg 6** (2026-09-09) - wired Live
  Calc's turn-order-narrowed Speed SP range/nature candidates (Leg 15, see
  below) into Speed Tiers as an annotation on the matching threat, resolving
  this leg's own "shared state vs. explicit action" wiring question in favor
  of an explicit "Pin to Speed Tiers" action (`LiveCalcResultPanel.tsx`) -
  a doubles opponent can have several mons needing independently-narrowed
  pins at once, which automatic mirroring of Live Calc's single current
  defender species couldn't support. New `hooks/useLiveCalcThreatPins.ts`
  holds the shared cross-tab pin state at App.tsx level; new
  `speedTiers.ts::computeInferredThreatSpeedBound` turns a pinned SP
  range + nature candidates into a real field-modified min/max Speed bound
  (checking only the two SP endpoints against every candidate nature, same
  monotonicity reasoning the existing min/neutral/max bounds already use).
  A matching roster candidate gets 1-2 extra rows in `speedTierList.ts`
  (collapsing to one once the pin has narrowed to a single value), styled
  with a cyan ring in `SpeedTierList.tsx` to read as real observed data
  rather than a generic bound; a pinned species also bypasses the page's
  usage-rank cutoff so an off-meta pick still shows once pinned. See commit
  `951937c`.

- **[Live Calc Speed Inference Engine] - Leg 15** (2026-09-09) - built the
  missing Speed-inference prerequisite for [Live Calc → Speed Tiers
  Tie-in] - Leg 6 (see `docs/investigations/live-calc-speed-inference-scope.md`
  for the resolved design questions). New `utils/liveCalcSpeedEngine.ts`
  narrows a defender's Speed SP 0-32 range from turn-order observations
  ("did you or the defender act first this turn"), reusing
  `liveCalcEngine.ts`'s per-observation bound-intersection shape and its
  nature-candidate narrowing rather than duplicating it - takes that
  engine's `LiveCalcInference` as input and returns an updated copy with
  `speedBound`/`speedObservationCount` set. Scans only the nature axis for
  Speed (ability/item aren't Speed-relevant in v1, per the scope doc);
  compares both sides' unboosted base Speed (no stage boosts/status/weather
  for either side, not just the defender) for symmetry, since the feature's
  neutral-field v1 scope already excluded those; a priority attacker move
  is skipped/flagged since it decides order regardless of Speed; a tied
  computed Speed counts as consistent with either observed order rather
  than eliminating that SP (real Speed ties are a coin flip). New
  `LiveCalcTurnOrderList.tsx` UI list alongside the existing damage%
  observation list; `LiveCalcResultPanel.tsx` gained a third SP bound bar
  for Speed. See commit `5998916`.

- **[Speed Tiers Full-Regulation Roster Rework] - Leg 8** (2026-09-09) -
  Reversed Leg 3/4's team-anchored threat list (Team Gap Analysis's
  `computeUsageThreats`, typing-filtered) in favor of plotting every species
  legal in the selected team's own regulation
  (`validateSpeciesLegality`/`toRegulationId`, same mechanism
  `useInitialSync`/`SpeciesPickerCard` already use) - theoretical "still
  standing" information isn't the right default for teambuilding, where a
  specific team member needs to answer a specific matchup's speed, not the
  team's overall weaknesses. Champions ranked-ladder usage
  (`ChampionsUsageEntry.columnPosition`) now folds in only as an optional
  page-level All/Top 60/Top 120 toggle (default All), not the defining data
  source. Also root-caused and fixed the "vertical mess" layout complaint
  (raised twice) as a side effect: Leg 4's icon grid never had enough real
  Speed ties to render meaningfully against a small team-anchored threat
  list, but a full regulation roster's shared base-Speed bound values tie
  naturally, matching vgcmulticalc's own clustering. `computeThreatSpeedProfile`
  decoupled from requiring a real `ChampionsUsageEntry` (new `ThreatSpeedInput`)
  so species with no usage data still get bound-only entries, falling back to
  their own default ability (`PokeAPICacheEntry.abilities[0]`, converted via
  `toReadableName`) when no usage-ranked ability exists. Full design in
  [docs/investigations/speed-tiers-full-roster-pivot.md](docs/investigations/speed-tiers-full-roster-pivot.md).
  See commit `59d61b9`.
  **Follow-up (same day, live-tested):** found still broken - only ~5
  species rendered under "All," no Mega forms, still visually sparse. Root
  causes and fixes, all in the same investigation doc's follow-up section:
  (1) a real, confirmed data-integrity bug in `useInitialSync.ts` predating
  this leg - a bulk sync burst against PokeAPI silently dropped ~90% of the
  legal roster's `PokeAPICacheEntry` writes while still marking every
  species "synced," so they were never retried; `unsyncedSpecies` is now
  self-healing (unions in any flagged-synced species with no real
  `getCachedEntry` hit), fixing this and any future recurrence automatically
  on next launch; (2) Mega forms were never reachable through the
  roster/usage pipeline at all (deliberately excluded from
  `useSpeciesRoster`/`validateSpeciesLegality` - item-driven, not a roster
  pick) despite changing base stats/ability - added as extra
  `rosterCandidate`s per species' Champions-legal Mega forms
  (`calcFormes.ts::getFormeFamily`'s `megaFormes`), resolved via
  `getMegaAbility` and a new `useMegaSprite.ts::getCachedMegaSprite`
  synchronous reader; (3) `SpeedTierList.tsx` reworked from one full-width
  block per speed value into a single continuous `flex-wrap` of every entry
  (each tile now carries its own speed number, a tied entry gets a subtle
  ring instead of a separate header/label), so a group's size no longer
  costs a fixed row height regardless of how many entries it holds.
  See commit `ea92727`.

- **[Speed Tiers Team Preview Strip] - Leg 5** (2026-09-09) - A strip below
  the team selector, one card per team member: a session-only Speed-SP +/-
  editor (same hold-to-repeat interaction as Team Builder's EV cells,
  `EVStatCell.tsx`, scoped to just Speed), a nature selector, and a form/
  Mega toggle (reuses `utils/calcFormes.ts`'s forme-family detection, same
  as the Calc tab's own toggle) - all merged into `computeTeamSpeed`'s input
  at read time via the new `utils/speedTierOverrides.ts`, none writing back
  to the team's saved data. A Mega forme toggle also swaps in that forme's
  fixed ability (several Champions Mega abilities are weather/terrain
  speed-doublers, so this is load-bearing for the numbers plotted). Sprite
  is deliberately left unswapped on a form toggle - documented scope cut,
  see `speedTierOverrides.ts`'s header. Full design in
  [docs/investigations/speed-tiers-preview-strip-scope.md](docs/investigations/speed-tiers-preview-strip-scope.md).
  See commit `5b038aa`.

- **[Speed Tiers Layout Rework] - Leg 4** (2026-09-09) - Reworked Leg 3's
  row-list render into an icon grid grouped by speed value (`groupSpeedTiers`
  itself unchanged - only the render shape and what feeds it). Dropped the
  nature/item "modifier note" approach entirely rather than relocating it:
  nature became 3 fixed min/neutral/max speed bounds per threat
  (`speedTiers.ts::computeThreatSpeedProfile`'s `bounds`, independent of any
  ranked spread's own points), and the per-species item-modifier-note scan
  became a global, page-level Choice Scarf/Iron Ball toggle
  (`SpeedFieldContext.threatItem`) in the same Tailwind-toggle shape already
  used for weather/terrain - threats' side only, since a team-side
  equivalent would be hypothetical speed adjustment for your own team
  (explicitly deferred). Added a usage-% floor
  (`speedTierList.ts::SPREAD_USAGE_CUTOFF_PERCENT`, currently 10) so only a
  threat's real ranked spreads with meaningful usage get plotted, and a
  species search filter (`filterSpeedTierEntries`) over the built entry list.
  Full design in
  [docs/investigations/speed-tiers-layout-rework.md](docs/investigations/speed-tiers-layout-rework.md).
  See commit `0857937`.

- **[Speed Tiers View Shell] - Leg 3** (2026-09-09) - New top-level "Speed
  Tiers" tab (nav-placement question resolved live via AskUserQuestion,
  rather than guessed - own tab, not nested in Type Matchup or a team page).
  Renders a selected team's members' real field-modified Speed
  (`utils/speedTiers.ts::computeTeamSpeed`, Leg 2) merged into one sorted,
  tie-grouped list against Team Gap Analysis's own ranked usage-threat list
  (`utils/usageThreats.ts::computeUsageThreats`) - each threat contributes
  one row per `ChampionsUsageEntry` stat spread (not just its top-ranked
  build), with nature/item modifier notes attached to the top-ranked
  spread's row only. The merge/sort/tie-group logic is its own pure,
  unit-tested layer (`utils/speedTierList.ts`) separate from
  `speedTiers.ts` itself, matching that file's own note that sort direction
  is "whatever consumes its output"'s concern - Trick Room is a plain
  boolean flip on that sort, not a field the data layer touches. See commit
  `f733635`.

- **[Speed Tiers Data Layer] - Leg 2** (2026-09-09) - Pure functions
  (`utils/speedTiers.ts`) computing a roster Pokemon's or usage threat's
  real, field-modified effective Speed. Settled two things the scope doc
  had punted: field-effect handling reuses `@smogon/calc`'s own internal
  `getFinalSpeed()` (its public API doesn't expose the real Tailwind/Choice
  Scarf/weather-ability/paralysis chain) instead of hand-rolling a second,
  subtly-different one, and Trick Room turned out to need no representation
  here at all (it never changes a raw speed number, only turn order - a
  Leg 3 sort-direction concern). Also resolved a modeling question the
  scope doc hadn't reached: `ChampionsUsageEntry`'s stat spreads are a
  genuine joint 6-stat distribution, but nature/item/ability are separate
  marginal rankings with no joint data - so spreads stay an honest
  distribution and nature/item surface only as diff-based "modifier notes"
  (table-free: build with/without the modifier and compare) rather than
  fabricating combinatorial joint percentages. See commit `3eb040e`.

- **[Speed Calc-like Feature: Scoping] - Leg 1** (2026-09-09) - Design-
  questions pass resolving how ChoiceBuds' version differs from
  vgcmulticalc's Speed Calc rather than reskinning it: team-anchored (Team
  Gap Analysis's own threat list, not a free-text search box) +
  Champions-native usage data (`ChampionsUsageEntry.statSpreads`, not
  Showdown's Bo3 ladder) + a Live Calc tie-in (inferred SP-Speed ranges
  overriding a threat's generic usage-based entry). Resolved via
  `AskUserQuestion` after researching vgcmulticalc's actual feature set
  first. Full writeup in
  [docs/investigations/speed-calc-scope.md](docs/investigations/speed-calc-scope.md);
  tentative Leg 2-5 breakdown now sitting in `TODO.md`'s Current Milestone
  section.

- **[Champions M-C Balance Patch Corrections] - Leg 1** (2026-09-09) - 5
  balance-patch facts provided directly by the user, applied where PokeAPI
  structurally can't reflect them yet. Added a new unconditional
  `applyChampionsPatchRemovals` mechanism to `championsMovepoolChanges.ts`
  (Archaludon lost Mirror Coat/Metal Burst) - distinct from the existing
  `hasChampionsMoveData`-gated additions/removals table, since a dated
  patch fact is never superseded by PokeAPI's champions-tag data the way a
  stale community-spreadsheet entry is; wired into `useGameData.ts` ahead
  of that gate. Added Golisopod's `u-turn`/`gunk-shot`/`night-slash`/
  `superpower` to the existing gated `CHAMPIONS_MOVEPOOL_ADDITIONS` table -
  confirmed live these 4 are absent from Golisopod's PokeAPI all-time
  movepool entirely (likely Legends Z-A-exclusive), resolving Golisopod's
  share of the "Reg M-C Z-A-Exclusive Movepool Audit" TODO item
  (Rillaboom/Baxcalibur/Salamence remain open there). Added `double-shock`
  → `punch` to `moveFlags.ts`'s `CHAMPIONS_ADDED_FLAGS` (Iron Fist now
  affects Pawmot's signature move). Added `strength-sap`/`wish` to
  `championsMoveOverrides.ts`'s `CHAMPIONS_PP_EXCEPTIONS` (both now 8 PP;
  confirmed live their raw PokeAPI base PP of 10 would otherwise formula-
  compute to 12). Snipe Shot's reported 85 BP needed no change - already
  correct in `CHAMPIONS_MOVE_OVERRIDES`. See commit `4cf29e8`.

- **[Regulation M-C Prep] - Leg 2** (2026-09-08 to 2026-09-09) - piecemeal
  post-release verification of Leg 1's hand-curated Reg M-C data against
  official sources (Serebii's Champions Pokedex/movepool/item/mega-ability
  pages, Bulbapedia's season list), fed in by Vanny across 3 source-text
  dumps transcribed verbatim into
  `docs/investigations/regulation-mc-source-text.md`. Confirmed
  Baxcalibur/Golisopod/Salamence's ordinary-Mega abilities (fixing
  Golisopod's, which `@smogon/calc`'s pre-release data had wrong - its own
  ordinary ability leaking in as stale placeholder data); added Pawmot and
  expanded `REG_MC_ADDED_SPECIES` from 5 pre-release entries to the full
  26-slug confirmed roster, finding and fixing a real bug along the way
  (Indeedee missing from `GENDER_DIVERGENT_BASE_SPECIES`, which would've
  silently failed legality for a bare "Indeedee"/"Indeedee-F" import);
  verified all 6 Mega Stones and added the 12 new hold items to
  `VGC_HOLD_ITEMS`; verified Group 3's 5 Mega-ability entries in
  `megaAbilities.ts` exact-match against Serebii's dedicated page; corrected
  `seasons.ts`'s M-5 end date and added Season M-6 once each was actually
  published. A full audit pass through dump 2/3's wording changes (powder-
  move/Thunder Wave type-immunity clauses, Thunder/Hurricane's weather-
  accuracy wording, Substitute's sound-move clause, newly-relevant
  abilities from the new-species roster) found nothing needing a code
  change - all either pre-existing mainline mechanics, already modeled
  correctly, or outside this app's tracked scope. Found and fixed one real
  bug in that pass: Rillaboom/Cinderace/Pincurchin's signature moves (Drum
  Beating/Pyro Ball/Zing Zap) were being silently stripped by
  `GLOBALLY_REMOVED_MOVES` because PokeAPI has no "champions"-tagged move
  data for those 3 species yet (same failure shape as the already-fixed
  Baxcalibur/Glaive Rush case) - added matching
  `CHAMPIONS_MOVEPOOL_ADDITIONS` entries and tests. Closes out the
  "Regulation M-C Prep" milestone - see `MILESTONES.md` and
  `docs/postmortems/regulation-mc-prep.md`. One thread deliberately left
  unresolved rather than force-closed: whether the 4 new-Mega species
  gained any Legends Z-A-exclusive moves needs a live-PokeAPI audit
  methodology, not a Serebii read - moved to its own TODO.md item
  (`[Reg M-C Z-A-Exclusive Movepool Audit]`) rather than kept open here.
  `seasons.ts` M-7+ rows remain unaddable until Bulbapedia/Serebii publish
  them, and per Vanny that can simply be picked up whenever a future dump
  lands rather than tracked as an open item now. Commits `6724a99`,
  `a80dc85`, `ee5b8fe`, `290b11a`, `8a4a7a7`, `a5985e0`, `b7be888`,
  `29b9edf`, `86d1fc0`.

- **[Live Calc Verification Pass] - Leg 4** (2026-09-08) - Live `run-desktop`
  pass against the real UI (Legs 1-3), not just the pure-engine unit tests.
  Confirmed live: multi-observation narrowing shrinks/holds bounds sensibly
  (two Earthquake reads narrowed Defense SP from the full 0-32 down to
  9-32 and nature candidates from 25 to 21), zero/one-observation states
  render their own correct copy ("Add an observation..."), a Status move
  and a damage% genuinely outside the feasible range both degrade to a
  visible contradiction note with no crash and no state corruption, and a
  physical observation never moves the Sp. Def bound (or vice versa).
  Removing a contradicted observation correctly re-derives the result from
  scratch (its note disappears, the bound doesn't drift) - confirms
  `inference` is a pure recompute off current `observations`, not an
  accumulating log. No product bug found; no code changed this leg. Two
  real false leads worth recording: (1) typing a species name via a
  synthetic DOM `input` event without real key events looked like a broken
  dropdown at first - it wasn't, `CalcAutocomplete`'s dropdown just needs a
  render tick real `page.keyboard.type()` gives for free; (2) Ferrothorn/
  Landorus-Therian returning zero species-search results looked like a
  Reg M-C legality regression - Pokémon Champions models a positive
  species allowlist that simply hasn't added either mon yet (see
  `utils/pokemonRules.ts`'s header), reproduced identically under Reg M-B,
  so it's not regulation-specific and not a bug. Switched the live test to
  Garchomp/Snorlax (both allowlisted) and computed real feasible damage%
  windows via a throwaway `@smogon/calc` script first, since
  `CalcPokemonPanel`'s species-select auto-fills a real Champions
  ranked-ladder set (Life Orb/Rough Skin/Jolly/full Atk+Spe SPs here) -
  guessed round-number damage% values against that real set are why the
  first attempt's every observation looked like a contradiction. This
  closes the "Live Calc: Damage-Based Stat Inference Tab" milestone - see
  `MILESTONES.md` and `docs/postmortems/live-calc-stat-inference.md`.

- **[Live Calc Results Display] - Leg 3** (2026-09-08) - Replaced Leg 2's raw
  plumbing-confirmation preview with the real result surface: new
  `LiveCalcResultPanel` (a 0-32 SP range bar per defensive stat, each also
  showing its own physical/special observation count) and `LiveCalcCandidateGroup`
  (a shared narrowed-candidates chip list + fraction bar, reused for nature/
  ability/item). `liveCalcEngine.ts`'s `defaultInference()` was exported so
  the panel can compute each candidate group's own "possible" denominator
  (species' full ability pool, full nature list, full curated item list)
  rather than just showing the post-narrowing list on its own; `useLiveCalc`
  now also exposes `gen` for that. Deliberately doesn't compute one blended
  confidence score across nature/ability/item/both SP stats - the axes
  narrow independently per the engine's own documented per-variable-heuristic
  approximation (see `liveCalcEngine.ts`'s header), so a single number would
  imply a joint precision the engine doesn't have; each axis's own fraction
  bar is the "certainty indication" instead. No new tests - this leg is pure
  presentational UI, matching the project's existing test-coverage scope
  (services/utils/hooks only, no component-level tests anywhere in the
  codebase). Full suite (593 tests), lint, type-check, and build all green.
  See commit `d4a60a6` for the full diff.

- **[Live Calc Tab Shell] - Leg 2** (2026-09-08) - New `useLiveCalc` hook
  (transient, non-persisted state mirroring `useDamageCalc`'s pattern) plus a
  new "Live Calc" tab wired into `App.tsx`/`Sidebar.tsx` navigation
  (lazy-loaded, same as the existing Calc tab). Attacker entry literally
  reuses `CalcPokemonPanel` (fully known set - species/item/ability/nature/
  SPs); the attacker's own `CalcPokemonState.moves` slots stay unused since
  `buildPokemon()` never reads them - each observation instead carries its
  own move name, autocompleted against the attacker's real learned moveset
  (same `getEnrichedSpeciesOptions`-backed filtering `useDamageCalc` already
  does for its own move grids). New `LiveCalcDefenderPanel`
  (species+level only) and `LiveCalcObservationList` (add/remove rows: move
  + damage% + 1-or-2-targets-hit) components under a new `components/
  livecalc/` folder. Confirmed state flows end-to-end into Leg 1's
  `inferDefenderStats()` via a raw/unstyled inference preview block, flagged
  in-file as Leg 3's to replace - no results polish this leg, per scope.
  11 new hook tests (`useLiveCalc.test.ts`) covering state wiring and one
  real end-to-end narrowing case; full suite (593 tests) and build both
  green. See commit `8e68481` for the full diff.

- **[Live Calc Engine] - Leg 1** (2026-09-08) - New `utils/liveCalcEngine.ts`:
  pure, React-free heuristic inference engine narrowing a defender's unknown
  nature/SP-spread/ability/item from observed damage-percent readings against
  a fully-known attacker, no UI wiring yet. Settled the scope doc's open
  design questions while building: HP SPs held at a documented midpoint
  default (16) rather than solved jointly with the defensive stat; Doubles'
  automatic 0.75x spread-move reduction cancelled via a Singles-field scan
  when an observation's `targetsHit` is 1, instead of reimplementing the
  modifier by hand; each unknown axis narrowed independently per observation
  (not a joint brute-force) by scanning SP 0-32 per candidate with the other
  axes held neutral. New `config/liveCalcDefensiveItems.ts` curates the item
  candidate pool - turned out to be exactly the 18 type-resist berries
  already in `vgcData.ts`'s `VGC_BERRIES`, since Champions has no Assault
  Vest/Eviolite/Safety Goggles at all. Unit-tested (12 cases, structural
  assertions rather than hardcoded SP numbers to avoid brittleness to
  `@smogon/calc` data updates). See commit `efc23cd` for the full reasoning
  (docs/scoping in `4bd6dc0`).

- **[Team Gap Analysis: Speed Annotation] - Leg 1** (2026-09-08) - Every
  `UsageThreatsList` row (all three sections) now shows the threat's raw
  base Speed stat next to the team's own base-Speed range (min-max across
  all slots), e.g. "Spe 100 vs 60-130" - informational only, doesn't affect
  any section's threat/no-answer membership. Resolved the display-shape
  decision the item was left with: base-stat-only comparison on both sides,
  and a min-max team range rather than a single slowest/fastest slot. See
  commit `aa4a7d3` for the full reasoning (why `statSpreads` wasn't used).

- **[Team Gap Analysis: Moveset+Threat-Ability-Aware Coverage] - Leg 1**
  (2026-09-08) - New "Likely Coverage Gaps" third section on
  `UsageThreatsList.tsx`/`TypeMatchupPage.tsx`, additive alongside (not
  deduped against) the existing two typing-only sections - a threat can
  legitimately appear in more than one. See `utils/usageCoverageGaps.ts`
  (`computeMovesetCoverageGaps`, `COVERAGE_GAP_MOVE_CUTOFF = 2` - same
  hand-picked/unmeasured/tunable status as `USAGE_THREAT_RANK_CUTOFF`) for
  the computation: each usage-eligible threat's top-N ranked moves
  (`ChampionsUsageEntry.moves`, base type resolved via already-cached
  `GameDataCache.moves` - no new fetching) get their effective type resolved
  through the threat's own top-ranked ability
  (`config/typeChangingAbilities.ts`, the same table
  `hooks/useTeamMoveTypes.ts` already uses for the player's own team), then
  checked against team resistance via `usageThreats.ts`'s
  `slotResistsThreat` (exported for this reuse). Full test coverage in
  `usageCoverageGaps.test.ts`, including a case demonstrating the gap this
  section exists to catch: a species whose raw typing reads as fully
  resisted/immune but whose actual top move's effective type is not. See
  commit `fd9a29a`.

- **[Team Gap Analysis: Ability/Moveset/Speed-Aware Redesign] - Leg 1**
  (2026-09-08) - Scoping-only, no code change. Resolved the three open
  design questions the item was left with: moveset-derived coverage
  supplements (not replaces) the existing typing-only list as a new,
  separately-labeled section; the threshold is top-N ranked moves (not a %
  cutoff) per species from `ChampionsUsageEntry.moves`; a threat's own
  commonly-used ability is applied symmetrically via
  `config/typeChangingAbilities.ts` (the same table the player's own
  offensive coverage already uses) rather than deferred to a later leg;
  speed stays purely informational (a raw base-Speed annotation) and never
  gates the "no answer" verdict, given how contextual real speed control
  (Tailwind/Trick Room/Scarf/paralysis) is. Split into two follow-up legs
  rather than one (see `TODO.md`): Moveset+Threat-Ability-Aware Coverage
  bundles the two together since computing a threat's likely-move effective
  type requires knowing its likely ability first; Speed Annotation is a
  separate, smaller slice.

- **[Team Gap Analysis: Re-confirm Typing-Only Scope] - Leg 1** (2026-09-08) -
  Scoping-only, no code change. Verdict: no, typing-only is no longer the
  right boundary - per Vanny, ability/moveset/defensive-coverage/speed
  should factor into gap analysis going forward. Superseded by a new,
  separately-scoped leg (see `TODO.md`) rather than reopened as-is, since
  the actual redesign (how moveset-derived "likely coverage" differs from
  today's typing-fact-only list, how speed factors in) is real design work
  this quick re-confirm wasn't scoped to do. A related but distinct idea
  surfaced in the same conversation - a comparative Speed Calc-like feature,
  intentionally differentiated from vgcmulticalc's own Speed Calc rather
  than a clone of it - was split out to its own Future Milestones entry
  instead of folded into gap analysis; it isn't gap-analysis scope at all.

- **[Move-Blocking Abilities: Consolidate Type-Immunity List] - Leg 1**
  (2026-09-08) - See commit `4d30fc7`. `config/moveBlockingAbilities.ts`'s
  'type' BlockRules are now built from `config/typeImmunityAbilities.ts`'s
  shared table instead of a second hand-typed copy, picking up Earth Eater
  and Well-Baked Body it was missing. Also extended
  `scripts/auditConfigTables.ts` to check `typeImmunityAbilities.ts`'s own
  keys directly, since the spread-in entries are invisible to the audit
  script's existing property-assignment parsing.

- **[Team Gap Analysis: Partial/Scored Gaps] - Leg 1** (2026-09-08) - See
  commit `8fd76cb`. Design check-in at leg start (resist-count threshold,
  separate section) resolved before any code changed - see the commit body
  for the resulting shape. `computePartiallyCoveredUsageThreats` now
  surfaces usage threats resisted/immune-to by exactly one team slot in a
  new "Partially Covered" section on `UsageThreatsList.tsx`, distinct from
  the existing fully-unanswered list and from threats 2+ slots cover
  (still excluded from both).

- **[Team Gap Analysis: Defensive Ability-Awareness] - Leg 1** (2026-09-08) -
  See commit `a771f2e`. `computeUsageThreats`/`computeDefensiveCoverage` now
  check a team slot's equipped ability (new `config/typeImmunityAbilities.ts`)
  for a full-immunity override before falling back to raw typing - a
  Levitate/Water Absorb/Flash Fire/etc. teammate no longer counts as merely
  "hit neutrally" by a threat it actually no-sells. Kept
  `config/moveBlockingAbilities.ts`'s own copy of this same ability list
  (Battle Logger, archived) separate rather than merging - flagged as a
  follow-up in `TODO.md`, since consolidated by the Move-Blocking-
  Abilities item below.

- **[Team Gap Analysis Re-evaluation] - Leg 1** (2026-09-08) - Scoping-only,
  no code change. Reviewed the 5 candidate improvements logged in `TODO.md`
  against the current implementation and closed out two of them outright:
  candidate 4 (scope the ranked-usage list to a team's own regulation) is
  infeasible with the current data source - `services/championsBattleData.ts`
  hits `/api/battle/Doubles/:battleName` with no regulation/format/season
  param, and its own header notes there's no queryable per-season archive at
  all, so there's no lever to scope by regulation until championsbattledata.com
  exposes one. Candidate 3 (`USAGE_THREAT_RANK_CUTOFF = 50` tuning) isn't a
  code task yet either - it's an observation task blocked on real ladder-usage
  volume being visible live, which hasn't happened. Per Vanny, candidates 1
  (defensive ability-awareness) and 2 (partial/scored gap concept) are
  prioritized into their own concrete legs (see `TODO.md`); candidate 5
  (re-confirm the typing-only scope boundary) stays unscheduled, not dropped.

- **[In-App Auto-Update: Windows Not Triggering] - Leg 1** (2026-09-08) -
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

- **[In-App Auto-Update: Windows Race Condition] - Leg 3** (2026-09-08) -
  Implementation of Leg 2's design (see below), plus a real bug the
  live-verify step itself caught mid-leg. `main.ts`: widened `sendStatus`'s
  payload union with `'checking-native'`/`'not-available'`/`'error'`, sent
  the first right before `checkForUpdates()` and the latter two from the
  existing `update-not-available`/`error` handlers (alongside their
  existing console output). `useUpdateCheck.ts` added a `nativeCheckPending`
  boolean off those signals; `UpdateCheckSection.tsx` hides "View Release"
  and shows "Update available: {version} - checking for in-app
  installer..." while it's true. Live-verified with the same locally-built,
  temporarily-downversioned NSIS installer technique as Leg 1's
  investigation (0.2.9 install vs. the real 0.3.0 GitHub release, installed
  via its silent one-click NSIS installer, driven with a one-off Playwright
  script pointed at the *installed* exe directly rather than dev mode - see
  `.claude/skills/run-desktop/SKILL.md`'s note on why packaged/production
  behavior can only be exercised that way).
  First live pass (fast happy path, no artificial delay) showed the native
  flow resolving in well under 300ms with zero errors - correct, but too
  fast to ever exercise the actual gating logic. Second pass added a
  temporary 5s `setTimeout` around `checkForUpdates()` to force the
  GitHub-API check to win the race deterministically, and caught a real bug
  the unit tests couldn't: `sendStatus({ state: 'checking-native' })` fires
  essentially at window-creation time, before the renderer's own JS has
  even loaded, let alone before `useUpdateCheck.ts`'s effect has subscribed
  - `webContents.send()` has no queue for a not-yet-attached listener, so
  that signal was silently dropped on every run, `nativeCheckPending` never
  actually went `true`, and the UI reproduced the exact original bug
  (`"View Release"` showing unguarded). Root cause was the same shape as
  the bug being fixed - an IPC ordering race - just one layer lower.
  Fixed with a pull-then-subscribe pattern instead of a timing heuristic:
  `main.ts` now keeps `latestUpdateStatus` and exposes it via a
  `update:getStatus` handler registered unconditionally (module scope, not
  gated behind the Windows/packaged check, since the renderer calls it on
  every mount regardless of platform); `useUpdateCheck.ts` subscribes to
  future pushes first, then pulls the current status and applies it only if
  a live push hasn't already superseded it (a `livePushSeen` flag - status
  transitions are one-directional, so a stale pull can only ever be behind
  a push that beat it, never ahead). Re-verified live with the same forced-
  delay build: the gated message now renders correctly and resolves to
  "ready to install" once the delayed check completes, with the earlier
  fast-path re-confirmed clean afterward. Added 4 new hook tests covering
  `nativeCheckPending`'s full state matrix plus the pull/push ordering
  guard specifically (14 total, up from 10). Test builds/installs were
  disposable (temp version bump reverted, installer uninstalled, `release`/
  `dist`/`dist-electron` deleted, scratch script removed) - no residue
  beyond a window-state.json position reset on this dev machine (shared
  `userData` dir with the app under test), noted rather than silently left.

- **[In-App Auto-Update: Windows Race Condition] - Leg 2** (2026-09-08) -
  Design pass only, no code change (per this item's own note that Leg 2
  needed a design decision before implementation, kept as its own leg per
  the scoping/building split). Root cause under this race: `main.ts`'s
  `registerAutoUpdater()` sends IPC status on `update-available`/
  `download-progress`/`update-downloaded`, but its `update-not-available`
  and `error` handlers only `console.log`/`console.error` - the renderer
  currently has no signal at all for "the native check finished and found
  nothing" or "the native check failed," so it can't distinguish "native
  check still running" from "native check will never report anything for
  this launch." That gap is why the GitHub-API check's `update-available` +
  "View Release" button has no way to defer to the native flow's outcome.
  Resolved design (confirmed with Vanny via `AskUserQuestion`, over the
  alternative of a fixed ~2-3s delay): explicit signal-based gating rather
  than a guessed timeout, since it resolves on the real event instead of a
  duration estimate that can't be tuned safely for both slow and fast
  networks. Concrete plan for the implementation leg:
  - `main.ts`: widen the `sendStatus` payload's `state` union to add
    `'checking-native'`, `'not-available'`, `'error'`. Send
    `'checking-native'` immediately before the existing
    `autoUpdater.checkForUpdates()` call (this only runs when
    `registerAutoUpdater` reaches that point at all, i.e. Windows packaged
    builds only - the existing early-return guard is unchanged). Add
    `sendStatus({ state: 'not-available' })` inside the existing
    `update-not-available` handler and `sendStatus({ state: 'error' })`
    inside the existing `error` handler, alongside their current
    `console.log`/`console.error` calls (keep both - the console output
    stays useful for diagnostics independent of this UI-facing signal).
  - `useUpdateCheck.ts`: add a `nativeCheckPending` boolean to
    `UseUpdateCheckReturn`, `false` initially. In the existing
    `onUpdateStatus` subscription: `'checking-native'` sets it `true`;
    `'downloading'`/`'ready-to-install'` (already-handled cases) and the
    new `'not-available'`/`'error'` cases all set it back to `false` (the
    first two also still drive `status` as today; the latter two only
    clear the pending flag and otherwise leave `status` exactly as the
    GitHub-API check already resolved it - matching the existing "GitHub
    check remains the fallback for every case the native path doesn't
    cover" framing in this file's own header comment). Non-Windows-
    packaged builds never receive `'checking-native'` at all, so
    `nativeCheckPending` simply stays `false` for them forever - zero
    behavior change there.
  - `UpdateCheckSection.tsx`: when `status === 'update-available' &&
    nativeCheckPending`, render "Update available: {latestVersion} -
    checking for in-app installer..." with no button, instead of today's
    always-shown "View Release" button. Once `nativeCheckPending` clears
    (native resolved either way), fall through to the existing
    `update-available` branch (button enabled) if native came back
    `not-available`/`error`, or to the existing `downloading`/
    `ready-to-install` branches if native found a real update - both paths
    already exist unchanged in this file today.
  - Also worth a quick look during implementation: whether
    `registerAutoUpdater`'s `checkForUpdates().catch(...)` failure path
    should also emit `'error'` (it currently only logs), since that's a
    second way the native check can end without ever firing the
    `autoUpdater.on('error', ...)` listener.
  Next leg (implementation) tracked as [In-App Auto-Update: Windows Race
  Condition] - Leg 3 in `TODO.md`.

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
