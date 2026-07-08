# ChoiceBuds TODO

Working task list for ongoing/planned work. Keep entries short; put rationale
in a `Why:` line only when it's not obvious from the task itself.

## In progress / up next

- **RoiDadadou spreadsheet - reliability is mixed, tab by tab**: got direct
  sheet access via its CSV export endpoint (19 tabs total). Two tabs
  processed and trusted (`Pokémon Ch.` - see Done below); one tab actively
  distrusted and dropped (`Moves Deleted` - conflated roster gaps with real
  move deletions, flagged real moves like Rage Fist/Make It Rain as "not in
  Champions"); one tab fetched but superseded by a better one
  (`Learnset` - a raw per-species dump, not a diff; `Pokémon Ch.` has the
  same info pre-diffed against SV/historical movepools, so `Learnset` isn't
  needed). The user's own read on the source overall: "the more we look at
  this spreadsheet the less reliable I am finding it" - so still worth
  spot-checking any single entry against Serebii/Bulbapedia/in-game play
  if something looks off, rather than trusting it blindly just because one
  tab (`Pokémon Ch.`) held up well. Untouched tabs if ever needed: `Items`,
  `Ability Ch.`, `Mégas`, `New Moves`, `New Abilities`, `Tierlist`, `Dex
  Entries`, `Update Status`.

- **Battle Logger - beyond the core MVP**: field/side-condition tracking,
  battlefield redesign Stage 1, Stage 2's interactive click-to-log flow,
  the layout/drag-to-field/stat-stage-tracking follow-up, the mega/
  reactive-ability/more-switch-in-abilities/field-effects-relocation pass,
  the turn-action-economy/persistent-slots/move-autofill/auto-field-
  effects pass, and the type-effectiveness/opponent-pickers/screen-
  duration/mega-ability/auto-scroll/faint-relocation/stat-changing-moves
  pass are all done (see Done below). **Next up**: status-condition
  tracking + move-outcome chips (full paralysis, didn't wake up, flinch,
  hit-by-a-status-move, crit/miss) - explicitly scoped as its own
  follow-up plan since it needs a new status-condition data model
  (nothing tracks paralysis/sleep/etc. yet) plus fetching PokeAPI's move
  `meta` data (flinch_chance/ailment_chance) that nothing reads today.
  Crit/miss specifically flagged by the user as "something to keep an eye
  on" rather than a concrete ask yet - folds into this same follow-up.
  Also still open: Bo3 "set" grouping across games, post-battle
  damage-calc review (step through a logged battle's turns against the
  Calc), and the stat-inference idea (needs Limitless/championsbattledata-
  sourced per-species data first). Also noted but not built: synthesizing
  turn-log entries when a field condition changes (the countdown display
  already shows remaining turns implicitly, so this is a nice-to-have);
  generic lightweight outcome tags beyond Protect-fail (Missed/No
  Effect/Blocked by Ability) - considered during Stage 2 design but
  dropped as unrequested scope, could revisit if the Protect-fail chip
  pattern proves useful enough to generalize; Download's ability effect
  (deliberately excluded from the switch-in effects table - its target
  stat depends on comparing the opposing side's average Def/SpDef, needs
  base-stat math not taken on yet).
- Everything else from the original 9-item roadmap discussion not yet
  built: general UI polish (#1), cross-device sync via file-sync-folder
  (#2), further Calc UI cleanup (#3), Settings page (#4), Limitless usage
  data once the API key is approved (#7), Statistics page (#9, depends on
  the Battle Logger producing real win/loss data).

- **2026-07-07 manual-testing/UI-polish batch** (not yet built - captured
  from a review pass, user still adding more items):
  1. ~~Battle Logger: distinguish "sending in" from "switching in"~~ -
     done, see Done below.
  2. ~~Battle Logger: side labels + invalid cross-side drag indicator~~ -
     done, see Done below.
  3. Battle Logger: battlefield roster columns don't fit all 6 Pokemon
     vertically at the minimum window size without scrolling. Proposed
     per-Pokemon layout to compact it: Sprite+Name row / `Ability | Move 1
     + Move 2` row / `Item | Move 3 + Move 4` row - the player-side
     roster column should be changed to match this same layout (not just
     a visually-similar one), so both sides end up structurally
     identical.
  4. ~~Battle Logger: log a turn-log entry when a Pokemon is marked
     fainted~~ - done, see Done below.
  5. Calc page: fit the minimum window size without scrolling - drop the
     redundant "Damage Calculator" header text, move "Powered by
     @smogon/calc" to the bottom of the page, delete the "Champions"
     text, and nudge the Regulation selector up slightly to reclaim room
     for the rest of the calculator.
  6. ~~Side menu: remove the "VGC Team Manager" subtext, move Settings to
     the bottom~~ - done, see Done below.
  7. ~~Teams page: 6-Pokemon warning + Item Clause~~ - done, see Done
     below.
  8. Calc page: visual/UX updates inspired by the Platinum Kaizo Damage
     Calculator fork (https://pkcalc.anastarawneh.com, a Showdown-calc
     fork for a specific ROM hack - only borrowing UI ideas, not its
     ROM-hack-specific data). Three concrete pieces:
     - Color-coded nature modifier indicators on each stat row
       (`CalcStatRows.tsx` currently shows Base/SP/Boost with no nature
       up/down coloring at all).
     - A quick speed-tier visual showing at a glance which of the two
       active Pokémon out-speeds the other (nothing like this exists
       today - speed is just a plain number in the stat rows).
     - Replace the current Team/Box concept (Kaizo's version is a
       drag-between-boxes Pokémon storage UI, which doesn't map to our
       app) with a dropdown of the user's saved Teams (from the Teams
       tab), letting them set up to 6 "active" Pokémon for the calc
       session and drag/click to quick-swap which one is loaded into
       Pokémon 1 or Pokémon 2. This should mirror on **both** sides -
       Kaizo's enemy side shows ROM-hack-specific "Team AI Flags" and
       "Experience Dropped" panels that don't apply to us at all, so our
       enemy side gets the same team-dropdown/quick-switch treatment
       instead of those.
     - Restyle the Field conditions panel (`CalcFieldPanel.tsx` /
       `CalcSideConditions.tsx`) to match Kaizo's/the original Showdown
       calc's style: each condition (Reflect, Light Screen, Stealth Rock,
       Protect, Leech Seed, Helping Hand, Tailwind, etc.) as its own
       full-width stacked button/row, not the current tight
       `flex-wrap` cluster of tiny 10px chips crammed together
       (`CalcSideConditions.tsx`'s `TOGGLES` list currently all wraps
       into one dense block).
     Overlaps with item 5 above (both touch the Calc page layout) but is
     a broader redesign, not just a fit-in-minimum-window pass - worth
     scoping together when implementation starts. Once the field-panel
     restyle lands, revisit the Battle Logger's `SideConditionsRow.tsx`
     (same dense-toggle-chip pattern as the old `CalcSideConditions.tsx`)
     and unify both into one shared component so the app doesn't end up
     with two different-looking field-condition widgets.

## Done

- **Battle Logger: log a turn-log entry when a Pokemon faints**
  (2026-07-07): Stage 2 (part 3, completing Stage 2).
  `useBattleLogActions.ts::setFainted` now appends a "Fainted" note action
  to the current turn (same `appendAction` helper `logAction` already
  uses) whenever a Pokemon is marked fainted - only on the `fainted=true`
  direction, not when un-fainting to correct a misclick, since that's not
  a game event worth logging. Renders via `TurnLog.tsx`'s existing
  note-only path (no new UI needed) as e.g. "Accelorate *(Fainted)*" in
  the mover's side color. Live-verified on a disposable test battle.

- **Battle Logger: side labels + invalid cross-side drag indicator**
  (2026-07-07): Stage 2 (part 2). Added small "OPPONENT'S SIDE"/"YOUR
  SIDE" labels (red/blue, matching the existing player=blue/opponent=red
  convention from `TurnLog.tsx`) above/below each row's two active slots
  in `Battlefield.tsx`. For the drag feedback: HTML5 drag-and-drop only
  lets a drop target read `dataTransfer.getData()`'s actual payload on the
  `drop` event itself (blanked out during `dragover` for security), but
  `dataTransfer.types` (the list of MIME type strings, not their values)
  *is* readable during `dragover` - so `dragTypes.ts` gained a second,
  side-specific type (`pokemonDragTypeForSide(side)`, e.g.
  `...-pokemon-player`) set alongside the existing payload type at drag
  start (`RosterRow.tsx`). `BattlefieldSlot.tsx`'s `EmptySlot` now checks
  `dataTransfer.types.includes(...)` on every `dragover` to show a live
  valid (blue, existing style) vs. invalid (red border/background, ⊘ icon,
  "Can't send in a Pokemon from the other side" title) state per slot,
  rather than the old always-blue-on-any-drag-over highlight. The actual
  drop-rejection logic (`handleDropPayload`'s `payload.side === side`
  check) was already correct and untouched - this only adds the missing
  *feedback while still dragging*. Live-verified on a disposable test
  battle: dragging a player-side roster card over an opponent slot showed
  the red ⊘ indicator, while dragging the same card over a same-side
  empty slot showed the normal blue valid state, simultaneously and
  independently per slot (confirmed via direct React-prop invocation
  through the run-desktop driver, since Chromium's synthetic `DragEvent`
  dispatch doesn't reliably fire real `dragover` listeners for automated
  testing - real mouse-driven drags in actual use go through the normal
  browser drag pipeline unaffected by this testing quirk).

