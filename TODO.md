# ChoiceBuds TODO

Working task list for ongoing/planned work. Keep entries short; put rationale
in a `Why:` line only when it's not obvious from the task itself. Finished
work moves to [COMPLETED.md](COMPLETED.md) once done, so this file stays
focused on what's actually next.

## In progress / up next

- **RoiDadadou spreadsheet - reliability is mixed, tab by tab**: got direct
  sheet access via its CSV export endpoint (19 tabs total). Two tabs
  processed and trusted (`Pokémon Ch.` - see COMPLETED.md); one tab actively
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
  effects pass, the type-effectiveness/opponent-pickers/screen-
  duration/mega-ability/auto-scroll/faint-relocation/stat-changing-moves
  pass, status-condition tracking + move-outcome chips, the self-targeting
  fix, and the per-target crit/miss + chip-placement follow-up are all done
  (see COMPLETED.md). Still open: Bo3 "set" grouping across games, post-battle
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
  built, reordered by priority: Statistics page (#9) done, Settings page
  (#4) shell + default-regulation setting done, cross-device sync (#2) code
  done - see COMPLETED.md; further Calc UI cleanup (#3) - overlaps with
  Calc work already in flight elsewhere in this file; general UI polish
  (#1) - vague/ongoing, no concrete scope; Limitless usage data (#7) -
  blocked externally on API key approval, can't start regardless of
  priority.

- **Cross-device sync - deploy the Worker**: all code is built and
  live-verified locally (see COMPLETED.md), but the Worker itself isn't
  deployed yet - `worker/README.md` has the full `wrangler login` /
  `wrangler kv:namespace create` / `wrangler deploy` walkthrough. Until
  that's done and the real `*.workers.dev` URL is pasted into
  `src/renderer/services/syncApi.ts`'s `SYNC_WORKER_URL` (currently a
  placeholder), Push/Pull will fail with a "couldn't reach the sync
  server" error - this is a you-run-it step, not something buildable
  further from here.

- **Season-level breakdowns (Statistics page + Battle Logger)**: a season
  is a sub-division of a Regulation, not something either system tracks
  today - `Team['format']`/`Battle['format']` only distinguish `'Reg M-A'`
  vs `'Reg M-B'` as a whole, with no season field anywhere. Eventually want
  win rate/data splittable by season (e.g. a team's Reg M-B season 1 record
  distinguishable from its season 2 record), for both the Statistics
  page's breakdowns and the Battle Logger's own per-battle data. Needs a
  new season field/schema addition before any of this can be built
  (nothing to derive it from today) - not scoped in detail yet, just
  captured as a known future want.
  - **Researched 2026-07-08** (Bulbapedia + Serebii, one-off manual check
    per CLAUDE.md's external-source policy - not a live fetch): confirmed
    season date ranges exist and are trackable. Serebii was more current
    than Bulbapedia's dedicated season-list page, which hadn't been
    updated with the newest season yet at check time - worth checking both
    when this gets built, not just one.
    | Season | Regulation | Start | End |
    |---|---|---|---|
    | M-1 | Reg M-A | 2026-04-08 | 2026-05-13 |
    | M-2 | Reg M-A | 2026-05-13 | 2026-06-17 |
    | M-3 | Reg M-B | 2026-06-17 | 2026-07-08 |
    | M-4 | Reg M-B | 2026-07-08 | 2026-08-05 |
    | M-5 (expected, unconfirmed) | Reg M-B | ~2026-08-05 | 2026-09-02 (Reg M-B's own published end date) |

    M-5's exact dates aren't published by either source yet - the above is
    inferred from the pattern, not sourced, and needs re-confirming before
    use. When this is eventually built, these dates should be hand-authored
    into a static config (matching the `config/` pattern used elsewhere,
    e.g. `vgcData.ts`) - not fetched live at runtime, and will go stale as
    new seasons launch. Sources checked: Bulbapedia's "Ranked Battles
    Seasons in Pokémon Champions" and "Regulation Set M-B" pages, Serebii's
    `rankedbattle/regulationm-a.shtml` and `regulationm-b.shtml` pages -
    full URLs in the `reg_mb_season_timeline` memory note.
  - **New, related idea - a "Check for Updates" tool**: doesn't exist
    anywhere today (checked - no prior mention in this file, COMPLETED.md,
    or memory). Given the no-live-scrape constraint above, this can't be an
    automated puller - the agreed shape is a manual-refresh-reminder
    utility, most likely living on the Settings page (exists now, see
    COMPLETED.md): surface
    what season/regulation data is currently hardcoded, when it was last
    manually checked, and a prompt to re-check Bulbapedia/Serebii and
    update the config by hand. Same pattern could generalize to the other
    hand-authored Champions balance-patch config
    (`championsMoveOverrides.ts`/`championsAbilityOverrides.ts`/etc.) if
    useful later, but season/regulation data is the concrete driver for
    now. Not scoped beyond this - no persistence design, no UI mockup yet.

- **2026-07-07 manual-testing/UI-polish batch**: items 1-2, 4, 6-7 done, no
  remaining notes (see COMPLETED.md). Item 3 done - its "Battlefield.tsx
  itself is the tallest column" scrollbar finding is what the "New,
  discovered while doing item 3" note below covers in full. Item 5 done -
  its "Calc doesn't fit the minimum window" note is tracked under the
  second review pass's item 1 below. Item 8 done - its SideConditionsRow/
  CalcSideConditions unification follow-up is tracked under the second
  review pass's item 3 below.
  - **New, discovered while doing item 3**: the Battle Log page still
    needs to scroll at the 1280x720 minimum window size even after the
    roster compacting - `Battlefield.tsx` itself (428.5px) + turn
    controls (24px) + turn log (332px, within its existing 192-384px
    range) total 808.5px, taller than either (now-compacted) roster
    column. Fitting the whole page would need a separate pass at
    `Battlefield.tsx`'s own sizing (slot spacing, weather/side-condition
    bar padding, etc.) - not scoped or touched during item 3.

- **2026-07-07 second review pass** (captured from a manual-testing round,
  reference screenshots of the real calc.pokemonshowdown.com Champions mode
  provided for items 1-3; items 2, 5-10 done with no remaining notes - see
  COMPLETED.md):
  1. Calc page: tighten overall spacing so more fits without scrolling at
     1920x1080, closer to how the real Showdown calc packs its panels -
     builds on the earlier "doesn't eliminate scrolling" caveat above.
     **Partially done** as a side effect of a later redesign pass (see
     COMPLETED.md - padding/gaps tightened across every Calc panel,
     measured 924px vs the old 1102px scrollHeight at the 1280x720
     minimum), but not the dedicated 1920x1080-targeted pass this item
     originally asked for - still open if further tightening is wanted.
  3. Calc page (`CalcSideConditions.tsx`) field-effect toggle trim is done.
     Still open: the follow-up to unify `CalcSideConditions.tsx` and the
     Battle Logger's `SideConditionsRow.tsx` into one shared component
     instead of two different-looking implementations of the same idea -
     not done, both still exist separately.
  4. Battle Logger: opponent roster boxes were reported visually bigger
     than the player's - the specific layout idea (move `FieldWeatherBar`
     to its own row, stack `SideConditionsRow.tsx` vertically) is done,
     see COMPLETED.md. But verifying it found the real premise was wrong:
     both roster columns are pinned to an identical fixed width regardless
     of `Battlefield.tsx`'s own content (confirmed via direct
     measurement), so width was never the actual gap. The real remaining
     gap is *height* (500px vs 608px column height, from the opponent
     side's live form controls needing more room per Pokemon than the
     player's static text) - same gap acknowledged again in the third
     review pass's item 5 below. A real fix would be a height-focused pass
     at `OpponentRowFields.tsx` - not scoped or attempted in either pass
     so far.

- **2026-07-07 third review pass** (originally captured in the order the
  user raised them during a manual-testing/reference-screenshot session;
  reordered here highest-to-lowest priority. Roughly: cheap/trivial fixes
  and confirmed bugs first, then correctness gaps in the actively-used
  Battle Logger, then clear-scope builds with no blockers, then items
  blocked on a research/policy decision, then the largest net-new subsystem
  last, per the user's own choice to defer it rather than build it
  immediately. Items 1-2, 4, 6-7, 9 done with no remaining notes - see
  COMPLETED.md):
  3. Battle Logger's move-stat-effects table (Growth's weather-conditional
     stage count, plus comprehensive stat-changing-move coverage) is done,
     see COMPLETED.md for the full research trail. Still open: the user's
     belief that several other moves besides Growth have a
     weather-conditional stage *amount* - research (multiple cross-checked
     Bulbapedia sources) turned up no second example, only Growth. Waiting
     on the user to name specific moves rather than guess/fabricate more
     weather branches.
  5. Battle Logger: the player roster column was reported visually smaller
     than the opponent's - done (per-cell footprint equalized to match),
     see COMPLETED.md. Still open: only the per-cell footprint was
     equalized, not the whole column height - see the second review pass's
     item 4 above for the fuller discussion of this same gap.
  8. Team export to Showdown text format is done, see COMPLETED.md.
     Stretch goal still open, explicitly flagged by the user as uncertain:
     exporting *to* Pokepaste (creating a new paste via their write API,
     not just formatting local text) - unconfirmed whether pokepast.es
     exposes a usable public write API, needs research before scoping.
     Writing to an external third-party service is new territory for this
     project's external-integration rules, not something to bolt on
     silently.
  10. Teams page (`TeamCard.tsx`): while in edit mode, let a Pokemon card
      be reordered within the team via click-and-drag instead of the
      roster order being fixed to import/add order. `useRosterActions.ts`
      has no reorder mutation today - only `swapSlot` (replaces one
      index's species entirely, not a move), `addSlot`, and `removeSlot`
      - so this needs a new `reorderSlot(team, fromIndex, toIndex)`-style
      mutation that repositions an existing `ImportedPokemonInfo` within
      `team.pokemon`, plus wiring HTML5 drag-and-drop onto
      `PokemonCard.tsx` (matching the drag pattern already used for
      Battle Logger roster cards - see `utils/dragTypes.ts` - and the
      Calc team tray - see `utils/calcDragTypes.ts` - rather than
      inventing a third convention).
  11. Teams page (`TeamsPage.tsx`): let teams be reordered in the list via
      click-and-drag (same drag convention as the Pokemon-card-reorder
      item above). `useTeams.ts` has no reorder mutation today either -
      `teams` order is whatever `teams.json` happens to have (append-on-
      add via `addTeam`). Open design question worth settling before
      implementing: the page renders `filteredTeams`
      (`teams.filter(t => t.format === activeFilter)`, or the full list
      under "All") - dragging within a filtered view (e.g. only Reg M-B
      teams showing) needs a decision on how that maps back onto the
      underlying full-`teams` array order, since hidden (filtered-out)
      teams' relative positions still need to make sense afterward.
      Ranked below the Pokemon-card reorder above since it has this extra
      unresolved design question on top of the same missing-mutation
      work.
  12. Calc page: bulk-import Pokemon via pasted Showdown text (reference
      screenshot: a standard single-Pokemon Showdown export block), able
      to import more than one at once, and save each as an individually
      reusable set - then when searching for a species anywhere on the
      Calc page, offer a choice between starting from a blank set or
      loading a saved one for that species if any exist. A genuinely new
      concept, not just wiring - "saved individual Pokemon" doesn't exist
      anywhere in the app today (Teams are the only persisted grouping,
      always a 6-slot roster, never a flat library of standalone sets).
      Ranked last: the user explicitly chose "add to TODO for later" over
      "implement now" when asked, and it's the largest net-new subsystem
      of this whole batch (own persistence layer, new UI, a naming
      scheme). Real scope, and what's already reusable:
      - Persistence: needs a new store alongside `teams.json`/
        `battles.json` (own IPC handlers in `main.ts`, preload bridge
        methods, a new `useSavedPokemon.ts` hook mirroring `useTeams.ts`)
        - a flat list, not nested under a team.
      - Parsing/import: `services/parser.ts::parseShowdownText` already
        splits pasted text into multiple Pokemon blocks and handles a
        single block equally well - the bulk-multi-import part is mostly
        already there, just needs a Calc-page entry point (a modal/panel,
        not the existing Teams-only `ImportTeamModal.tsx`) and running
        each block through `enrichPokemonWithAPI` like team import does.
      - Calc-state mapping: `utils/calcTeamImport.ts::teamPokemonToCalcUpdates`
        already converts `ImportedPokemonInfo` -> `Partial<CalcPokemonState>`
        (built for "Load from Team" tray) - directly reusable for loading
        a saved individual Pokemon into a Calc panel too, no new mapper
        needed there.
      - Net-new UI: the species search itself
        (`CalcAutocomplete.tsx`, used generically for species/item/
        ability/move) needs species-specific behavior added on top - once
        a species is picked, if saved sets exist for it, prompt/offer
        "blank" vs. each saved set by name rather than always defaulting
        to blank. Needs a naming scheme for saved sets too, since more
        than one could exist per species (e.g. two different Dracovish
        sets) - nickname, a user-entered label, or both.
  13. **New**: Battle Logger - moves whose *non-stat* effect changes with
      weather (accuracy, power, healing amount, charge-turn skipping),
      distinct from `config/moveStatEffects.ts`'s stat-stage table above.
      Raised when the user recalled "several moves change with weather"
      for item 3, but research there turned up no second stat-stage
      example - the user's own guess, confirmed when asked, is that
      they're actually thinking of this different category instead:
      Thunder/Hurricane (70% accuracy normally, always-hits in Rain, 50%
      in Sun), Solar Beam/Solar Blade (need a charge turn normally, fire
      immediately in Sun; half power in Rain/Sand/Snow), Weather Ball
      (type and power both change per active weather), Synthesis/
      Moonlight/Morning Sun (heal 50% normally, 67% in Sun, 25% in Rain/
      Sand/Snow), Blizzard (never misses in Snow). None of this is
      currently modeled anywhere in the Battle Logger - unlike the Calc
      tab, the log doesn't track computed damage/accuracy/heal numbers at
      all today, so this needs its own scoping pass before implementation:
      most likely an informational note/chip shown when logging one of
      these moves while the relevant weather is active (same "manual log,
      not a simulator" pattern as the switch-in ability chips), not an
      attempt to actually compute or auto-apply anything. Worth checking
      for overlap with the already-planned status-condition/move-outcome-
      chips follow-up (see "Battle Logger - beyond the core MVP" above)
      before scoping in detail, since both are about surfacing move
      mechanics the log doesn't currently show.

## Done

See [COMPLETED.md](COMPLETED.md) for the full log of finished work.

## Backlog / ideas (not yet scoped, reordered highest-to-lowest priority)

- **Electron is well behind current** (`^28.0.0`; latest is 43+) - carries
  several high-severity advisories fixed only in newer majors. Bumping is a
  real (if likely modest) migration, not a one-line version bump - worth its
  own dedicated pass rather than doing it blind. Top of this list since
  it's the only item here with a security dimension, even for a
  locally-run desktop app.
- **In-app auto-update (electron-updater + electron-builder GitHub publish)**:
  scoped 2026-07-09, but deliberately **blocked on the user getting an Apple
  Developer account** (planned "eventually, not for a bit") - can't start
  regardless of priority, same category as the Limitless item above. Today's
  update checker (see COMPLETED.md) only links out to the GitHub Release
  page for a manual download/reinstall; this would replace that with an
  actual in-app download-and-install, meaningfully lower friction for the
  project's public-distribution goal.
  - **Mechanism**: `electron-updater` (the standard companion to
    `electron-builder`, already used here for packaging) with its built-in
    GitHub provider - reads `latest.yml`/`latest-mac.yml` metadata files
    that `electron-builder --publish always` auto-generates and uploads as
    GitHub Release assets alongside the installers themselves. No custom
    update server needed.
  - **Why it's blocked**: macOS auto-update (Squirrel.Mac, which
    `electron-updater` uses under the hood) requires the app be
    code-signed, which requires an Apple Developer Program membership
    ($99/yr) plus notarization - without it, unsigned/unnotarized macOS
    builds can't auto-update at all and are also heavily restricted by
    Gatekeeper regardless. Windows is more lenient (auto-update can work
    unsigned), so this is specifically the macOS side gating the whole
    feature, given both the Windows machine and the MacBook are both in
    active use for this project.
  - **Secondary, not a hard blocker**: a paid Windows code-signing cert
    (~$100-400+/yr, separate from the Apple cost) isn't required for
    Windows auto-update to function, but removes the "Windows protected
    your PC" SmartScreen warning unsigned installers trigger - worth
    deciding on separately once the macOS side is unblocked, not bundled
    into the same purchase decision.
  - **Also needed, not yet designed**: signing/notarizing/publishing by
    hand for every release isn't realistic once this is real - almost
    certainly wants a GitHub Actions workflow (build-on-tag-push, secrets
    for the signing certs) rather than a manual `electron-builder --publish`
    run each time. Also needs reconciling with the just-shipped GitHub-
    Releases-API update checker (`useUpdateCheck.ts`/`UpdateCheckSection.tsx`)
    - `electron-updater` has its own update-status/prompt flow, which likely
    supersedes (or needs merging with) today's "check + link out" UI rather
    than the two running side by side unreconciled.
- Two pre-existing `react-hooks/exhaustive-deps` warnings in `useDatabase.ts`
  (lines 54, 260, missing `initializeCacheWithSWR` dependency) surfaced by
  restoring ESLint - not fixed as part of the cleanup pass since the intent
  behind the missing dependency wasn't investigated; worth a look. Cheap to
  investigate once picked up.
- **Dev tooling has also drifted behind current majors** (checked
  2026-07-07 via `npm outdated`): Vite 5.4→8.1, TypeScript 5.9→6.0, ESLint
  9.39→10.6. Lower urgency than the Electron security-advisory situation,
  but same category of "batch these into one dedicated bump pass" rather
  than picking them off individually.
- **`CalcPage`'s lazy chunk just crossed Vite's 500kB build-warning
  threshold** (503kB as of 2026-07-07, was 499kB at the 2026-07-06 cleanup
  pass). Still fine functionally (lazy-loaded, only fetched when the Calc
  tab opens), but worth a look once the Calc compacting pass (second
  review pass items 1-3 above) is done, since that pass is already
  touching the same code. Purely a build-warning threshold, no functional
  impact.
- No app icon set yet for packaging - electron-builder is using the default
  Electron icon. Add `.ico`/`.icns` assets whenever branding is ready -
  cosmetic/branding only, no functional impact.
- **Unseen Fist-through-Protect deep interaction** - our override only
  corrects the tooltip description (25% not 100%); if `@smogon/calc` has its
  own internal logic for this specific interaction, the live calculator may
  still assume the old mainline value. Not chased further - low-frequency
  edge case (needs Unseen Fist + a contact move + the target having used
  Protect that turn). Lowest priority: narrowest, rarest edge case in this
  list.