- **Battle Logger: "sending in" vs "switching in" for fainted-slot
  replacement** (2026-07-07): Stage 2 (part 1) of the 2026-07-07
  UI-polish batch. `useBattleLogActions.ts::switchIn` (fills an EMPTY
  active slot - the start of battle, or a just-fainted slot's
  replacement) and `swapActive` (replaces an already-OCCUPIED slot - a
  manual Switch-button swap, or the continuation of a switch-out move
  like U-turn) were already two cleanly-separate functions, just not
  tagged differently - the existing "doesn't cost a turn action" carve-out
  only checked `turns.length === 1`, so it covered Turn 1's initial leads
  but not a later-turn fainted-slot replacement. Gave `BattleAction` a new
  `phase: 'sendIn'` (alongside the existing `'switch'`/`'mega'`/`'move'`),
  used only by `switchIn` (note text also changed to "Sent in" vs
  "Switched in", so the turn log now reads correctly either way).
  `canActThisTurn`/`canSwitchOutThisTurn` (`utils/battleLookup.ts`) now
  simply never block on a `'sendIn'` phase action regardless of turn
  number, and the old turn-1-only special case is gone entirely - Turn 1
  leads and fainted-slot replacements are now the same code path.
  `hasAppliedAbilityEffectSinceSwitchIn` and the Battlefield's switched-in
  arrow indicator both widened to match `'sendIn'` too, so switch-in
  abilities (Intimidate etc.) and the arrow still work for both cases.
  Live-verified end-to-end on a disposable test battle (created and
  deleted via direct `battles.json` edits, not the user's real data): sent
  a Pokemon in on turn 1 (log correctly read "Sent in"), advanced to turn
  2, fainted it, sent in a replacement mid-turn, and confirmed via the
  Mega button's title attribute ("Mark as Mega Evolved", not "Already
  acted this turn") that the replacement could still act the same turn -
  the exact bug this fixed. Caught and fixed a real mistake mid-session:
  briefly mutated the user's actual in-progress "metagross team" battle
  while first attempting this test via ambiguous `click-text "Fainted"`
  (multiple matching buttons on screen) - restored via direct
  `battles.json` edits back to the exact original `playerFaintedIds`/
  `playerActiveIds`, confirmed by re-screenshotting. Lesson for future
  live-testing: use a disposable battle for anything that mutates state,
  not an existing real one.

- **Side menu cleanup, Teams validator warnings, and a major CSS bug fix**
  (2026-07-07): Stage 1 of the 2026-07-07 UI-polish batch. Dropped the
  "VGC Team Manager" subtext and moved Settings to the bottom of the
  sidebar (`App.tsx`, a second `<ul className="mt-auto">` inside the now
  `flex flex-col` `<nav>`). `teamValidation.ts::validateTeam` gained two
  new checks, same warning-only severity as the existing checks (the
  function is only ever called from `TeamValidationButton.tsx`'s on-demand
  popup - nothing gates save/export on it): a team-size check (<6
  Pokemon) and **Item Clause** (two Pokemon holding the same item),
  mirroring the existing Species Clause duplicate-detection pattern
  exactly. Both live-verified (`blaze`, a 5-mon team, correctly shows "1
  issue found - Team has only 5 Pokémon (6 required)").

  While chasing why `mt-auto` wasn't visibly pushing Settings down, found
  a real, app-wide bug: `src/renderer/index.css`'s global
  `* { margin: 0; padding: 0; }` reset sat *outside* any `@layer` block,
  right after `@import "tailwindcss"`. Per the CSS Cascade Layers spec,
  unlayered CSS unconditionally beats layered CSS regardless of
  specificity or source order - and Tailwind v4 wraps every one of its
  own utility classes (including every `p-*`/`m-*`/`space-y-*`) in
  layers. Confirmed via computed styles that this had been silently
  zeroing out **every margin and padding utility class in the entire
  app**, the whole time (`py-2 px-4` on a nav button was resolving to
  `0px 0px`). Fixed by wrapping the reset in `@layer base { ... }`, the
  standard fix. This is a real, previously-invisible root cause behind a
  lot of the "doesn't quite fit" cramped feeling driving the rest of this
  UI-polish batch - since spacing now actually renders as intended, later
  stages (Battle Logger layout, Calc redesign) need to budget real
  padding/gaps, not the accidentally-collapsed space seen before. Also
  fixed a double-padding/misalignment side effect this exposed in the
  sidebar (`nav`/the status-footer `div` both had their own redundant
  `p-4` on top of the `aside`'s own inline padding, previously invisible
  since padding was zeroed - dropped down to `pt-4`). Spot-checked
  Teams/Calc/Battle Log tabs post-fix for other breakage - none found,
  though Calc's already-known "doesn't fit minimum window" issue (item
  5/8 below) is now confirmed still open and unaffected by this fix
  either way.

- **Battle Logger: type effectiveness, opponent ability/item pickers,
  screen duration, Mega ability change, log auto-scroll, faint-on-
  Battlefield, deterministic stat-changing moves** (2026-07-07): another
  manual-testing punch list. Turn 1's initial send-in no longer counts as
  a turn action (`canActThisTurn`/`canSwitchOutThisTurn` now ignore a
  `'switch'` phase entry when `turns.length === 1`) - leads can move
  immediately, matching real Team Preview. Opponent Pokemon selection now
  matches the player side exactly: roster-row clicks are a no-op, active-
  switching only via a Battlefield empty-slot picker or drag - `utils/
  dragTypes.ts`'s payload widened to JSON `{side, pokemonId}` so a drop
  target can reject a mismatched-side drag, and `TeamRosterColumn.tsx`
  split into a real `RosterRow.tsx` component (needed for the Mega-sprite
  work below).

  New `config/typeEffectiveness.ts` (the standard 18-type chart, confirmed
  unchanged from mainline by an earlier Champions audit) computes a
  per-target multiplier at log time, shown as a "Super Effective!"/"Not
  Very Effective"/"No Effect" tag in `TurnLog.tsx` - live-verified an
  Earth Power (Ground) into a Fire/Flying target correctly tags "No
  Effect" (immunity). `OpponentPokemonEntry` gained `types`, fetched live
  (not from the bulk species-list picker, which has no type data) the
  moment an opponent is added.

  The opponent move datalist (added last round) now submits on click
  instead of requiring Enter - the input's `onChange` treats an exact
  match against the suggestion list as a pick. `OpponentInfoTags.tsx`'s
  ability field is now a real `<select>` populated from the same
  species-learnset call the Team Builder's own picker uses, item gained a
  `VGC_ITEMS` datalist, and a "Consumed" checkbox appears for actually-
  consumable items (`config/vgcData.ts::isConsumableItem` - berries +
  Focus Sash/Mental Herb/White Herb). Reflect/Light Screen/Aurora Veil
  gained the same "via Light Clay" extended-duration confidence toggle
  weather already had (8 turns vs. 5) - `SideConditions` gained 3 new
  optional flags, no migration needed.

  Mega Evolving now sets the mon's ability to its real guaranteed Mega
  ability (new `config/megaAbilities.ts`, ~40 entries - deliberately
  covers only real mainline Megas, not the Champions-invented ones like
  Raichu X/Y that have no canonical ability to verify against) and, if
  that ability sets weather/terrain, auto-applies it to the field in the
  same call (no separate confirm chip, since a Mega's ability is
  deterministic the instant it's declared) - live-verified Charizard-Y
  auto-setting Sun with the correct fixed "via Mega" duration. Caught and
  fixed a real bug during verification: the auto-applied weather's note
  didn't mention the ability by name, so the (already-redundant) manual
  "Drought!" switch-in chip kept showing since `hasAppliedAbilityEffect
  SinceSwitchIn` had nothing to match against - fixed by folding the
  ability name into the Mega Evolved note. Also fixed the roster-panel
  sprite to Mega-swap alongside the Battlefield one (previously only the
  Battlefield did) - confirmed both show the same Mega form's numeric
  PokeAPI id.

  The turn log now auto-scrolls to the newest turn as it grows
  (`ActiveBattleView.tsx`, a ref + effect keyed on turn/action count).
  The fainted toggle moved off the roster panel (a Pokemon can only faint
  while active) onto the Battlefield's control row - marking fainted now
  also clears that Pokemon's active slot in the same call, live-verified
  the slot re-opens for a replacement. New `config/moveStatEffects.ts`
  auto-applies deterministic stat changes when a move is logged (Draco
  Meteor's self -2 SpA, Charm's target -2 Atk, etc., not exhaustive) -
  reuses the exact stat-note format the reactive-ability chip already
  scans for, so a move-inflicted drop correctly triggers a target's
  Defiant/Competitive chip with no extra wiring; live-verified Draco
  Meteor correctly dropping the user's own SpA by 2.

  Crit/miss outcome tracking, raised in the same round, was explicitly
  flagged by the user as "something to keep an eye on" rather than a
  concrete ask - folded into the already-deferred status-condition/
  move-outcome-chips backlog item above instead of built here.

- **Battle Logger: turn action economy, persistent slots, move autofill,
  auto field-effects** (2026-07-07): a manual testing pass turned up 6 real
  gaps in how the log modeled doubles' actual turn structure. (1) Each
  active slot now gets exactly one action per turn - new `utils/
  battleLookup.ts::canActThisTurn`/`canSwitchOutThisTurn` gate the move-
  popover, Mega button, and Switch button (renamed from "Bench"), reading
  the current turn's already-logged actions. Mega Evolving counts as
  acting (can't Mega then switch out same turn); a switch-out move
  (U-turn/Volt Switch/Parting Shot/etc. - new `config/switchOutMoves.ts`)
  is the one exception, since the resulting switch is a continuation of
  that move's action, not a second one - `TurnLog.tsx`'s "Failed?" chip
  (previously Protect-repeat-only) now also covers these unconditionally,
  since whether they trigger the swap depends on typing/abilities the log
  can't know. (2) A side must field 2 active Pokemon whenever 2+ are still
  alive - switching out now goes through a forced-replacement picker
  (`swapActive`, one `updateBattle` call) instead of leaving the slot
  empty, unless there's truly nobody left to bring in. (3) Opponent moves
  typed into the freeform field now autocomplete against every PokeAPI
  move name (new `services/pokeapiService.ts::fetchAllMoveNames` + `hooks/
  useMoveNameList.ts`, fetched once and cached, wired into a `<datalist>`
  in `MoveLogPopover.tsx`) - previously a bare text box with no signal
  whether a typed move would actually resolve. (4) Logging a move that
  sets a field effect (new `config/moveFieldEffects.ts`: weather/terrain/
  Trick Room/screens/hazards) now updates the tracker in the same
  `logAction` call automatically - hazards always land on the *opposing*
  side, screens/Tailwind on the mover's own, matching real rules; Trick
  Room used while already active cancels it early instead of refreshing
  the duration. (5) Fixed the root cause of switching visually "sliding" a
  Pokemon into the wrong field position: `playerActiveIds`/
  `opponentActiveIds` changed from a plain `string[]` (order = whichever
  slot, no persistent meaning) to a fixed 2-element `(string | null)[]`
  tuple where the index IS the left/right position, never spliced -
  `swapActive` specifically preserves this by replacing in-place at the
  outgoing Pokemon's existing index. (6) Only one Mega per side per battle
  now enforced side-wide (`setMegaEvolved` checks the whole roster's
  already-used ids, not just the clicked Pokemon), with the Mega button
  hidden entirely on every other Pokemon on that side once used.

  Live-verified end-to-end (`.claude/skills/run-desktop/`, ground-truth-
  checked against `battles.json` directly after an early false start where
  a test-script DOM selector - not the app - matched the wrong popover):
  a freshly-switched-in Pokemon's Move/Mega/Switch controls dim and
  no-op; swapping one active Pokemon for a benched one via the forced
  picker correctly kept the untouched slot's Pokemon pinned to its
  original side while the new one took the exact vacated slot; Mega-ing
  one Pokemon correctly hid the Mega button on a second, still
  Mega-capable Pokemon on the same side for the rest of the battle; typing
  a partial opponent move populated live suggestions (937 total loaded)
  and submitting "Trick Room" both logged it and lit up the field tracker
  at a 5-turn countdown with no manual toggle; a Tailwind use similarly
  auto-lit the mover's own side tracker. Reopening a legacy pre-tuple
  battle loaded cleanly with no console errors, confirming the
  `useBattles.ts` migration (pads old arrays into the new 2-slot shape).

- **Battle Logger: Mega redesign, reactive abilities, more switch-in
  effects, field-effects relocation** (2026-07-07): the Mega button is now
  hidden entirely for non-mega-capable species (`config/megaEvolution.ts`'s
  new `getMegaFormsForSpecies`), resolves automatically from the holder's
  known item when unambiguous, and only shows a small X/Y picker for the
  genuinely ambiguous case (Charizard/Raichu, item not yet confirmed).
  Declaring Mega now also swaps the Battlefield sprite to the real Mega
  form (`hooks/useMegaSprite.ts`, already used by the Team Builder,
  finally reused here) and - opponent side only - auto-fills their item
  field with the resolved Mega Stone, since declaring Mega always reveals
  it. `Battlefield.tsx`'s per-slot rendering moved into a new
  `BattlefieldSlot.tsx` real component specifically so `useMegaSprite` (a
  hook) has a legal per-slot lifecycle - the old `renderSlot` was a plain
  helper called a variable number of times per render, which would have
  violated the Rules of Hooks the moment a hook call was added to it.

  New reactive-ability chip (Defiant/Competitive - `config/
  reactiveAbilities.ts`): shows whenever a Pokemon's most recent stat
  change was a decrease and hasn't yet had a matching reactive-ability
  note logged since (`utils/battleLookup.ts::hasUnappliedReactiveLowerEffect`) -
  can re-trigger multiple times per stint on the field, unlike the
  switch-in chip which only fires once per switch-in.

  `config/onSwitchInAbilities.ts` widened to a discriminated union so an
  ability's effect can be a stat change OR a weather/terrain set - added
  Drought/Drizzle/Sand Stream/Snow Warning and the 4 Surge abilities.
  Applying a weather/terrain switch-in effect auto-computes
  `wasMegaEvolved` from whether the source is currently Mega Evolved, so
  `FieldWeatherBar`'s existing duration-confidence display (fixed 5 turns
  vs. an honest 5-8 range) needed no new UI to pick this up. Added Trick
  Room as a new field-wide effect (`FieldState.trickRoom`, fixed 5-turn
  duration, never ability-triggered).

  Relocated field-effect display into the Battlefield's previously-empty
  side margins, matching the user's own mockup screenshots:
  `SideConditionsRow.tsx` (screens/Tailwind/hazards) next to each side's
  active row - discovered it had been dead code, built earlier this
  session but never actually imported anywhere, so this is also where it
  finally got wired in - and the relocated `FieldWeatherBar` (now also
  covering Trick Room) in the top-right.

  Two bugs caught during verification: (1) declaring Mega and syncing the
  opponent's item were two separate sequential `battleLogActions` calls
  off the same stale `battle` reference - the same class of lost-update
  race already hit and fixed once this session for `switchActive` -
  combined into one `updateBattle` call (`setMegaEvolved` now takes an
  optional `revealedItem` param). (2) Even after that fix, the opponent's
  ability/item text inputs in `OpponentInfoTags.tsx` kept showing stale
  (usually blank) values after an external change like the mega-sync or
  an ability-effect chip - their local draft `useState` only seeded from
  props on mount and never resynced; added a `useEffect` per field to fix
  it. Verified the underlying fix directly against the persisted
  `battles.json` (not just the DOM) after the second bug's discovery made
  DOM-only verification suspect.

- **Battle Logger: layout rework, drag-to-field, stat-stage tracking**
  (2026-07-07): the Battlefield's top row now aligns with the roster
  boxes, and the turn log + Undo Last/Next Turn controls moved into the
  space below the Battlefield instead of a separate full-width block.
  Fixed a real bug: `Battlefield.tsx`'s bench picker only ever rendered
  inside the *occupied*-slot branch of `renderSlot`, so if both of a
  side's slots were empty (e.g. right after bringing 4 with none active
  yet), clicking either did nothing visible - `benchSlot` state now
  tracks the exact `{side, index}` clicked, and both branches share a
  wrapper that can render the picker, so it always attaches to the
  actually-clicked slot. On top of the fix, added the user's preferred
  interaction: drag a roster card (native HTML5 drag-and-drop, no new
  dependency) onto an empty Battlefield slot to switch it in - same
  underlying `switchActive` action as the picker/roster click, so
  logging/the switch-in arrow work identically either way. Click-to-pick
  stays as a fallback alongside drag.

  New stat-stage tracking: `Battle.statStages` (keyed by pokemonId,
  Atk/Def/SpA/SpD/Spe, -6..+6), a "Stats" corner button + new
  `StatStagePopover.tsx` for manual +/- taps, a summary badge under each
  active mon, and auto-reset to empty when a Pokemon leaves the field
  (bench or faint) - matches the real game. New
  `config/onSwitchInAbilities.ts`: a curated table (Intimidate, Intrepid
  Sword, Dauntless Shield - deliberately not Download, see In Progress)
  mapping an ability to its stat effect; a one-tap "apply" chip shows on
  the Battlefield when a Pokemon's known ability matches, and in
  `OpponentInfoTags.tsx` when a matching ability is typed in after the
  Pokemon's already active - never automatic, matches the app's "manual
  log, not a simulator" philosophy already used for the Protect-fail
  chip. New `utils/battleLookup.ts::hasAppliedAbilityEffectSinceSwitchIn`
  correctly scopes "already applied" to the Pokemon's current stint on
  the field (not just the current turn), since the effect only triggers
  once per switch-in however many turns it stays out.

- **Battle Logger Stage 2: interactive click-to-log flow** (2026-07-07):
  `ActionEntryBar.tsx`'s manual dropdown bar is gone entirely, replaced by
  click-mon -> click-move -> click-target directly on `Battlefield.tsx`
  (new `MoveLogPopover.tsx` for the move list). Target resolution uses a
  new `MoveData.target` field (fetched from PokeAPI like power/pp/accuracy)
  mapped to a coarse category in `config/moveTargeting.ts` - self/field
  moves auto-log immediately, spread moves auto-target every foe/ally, a
  genuinely single-target move highlights the field and waits for one
  click (manual override always allowed regardless of highlight, since
  this is a log, not a rules enforcer). Also: player roster rows now
  toggle brought status on a full-box click (was a tiny "+" corner
  button), matching the opponent roster's existing box-click-to-toggle-
  active feel; active-switching for the player moved entirely into the
  Battlefield (click an empty slot for a bench picker, a corner "Bench"
  button to swap out) since the roster click was now claimed by brought-
  toggling. New `Battle.megaEvolvedIds` + a per-slot "Mega" button. New
  small arrow (▲/▼) under/above a Battlefield slot for a Pokemon that
  switched in that turn, cleared automatically next turn. `TurnLog.tsx`
  now groups each turn's actions switch -> mega -> move regardless of tap
  order, and shows a "Failed?" chip on Protect-family moves - but only on
  a repeat use (`utils/battleLookup.ts::isRepeatProtectUse`), never the
  first, per the user's ask not to waste a tap on the common case.
  `FieldWeatherBar.tsx` gained a "via Mega" toggle: a Mega Evolution's
  ability-triggered weather/terrain is always a fixed 5-turn duration (no
  held-rock ambiguity possible), shown as `(5)`; anything else shows the
  honest `(5-8?)` uncertain range until confirmed.

  Two bugs caught during verification (see the run-desktop skill below):
  a stale `game-data-cache.json` entry for a move fetched before `target`
  existed had no `target` field at all, silently falling into the
  "unknown target" bucket - fixed by treating a cached move without
  `target` as a cache miss in `useGameData.ts::getCachedMove`, forcing one
  self-healing re-fetch (same read-boundary philosophy as the Champions
  override tables). Also: deleting `ActionEntryBar.tsx` silently dropped
  the only "Next Turn"/"Undo Last" controls in the app - added a small
  turn-controls row back in `ActiveBattleView.tsx` above the turn log.

  Also built **`.claude/skills/run-desktop/`**: a Playwright `_electron`
  driver + SKILL.md for automated UI testing (click by DOM text/selector,
  read console/page errors directly, screenshot) instead of driving the
  real OS mouse - the old approach couldn't distinguish a real renderer
  crash from a missed click. `playwright-core` added as a devDependency.
  Gotcha worth remembering: `ELECTRON_RUN_AS_NODE` (often already set in
  this shell) makes `electron.exe` boot as plain Node with no window -
  the driver strips it defensively before every launch.

- **Battle Logger: sprite bug fix + battlefield redesign Stage 1**
  (2026-07-07): Basculegion's sprite wasn't loading in the Battle Logger -
  root cause was that `PickBroughtFourGrid.tsx`/`PlayerFieldPanel.tsx` were
  the only places in the app trusting a raw, copied `spriteUrl` snapshot
  field instead of recomputing it live via `getPixelSpriteUrl()` like
  `PokemonCard.tsx`/`TeamCard.tsx` already do; this one Pokemon's stored
  value was a stale, malformed URL from an older version of the fetch code
  (`.../902-male.png`, a file that doesn't exist - the real one is
  `902.png`, no suffix). Fixed generally (recompute live from
  `pokedexNumber`/`species`/`gender`), not patched as a one-off, so any
  future staleness of this kind can't recur the same way.

  Then a full battlefield layout redesign (Stage 1 of 2 - see the plan
  file for Stage 2, not yet built): both full 6-Pokemon rosters now show
  vertically (`TeamRosterColumn.tsx`, shared/parameterized, replacing the
  old 2-at-a-time grid); the separate "Pick 4 to Bring" screen is gone -
  `StartBattleFlow.tsx` now goes straight from team selection into the
  battle with all 6 snapshotted (`Battle.playerRoster`, renamed from the
  old fixed-4 `broughtFour`), and which 4 are actually brought is chosen
  live from the roster column (new `broughtIds` field + `toggleBrought`
  mutation, capped at 4). Fixed a real bug in the process: the opponent
  roster had no cap at all - now hard-capped at 6
  (`MAX_OPPONENT_ROSTER_SIZE`), enforced both in the mutation and the "+
  Add" button. New `Battlefield.tsx` shows just the 4 currently-active
  combatants, opponent 2 on top / player 2 on bottom, matching the user's
  own prototype layout; the turn log now sits below the whole battlefield
  row instead of squeezed between the two rosters. `OpponentInfoTags.tsx`
  dropped the `teraType` input entirely (removed from the type too, not
  left as a dead field) - not reliably discoverable mid-battle, unlike
  moves/ability/item which stay. Old persisted battles (pre-redesign, with
  the legacy `broughtFour` shape) are migrated at the read boundary in
  `useBattles.ts` rather than breaking - verified live against a real
  legacy in-progress battle, which loaded correctly with all 4 of its old
  brought Pokemon pre-checked. Also verified live: brought-cap at 4 (5th
  Pokemon on a 5-mon team correctly stayed un-bringable), opponent cap at
  6 (add button disappears at 6/6), and Basculegion's sprite rendering
  correctly in the new roster column and battlefield both.
- **Battle Logger: field/side-condition tracking** (2026-07-07): weather
  (Rain/Sun/Sandstorm/Snow) and terrain (Electric/Grassy/Misty/Psychic) are
  field-wide, one active at a time per group; screens (Reflect/Light
  Screen/Aurora Veil), Tailwind, Safeguard, and Mist are per-side with a
  turn countdown computed from standard duration (Tailwind 4, others 5) -
  a helpful default only, always manually clearable since real games can
  extend (Light Clay, weather rocks) or end things early (Rapid Spin,
  Defog). Hazards (Stealth Rock, Sticky Web, Spikes 0-3, Toxic Spikes 0-2)
  have no countdown since they persist untimed. New
  `types/pokemon.ts` `FieldState`/`SideConditions` on `Battle` (single
  current-state snapshot, same pattern as `playerActiveIds`), new
  `config/fieldConditions.ts` (durations/labels/countdown calc, reuses
  `pokemonTheme.ts`'s `getTypeTheme()` for weather/terrain colors instead
  of a new palette), 5 new mutations in `useBattleLogActions.ts`, and two
  new components (`FieldWeatherBar.tsx`, `SideConditionsRow.tsx` - the
  latter shared between `PlayerFieldPanel.tsx`/`OpponentFieldPanel.tsx`).
  Backfills `fieldState` for battles saved before this existed
  (`useBattles.ts`'s read boundary) so old records don't crash the new UI.
  Verified live: countdown decrements correctly turn-by-turn (Rain 5->2,
  Tailwind 4->1 after 3 "Next Turn" clicks), manual clear works at any
  count, hazard stacking cycles 0-max correctly, and all state survives a
  tab-switch-away-and-back (confirms persistence through the existing
  write-through, not just component state).
- **Full movepool diff processed from the "Pokémon Ch." tab** (2026-07-07):
  the 227-row `Learnset` tab turned out to be a raw per-species dump, not a
  diff - the user redirected to `Pokémon Ch.` instead, which has the same
  ~226 species pre-diffed against their Scarlet/Violet and historical
  movepools (Additions/Returns/Deletions columns). Fetched directly via the
  sheet's CSV export endpoint (`gviz/tq?tqx=out:csv&sheet=...`, bypassing
  WebFetch's AI-summarization layer which had already silently truncated
  the `Learnset` tab once - not reliable for bulk tabular data) and parsed
  programmatically (proper quoted-CSV parsing, since several cells have
  embedded newlines). `championsMovepoolChanges.ts` now covers 182 species
  with additions and 138 with removals, replacing the ~15-species table
  sourced from a Reddit thread. Several of that thread's claims didn't
  survive the cross-check and were dropped: Scolipede "gains Pounce",
  Barbaracle "gains Chilling Water", Scrafty/Staraptor "loses Parting
  Shot/Knock Off", Scolipede/Overqwil "loses Mortal Spin", Malamar "loses
  Octolock", Mawile "loses Dazzling Gleam" - none corroborated by this more
  comprehensive source. Also fixed a typo inherited from that table:
  "trailblazer" isn't a real move slug (it's "Trailblaze") - would have
  silently never matched. Full reasoning and the exact dropped claims are
  in the config file's header comment.
- **Mega Evolution list confirmed correct; Tera Blast doesn't exist in
  Champions at all** (2026-07-06): follow-up to the spreadsheet cross-check
  above. The user confirmed in-game that all the Mega Evolutions currently
  in `config/megaEvolution.ts` are valid - the spreadsheet's "doesn't work
  as of now" list for those species was stale, no code change needed.
  Separately, Tera Blast is confirmed to not exist in Pokemon Champions at
  all (not a per-species removal - a game-wide absence), which resolves
  the "227-row movepool diff, mostly Tera Blast" lead without needing to
  process most of it: `championsMovepoolChanges.ts` now unconditionally
  strips `tera-blast` from every species' learnset via a new
  `GLOBALLY_REMOVED_MOVES` list (PokeAPI's mainline Scarlet/Violet data
  includes it as a universal TM move for nearly every species). Whatever
  remains in that 227-row diff beyond Tera Blast is still an open lead,
  see below.
- **Move flag tags (Sound/Bullet/Punch/etc.)** (2026-07-06): Champions
  displays visible tags on moves so interactions with abilities like
  Soundproof/Bulletproof/Strong Jaw are clear at a glance. Checked first
  and confirmed PokeAPI does *not* actually expose these flags (an earlier
  TODO note assumed it did - wrong). Used `@smogon/calc`'s bundled Gen 9
  Showdown movedex instead, which does track exactly 8 real flags (contact,
  bite, sound, punch, bullet, pulse, slicing, wind) - extracted to a static
  `config/moveFlagsData.generated.ts` via a one-off codegen script
  (`scripts/generateMoveFlags.ts`, rerun with `npx tsx` if the package's
  bundled data ever changes) rather than importing `@smogon/calc` at
  runtime, which would've pulled its ~500KB bundle back into the main
  chunk (it's deliberately lazy-loaded only for the Calc tab). New
  `config/moveFlags.ts` applies flags at the same read-boundary pattern as
  the Champions overrides (`useGameData.ts`), added `flags: string[]` to
  `MoveData`, and a small themed badge row in `TooltipContent.tsx` (colors
  in `pokemonTheme.ts`). Verified live: Dark Pulse correctly shows a
  "Pulse" tag, Iron Head (contact-only) shows none. **Contact is
  deliberately excluded** from the visible set (too common to be a useful
  callout) and the other 7 are shown as a reasonable default - which flags
  Champions' own UI actually surfaces hasn't been confirmed in-game yet,
  flagged as an assumption in the config file's header comment.
- **Champions data-correctness audit (part 3 - "Data Comparative Champions"
  spreadsheet cross-check)** (2026-07-06): the user found and shared a much
  higher-quality source than Serebii/Bulbapedia's summaries - a community
  spreadsheet by RoiDadadou cross-referencing datamined values (Kaphotics,
  Anubis) and battle-mechanics research (DaWoblefet); see README Credits.
  Cross-checked it against everything already in `championsMoveOverrides.ts`
  - all previously-encoded values matched (including Dire Claw, which the
  user separately asked about and turned out to already be correct: 30%
  status chance, unchanged power/accuracy). The spreadsheet also surfaced
  moves we were missing entirely: **added overrides** for Gear Grind,
  Anchor Shot, Revelation Dance, Dragon Hammer, Snipe Shot, Bolt Beak,
  Fishious Rend, Astral Barrage, Triple Dive, Hyper Drill, Blood Moon
  (power/accuracy changes), and Clangorous Soul (now never misses -
  `accuracy: null`). **Added missing PP exceptions**: Purify (20->8), Shell
  Trap (->12), Obstruct (->8), Spin Out (->12), Nihil Light (->8) - these
  don't fit the standard retiering formula, same category as the
  Protect-line exceptions already handled. **Found and fixed a real bug in
  the just-shipped move-flag tags feature**: Dire Claw/Crush Claw/Shadow
  Claw/Dragon Claw are reclassified as slicing moves in Champions (Sharpness-
  boostable), but `@smogon/calc`'s mainline-sourced data doesn't know that,
  so the generated flags table was missing `slicing` for all 4 - added a
  small `CHAMPIONS_ADDED_FLAGS` correction layer in `config/moveFlags.ts`.
  All new values spot-verified via a scratch script (see the no-test-runner
  convention). **Rejected**: the spreadsheet's "15 vs 16 damage rolls"
  claim - the user flagged this as unconfirmed themselves, and separately
  noticed Pokemon Showdown's own Champions-mode calc still shows 16 rolls,
  a second independent signal the claim is stale/wrong. Not encoding it.
  **Also rejected**: the `Moves Deleted` tab entirely - it conflates "no
  current Pokemon can learn this move" (a roster gap) with the move not
  existing, and flags moves we know are real (Rage Fist, Make It Rain) as
  absent. Two things surfaced that needed a decision, now resolved: the
  Mega Evolution species list was confirmed valid by the user in-game (no
  code change needed), and Tera Blast's removal turned out to be a simple
  blanket rule, not a per-species diff (see Done entry below). See the
  in-progress section for the spreadsheet's overall reliability downgrade
  and the still-open `Learnset` tab lead.
- **Champions data-correctness audit (part 2)** (2026-07-06): follow-up to
  the balance-patch fix below, checking for further Champions-specific
  gaps. Stat Points confirmed by the user directly in-game: max 32/stat, 66
  total (per-stat clamp already existed in `CalcStatRows.tsx`; added a soft
  66-total warning, updated `useDamageCalc.ts`'s `spToEv` comment from
  "unconfirmed" to confirmed). Movepool changes from a Reddit thread
  (r/stunfisk "Some movepool changes in Champions Version 1.1", via
  user-provided screenshots since reddit.com fetching is blocked) added to
  `config/championsMovepoolChanges.ts` (renamed from
  `championsMovepoolAdditions.ts`, now handles removals too): 5 species
  gaining moves, 10 losing them (one claimed removal, Grimmsnarl "loses
  False Surrender," excluded as an unrecognized/likely-erroneous move
  name). Self-serve research pass (no game access needed) confirmed via
  Bulbapedia's dedicated changes section and Serebii's patch history: the
  ability-changes list (Healer + Unseen Fist) is exhaustive; crit-hit
  mechanics and the type chart are unchanged from mainline (only display
  labels changed); no dedicated "changed items" page exists (unlike moves/
  abilities/status conditions), and a shared Showdown replay's Life Orb
  recoil (~10%, matching mainline) backs that up; patch history through
  v1.1.0 (2026-06-17) has no further balance changes beyond what's already
  encoded. Two leads remain open, blocked on the user: the community
  Google Sheet of full Champions movepools (not a diff - needs manual
  cross-referencing against PokeAPI's mainline data per species:
  https://docs.google.com/spreadsheets/d/1DeXjzohTUdKNERu6dsHsnznneva8MDJjglI3lqDLgm4)
  and anything noticed live during play that doesn't match the app (how
  the original Make It Rain gap was caught).
- **Champions balance-patch data correctness fix** (2026-07-06): PokeAPI
  (our only game-data source) models mainline Scarlet/Violet with no concept
  of Pokemon Champions' own balance patches - caught concretely when Make It
  Rain's tooltip showed 100%/-1 Sp.Atk instead of Champions' actual 95%/-2.
  Turned out to be systemic: ~19 moves with power/accuracy/type/effect
  changes, PP retiered game-wide (not just those 19 - nearly every move's PP
  changed via a formula), 2 ability changes (Healer, Unseen Fist), and 3
  status condition changes (freeze/paralysis/sleep odds), verified against
  Serebii's Updated Attacks/Status Conditions pages and Bulbapedia's
  Champions article. New `config/championsMoveOverrides.ts` (+PP retier),
  `championsAbilityOverrides.ts`, `championsMechanics.ts` (status condition
  reference, not wired into UI yet - for future Battle Logger stat-inference
  use), `championsMovepoolAdditions.ts` (seeded with only the one confirmed
  example, Swampert + Wave Crash - see backlog below). Applied at the read
  boundary in `useGameData.ts` (self-healing against already-cached stale
  entries, no cache-version bump needed) and via `@smogon/calc`'s own
  `Move` `overrides` option in `useDamageCalc.ts` - confirmed the live damage
  calculator was actually under-calculating every Champions-buffed move
  before this fix, not just showing wrong tooltip text. Also removed 'Hail'
  from the Calc's weather options (Gen 9 replaced it with 'Snow' game-wide,
  unrelated to Champions specifically but directly adjacent). Bulbapedia
  added as a second dev-time reference source alongside Serebii (Credits +
  CLAUDE.md updated).
- **Battle Logger MVP** (2026-07-06): the project's primary objective.
  Manually log a live VGC battle turn-by-turn while playing on a separate
  device - pick a saved team, bring 4 of its Pokemon, log an ordered
  sequence of actions per turn exactly as observed (no turn-order
  prediction), track which 2 Pokemon are active/fainted per side, build an
  opponent roster incrementally with simple revealed move/ability/item tags
  (ephemeral, per-battle), set a win/loss result, and browse/delete past
  battles. New `battles.json` store (`useBattles.ts` CRUD +
  `useBattleLogActions.ts` for the higher-level mutations, mirroring
  `useTeams.ts`/`useRosterActions.ts` exactly) and a new lazy-loaded
  `components/battlelog/` tab. Verified end-to-end in a real running
  instance (not just type-check/lint) - team pick, 4-pick cap, battle
  start, action logging, opponent quick-add via the reused
  `SpeciesPickerCard`, win/loss, persistence, and delete all confirmed
  working against real saved teams.
- **Project health/cleanup pass** (2026-07-06): removed 12 stale one-off doc
  files (content already in git history/CLAUDE.md); removed dead code
  (`MoveBanner.tsx`, unused move-category-theme block, unused `VGC_MOVES`);
  fixed a real bug where `TeamCard.tsx`'s collapsed sprite row was missing
  the gender/divergent-form sprite logic `PokemonCard.tsx` has (extracted to
  shared `utils/spriteUrl.ts`); removed unused `postcss`/`autoprefixer`/
  `concurrently` deps; fixed `dist-electron/` being accidentally tracked in
  git; lazy-loaded the Calc tab (`React.lazy`, moved `useDamageCalc` inside
  `CalcPage` so `@smogon/calc` only loads when the tab opens - split the
  766KB main bundle into a 268KB main chunk + separate 499KB Calc chunk);
  softened the 250-line component rule from a hard cap to a smell-test
  guideline (CLAUDE.md/.clinerules); reclaimed `.git` from 119MB to 363KB via
  `git gc` (old dangling blobs, nothing reachable was touched); restored and
  modernized ESLint (was completely broken - no config existed - now on
  ESLint 9 flat config + `typescript-eslint` v8 + `eslint-plugin-react-hooks`,
  which also fixed a minimatch ReDoS vulnerability in the old toolchain);
  set up `electron-builder` for Windows (nsis installer + portable, verified
  working end-to-end - produces `release/ChoiceBuds Setup 0.1.0.exe` and
  `release/ChoiceBuds 0.1.0.exe`) and Mac (dmg + zip, config in place but
  **needs an actual Mac or macOS CI runner to produce/test** - can't be
  built or verified from Windows); tracked `package-lock.json` for
  reproducible installs.
- **Widen bulk first-launch sync to shiny + item sprites** (2026-07-06)
  `useInitialSync.ts` now also downloads each species' shiny sprite and every
  `VGC_ITEMS` entry's sprite during the one-time bulk pass, not just normal
  Pokemon sprites. `SpeciesRosterEntry` gained a `shinySpriteUrl` field
  (`useSpeciesRoster.ts`, roster cache bumped to `v3` to invalidate old
  cached entries missing it).
- Add offline startup sync and sprite caching (normal sprites + move/ability/
  learnset data for the Reg M-B dex)
- Add damage calculator tab and regulation picker
- Refactor editors and add team validation
- Add in-slot item picker and dismissable hook

## Backlog / ideas (not yet scoped)

- **Electron is well behind current** (`^28.0.0`; latest is 43+) - carries
  several high-severity advisories fixed only in newer majors. Bumping is a
  real (if likely modest) migration, not a one-line version bump - worth its
  own dedicated pass rather than doing it blind.
- Two pre-existing `react-hooks/exhaustive-deps` warnings in `useDatabase.ts`
  (lines 54, 260, missing `initializeCacheWithSWR` dependency) surfaced by
  restoring ESLint - not fixed as part of the cleanup pass since the intent
  behind the missing dependency wasn't investigated; worth a look.
- No app icon set yet for packaging - electron-builder is using the default
  Electron icon. Add `.ico`/`.icns` assets whenever branding is ready.
- **Unseen Fist-through-Protect deep interaction** - our override only
  corrects the tooltip description (25% not 100%); if `@smogon/calc` has its
  own internal logic for this specific interaction, the live calculator may
  still assume the old mainline value. Not chased further - low-frequency
  edge case (needs Unseen Fist + a contact move + the target having used
  Protect that turn).
