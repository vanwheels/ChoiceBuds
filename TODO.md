# ChoiceBuds TODO

Working task list for ongoing/planned work. Keep entries short; put rationale
in a `Why:` line only when it's not obvious from the task itself. Finished
work moves to [COMPLETED.md](COMPLETED.md) once done, so this file stays
focused on what's actually next.

## In progress / up next

- ~~**2026-07-20 manual-testing batch**~~ **Done 2026-07-20** - all 6 items
  (move/ability usage-% ordering in the team editor, Calc tab-switch state
  loss, Make It Rain's missing stat drop, Battle Logger sleep wake-up/
  counter, the post-faint switch-in turn-timing bug, and the Calc Mega
  toggle not updating abilities) - see COMPLETED.md for the full
  implementation + live-verification trail on each.

- ~~Team edit mode: drag-to-reorder the 4 moves within a Pokemon's
  moveset~~ **Done 2026-07-19** - see COMPLETED.md.

- ~~PokeAPI now has a real `champions` version group - dedicated pass to map
  out how much hand-maintained config it could replace~~ **Investigated
  2026-07-19, resolved as "keep both layers, PokeAPI data can't fully
  replace either."** Full findings (queried live, not guessed):
  - **Species legality**: the `champions` pokedex (`/api/v2/pokedex/36`, 208
    entries) is a **perfect 1:1 match** with the combined REG-MA + REG-MB
    base-species set in `utils/pokemonRules.ts` - zero species missing
    either direction. Strong live validation that the Serebii-sourced
    allowlist is accurate. But the pokedex only models base species, not
    regulation history (M-A vs M-B split) or per-variety legality (regional
    forms, gender-locked movesets, Palafin Zero-only, Aegislash
    Blade/Shield) - so it can confirm the hand list, not replace it; the app
    needs granularity PokeAPI's pokedex doesn't carry.
  - **Move-learnability (`champions`-tagged moves)**: real per-species data,
    but coverage is incomplete in a very specific, explicable way - checked
    all 231 legal species/varieties live, 208 (90%) have at least one
    `champions`-tagged move, and the 23 with zero are **exactly the 22
    Regulation M-B-added species plus Floette**. PokeAPI's tagging clearly
    lags the newest regulation's additions specifically - confirms
    `championsMovepoolChanges.ts`'s hand table still earns its keep, most of
    all for M-B's new species, on top of the narrow-fix fallback already
    live in `pokeapiService.ts`.
  - **Sharpedo/Thief conflict, resolved same day**: spot-checked Sharpedo
    (which PokeAPI does tag) - its `champions` move list still includes
    `thief`, but `championsMovepoolChanges.ts`'s
    `CHAMPIONS_MOVEPOOL_REMOVALS.sharpedo` (RoiDadadou-spreadsheet-sourced)
    said Champions removed Thief from Sharpedo. User confirmed in-game:
    Sharpedo does have Thief - PokeAPI was right, the spreadsheet was wrong.
    User's call: trust PokeAPI over the spreadsheet wherever PokeAPI has
    live `champions`-tag coverage; the spreadsheet was only ever load-bearing
    for the gap PokeAPI hasn't back-filled (Reg M-B's new species). Acted on
    immediately (same day, see below) rather than left open: `useGameData.ts`
    now only applies `championsMovepoolChanges.ts`'s corrections when
    `SpeciesLearnsetEntry.hasChampionsMoveData` is false (a new field set by
    `fetchSpeciesLearnset`), and the file itself was pruned from ~208
    species down to exactly the 22 Reg M-B species + Floette found above -
    unreachable entries for PokeAPI-covered species were deleted outright
    rather than left as dead weight/a future footgun. Also separately found
    Sharpedo's PokeAPI move data has zero `scarlet-violet`-tagged moves (an
    unrelated PokeAPI data gap, doesn't affect the above). Live-verified
    post-fix: Sharpedo/Mimikyu now trust PokeAPI directly (Thief present,
    hand table not consulted); Gholdengo/Pyroar still correctly get the hand
    table's corrections (Gholdengo gains Surf/loses Thunder Wave, Pyroar
    gains Iron Tail/Payback/Scorching Sands and loses Work Up) since PokeAPI
    still has no `champions` tag data for either. Old 30-day-cached learnset
    entries predating the new field are treated as a cache miss (same
    pattern as `getCachedMove`'s `target`/`meta` self-heal) so this takes
    effect on next fetch rather than waiting out the cache TTL. Revisit
    `championsMovepoolChanges.ts` (or delete it outright) once PokeAPI
    back-fills `champions` tags for these 23 species too - the live coverage
    check from this pass is easy to re-run to find out.
  - **Real bug found as a side effect, fixed same day**: auditing
    `normalizeSpeciesForAPI` (`services/pokeapi.ts`) for this pass surfaced
    that Gourgeist, Lycanroc, Maushold, **Mimikyu**, Morpeko, and Pyroar all
    have no bare PokeAPI `/pokemon/` slug (only their default-variety forme,
    e.g. `mimikyu-disguised`) - same class of gap as the already-handled
    Aegislash/Palafin cases, just never caught for these six. Confirmed live
    404s before the fix. Since Showdown/pokepast.es exports these by bare
    name for their default forme, this was a real, silent import-enrichment
    failure - notably for Mimikyu, an extremely common VGC pick. Also fixed
    the 3 Paldean Tauros breeds' non-"-breed" spelling
    (`tauros-paldea-combat` etc., the form `@smogon/calc` uses) the same
    way. All 9 added to `normalizeSpeciesForAPI`'s `formMappings`.

- **2026-07-19 manual-testing batch** (scoped out 2026-07-19 against the
  actual code; items 1, 3, 4, 6, 8 are done - see COMPLETED.md for the full
  implementation + live-verification trail. Remaining, not yet
  implemented:)
  2. ~~Offline support~~ **Done 2026-07-19** - see COMPLETED.md. Initial
     plan (a build-time-bundled installer snapshot) was rejected by the
     user in favor of what actually shipped: one comprehensive **live**
     sync on first launch, then zero network needed for anything except
     (a) syncing newly-legal species from a future regulation update and
     (b) Champions usage data's existing 5-day refresh. Covers item 7
     below too (same root cause).
  5. ~~Calc auto-fill from usage data, then export to Saved Sets~~ **Done
     2026-07-19** - see COMPLETED.md.
  7. ~~Battle Logger's move list and enemy-species picker feel slow~~
     **Done 2026-07-19** - same root cause as item 2, resolved by that
     item's fix (see COMPLETED.md).
  9. ~~New feature: standalone type-matchup calculator~~ **Done
     2026-07-19** - see COMPLETED.md. Rebuilt same-day into a team-driven
     Offensive/Defensive Coverage view (vgcmulticalc.com-style, per user
     request) - also see COMPLETED.md. ~~Open follow-up: type-changing
     abilities~~ **Done 2026-07-19** - see COMPLETED.md.

- ~~Newly discovered bug: Palafin can't be added as a Battle Logger opponent
  at all~~ **Fixed 2026-07-19** - see COMPLETED.md's "2026-07-19
  manual-testing batch, quick-wins pass" entry (item 4: PokeAPI only
  exposes `palafin-zero`/`palafin-hero`, no bare `palafin`; the legal
  species list now uses `palafin-zero`).

- **Battle Logger: Miss/Crit/No Effect/Blocked outcome UX redesign** (raised
  2026-07-16, 3-part plan, tackling in order):
  1. **Done (2026-07-16)** - moved the outcome-confirmation chips from
     persistent per-slot buttons on the target's own BattlefieldSlot (easy
     to lose track of - see COMPLETED.md's "generic No Effect/Blocked
     (Ability) outcome chips" entry from earlier the same day) into a new
     inline `MoveOutcomePrompt` shown immediately after logging any move
     with at least one target, supporting multi-target/spread moves
     (Rock Slide, Earthquake, etc.) with one independently-toggleable row
     per target. See COMPLETED.md for the implementation trail.
  2. **Done (2026-07-16)** - ability-based blocking: a researched
     move-blocking-ability table (`config/moveBlockingAbilities.ts`) plus an
     unrevealed-ability picker in `MoveOutcomePrompt.tsx` that reveals the
     ability and sets the outcome to Blocked in one atomic action. See
     COMPLETED.md for the implementation trail, the deliberately-excluded
     ability categories, and a pre-existing (not introduced by this change)
     stat-drop/auto-apply-ordering gap surfaced while live-testing it.
  3. **Done (2026-07-16)** - multi-hit move logging (Population Bomb,
     Triple Axel, Bullet Seed, etc.). See COMPLETED.md.

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
  (see COMPLETED.md). Post-battle damage-calc review and Bo3 "set" grouping
  across games are also done (both 2026-07-13, see COMPLETED.md). Still
  open: the stat-inference idea. Data source unblocked and Phase 1 (of a
  3-phase plan) shipped 2026-07-16 - see COMPLETED.md for the full
  implementation trail. Phase 2 (Item/Moves/Nature/Stat Points sections in
  the same popover, beyond Phase 1's Ability-only slice) also shipped
  2026-07-16, see COMPLETED.md. Phase 3's loading-state treatment and wider
  empirical species coverage (2 of its 3 polish items) are also done, see
  COMPLETED.md - by explicit user choice, tackled one item at a time rather
  than all three together. TTL tuning (the 3rd polish item) is also done
  2026-07-20, see COMPLETED.md - Phase 3 is now fully complete. Calc-page integration
  (the planned fast-follow reusing the same data layer) is done, see
  above's "2026-07-19 manual-testing batch" item 5 and COMPLETED.md.
  Explicitly out of scope for now: the
  `teammate` usage category, and adding `nature`/`evs` fields to
  `OpponentPokemonEntry`. Synthesizing turn-log entries when a
  field condition changes is done (2026-07-15, see COMPLETED.md). Generic
  lightweight per-target outcome tags (No Effect/Blocked (Ability), added
  alongside the existing Miss/Crit chips) are done (2026-07-16, see
  COMPLETED.md). Download's ability effect
  (deliberately excluded from the switch-in effects table - its target
  stat depends on comparing the opposing side's average Def/SpDef, needs
  base-stat math not taken on yet).

- Everything else from the original 9-item roadmap discussion not yet
  built, reordered by priority: Statistics page (#9) done, Settings page
  (#4) shell + default-regulation setting done, cross-device sync (#2) code
  done - see COMPLETED.md; further Calc UI cleanup (#3) - overlaps with
  Calc work already in flight elsewhere in this file; general UI polish
  (#1) - the Teams/Battle Log list-row redesign (2026-07-14, see
  COMPLETED.md) is the first concrete scoping of this; the team-notes UI and
  team image export (2026-07-15, see COMPLETED.md) are the second - still
  open beyond that: nothing else scoped yet; Limitless usage data (#7) - blocked
  externally on API key approval, can't start regardless of priority.

- **Season-level breakdowns (Statistics page)**: a "By Season" breakdown
  panel is done (2026-07-13, see COMPLETED.md) - derives each battle's
  season from its existing `date` timestamp against a new static
  `config/seasons.ts` table, no schema change/migration needed. The
  page-wide season filter is also done (2026-07-15, see COMPLETED.md). The
  related "Check for Updates" reminder tool below is done too, see
  COMPLETED.md. Nothing left open on this thread.
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
    ~2026-08-05. This table is now hand-authored into `config/seasons.ts`
    (not fetched live at runtime, per usual) - will need a manual update
    (plus adding M-6+) once real M-5 dates are announced. Sources checked:
    Bulbapedia's "Ranked Battles Seasons in Pokémon Champions" and
    "Regulation Set M-B" pages, Serebii's `rankedbattle/regulationm-a.shtml`
    and `regulationm-b.shtml` pages - full URLs in the
    `reg_mb_season_timeline` memory note.
  - **"Check for Updates" reminder tool - done (2026-07-15)**, see
    COMPLETED.md. Same pattern could generalize to the other hand-authored
    Champions balance-patch config
    (`championsMoveOverrides.ts`/`championsAbilityOverrides.ts`/etc.) if
    useful later - not built, season/regulation data was the concrete
    driver for the first pass.

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
  1. Calc page: tighten overall spacing so more fits without scrolling -
     a further tightening pass done 2026-07-14 (see COMPLETED.md), on top
     of the earlier partial pass (924px scrollHeight at the 1280x720
     minimum, down from 1102px). Now at 864px - real, safe progress, but
     the minimum window size still scrolls a bit (~209px short of fully
     eliminating it). Stopped there deliberately per the user's own call
     rather than pushing into riskier territory (shrinking padding to the
     point of hurting legibility/click comfort, or reversing the
     `CalcSideConditions.tsx` one-row-per-condition layout decision) -
     revisit if further tightening is wanted later. At 1920x1080 the page
     already fits with room to spare, unaffected by this note.
  3. Calc page (`CalcSideConditions.tsx`) field-effect toggle trim is done.
     The `CalcSideConditions.tsx`/`SideConditionsRow.tsx` unification
     follow-up was investigated 2026-07-13 and dropped - see COMPLETED.md.
  4. Battle Logger: opponent roster boxes were reported visually bigger
     than the player's - the specific layout idea (move `FieldWeatherBar`
     to its own row, stack `SideConditionsRow.tsx` vertically) is done,
     see COMPLETED.md. The remaining per-row *height* gap (500px vs 608px
     column height) - same gap acknowledged again in the third review
     pass's item 5 below - is now fixed too, see COMPLETED.md
     (2026-07-13).

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
     see COMPLETED.md. The whole-column height gap is also now fixed - see
     the second review pass's item 4 above and COMPLETED.md (2026-07-13).
  8. Team export to Showdown text format is done, see COMPLETED.md.
     Stretch goal still open, explicitly flagged by the user as uncertain:
     exporting *to* Pokepaste (creating a new paste via their write API,
     not just formatting local text) - unconfirmed whether pokepast.es
     exposes a usable public write API, needs research before scoping.
     Writing to an external third-party service is new territory for this
     project's external-integration rules, not something to bolt on
     silently.
  10. Teams page (`TeamCard.tsx`) Pokemon-card drag-to-reorder is done
      (2026-07-13), see COMPLETED.md.
  11. Teams page (`TeamsPage.tsx`) drag-to-reorder the teams list is done
      (2026-07-13), see COMPLETED.md.
  12. Calc page bulk-import + saved individual Pokemon sets is done
      (2026-07-13), see COMPLETED.md.
  13. Battle Logger weather move-effects notes (Thunder/Hurricane/Solar
      Beam/Solar Blade/Weather Ball/Synthesis-family/Blizzard) are done
      (2026-07-13), see COMPLETED.md.

## Done

See [COMPLETED.md](COMPLETED.md) for the full log of finished work.

## Backlog / ideas (not yet scoped, reordered highest-to-lowest priority)

- ~~VGC Team Sheet PDF auto-fill~~ **Done 2026-07-16** - see COMPLETED.md.



- ~~Electron is well behind current~~ **Done 2026-07-13** - bumped
  `^28.0.0` → `^43.0.0` (see COMPLETED.md). Dev tooling (Vite/TypeScript/
  ESLint) is still behind and intentionally deferred as a separate pass -
  see below.
- ~~In-app auto-update~~ **Windows done 2026-07-16, shipping in v0.2.1** -
  `electron-updater` wired into `main.ts` (packaged + `win32` only, gated
  explicitly rather than relying solely on electron-updater's own
  `app.isPackaged` guard), with `build.publish` (GitHub provider) added to
  `package.json` so `latest.yml`/`.blockmap` get generated on build - these
  now need uploading as release assets alongside the installers on every
  release going forward, not just the `.exe` files. Layered on top of (not
  replacing) the existing GitHub-Releases-API check
  (`useUpdateCheck.ts`/`UpdateCheckSection.tsx`) per explicit user call: the
  old "Update available: X, View Release" link-out stays as the fallback
  for every case electron-updater can't cover (dev mode, the portable exe,
  macOS before it's signed), while a real download-progress ->
  "Restart & Update" flow appears only for a packaged Windows NSIS install.
  **Still open:**
  - **macOS is still blocked** on the user getting a paid Apple Developer
    account ($99/yr) + notarization - Squirrel.Mac (what `electron-updater`
    uses under the hood on macOS) requires code signing to auto-update at
    all, and Gatekeeper heavily restricts unsigned builds regardless. Once
    unblocked, `registerAutoUpdater()`'s `process.platform !== 'win32'`
    guard in `main.ts` is the one line to revisit.
  - **Bootstrapping gap**: no release before v0.2.1 has this code, so
    nothing can auto-update *into* v0.2.1 - the first real end-to-end test
    of the full download-and-restart-install flow can only happen on the
    release *after* this one, once a v0.2.1 install can check against it.
  - A paid Windows code-signing cert (~$100-400+/yr) still isn't required
    for Windows auto-update to function, but would remove the "Windows
    protected your PC" SmartScreen warning - separate purchase decision,
    not bundled into this pass.
  - ~~Signing/notarizing/publishing by hand for every release still isn't
    automated~~ **Done 2026-07-16, verified live**:
    `.github/workflows/release.yml` builds on `windows-latest`/
    `macos-latest` on any `v*.*.*` tag push and runs `electron-builder
    --publish always`, which attaches installers (plus `latest.yml`/
    `.blockmap` for the Windows NSIS target) to a **draft** GitHub Release
    rather than publishing it live - matches this project's existing
    "always confirm before publishing a Release" rule, since a human still
    has to review and flip it to non-draft by hand (`gh release edit
    --draft=false` or the UI). No signing secrets are configured yet (no
    Windows cert, no Apple Developer account), so output is unsigned, same
    as today's manual builds. **Verified with a throwaway `v0.2.1-test1`
    tag push** (both jobs succeeded, ~2min build time each; tag deleted
    afterward, no lingering artifacts) - and it surfaced a real gotcha
    worth knowing: electron-builder resolves the release to attach to by
    `package.json`'s `version` field, *not* the pushed git tag, so the test
    correctly targeted the already-published `v0.2.1` release rather than
    creating a new one under the test tag. electron-builder's own safety
    check (`existing type not compatible with publishing type`) refused to
    touch that live non-draft release and skipped every upload rather than
    corrupting it - confirms the automation is safe to leave wired up
    permanently, but also means **the release process's step order
    changed**: the version tag must be pushed *before* `gh release create`/
    `gh release edit` ever touches that version, otherwise the workflow's
    own build finds a same-tag release already in the wrong state and
    no-ops. See the updated `CLAUDE.md` "GitHub Releases" bullet for the
    corrected sequencing (tag push -> workflow builds a draft -> `gh
    release edit` fills in title/notes -> `gh release edit --draft=false`
    once confirmed). Not yet exercised on an actual *fresh* version
    (nothing has been released since this landed) - the throwaway-tag test
    proved the safety behavior but not the "creates a brand-new draft from
    scratch" path; that'll get real coverage the next time a version is
    genuinely cut.
- ~~Dev tooling has also drifted behind current majors~~ **Done 2026-07-14**
  - bumped Vite `^5.0.0`→`^8.1.4`, `@vitejs/plugin-react` `^4.7.0`→`^5.2.0`,
  ESLint `^9.39.4`→`^10.7.0` (+`@eslint/js`, `typescript-eslint`, `globals`,
  `eslint-plugin-react-hooks` `^5.2.0`→`^7.1.1`), TypeScript `^5.3.0`→
  `^6.0.3` (see COMPLETED.md). **TypeScript 7.0.2 (the actual current
  `latest`) is explicitly not used** - typescript-eslint doesn't support it
  yet (confirmed peer-range rejection + real runtime crash reports); revisit
  once typescript-eslint ships real 7.x support. Also cleared the
  pre-existing esbuild/vite `npm audit` advisories noted during the Electron
  bump. Two new stricter `eslint-plugin-react-hooks` rules
  (`set-state-in-effect`, `immutability`) were disabled rather than
  fixed - see the next item.
- ~~Follow-up from the dev-tooling bump~~ **Mostly done 2026-07-14** (see
  COMPLETED.md) - re-enabling both disabled rules to actually fix them
  properly revealed the real scope was **13 files**, not the ~4 originally
  scoped (re-ordering the `immutability` hoisting fixes unlocked
  `set-state-in-effect` detection inside the same functions, surfacing
  hooks nobody had flagged yet: `useBattles.ts`, `useDamageCalc.ts`,
  `useDatabase.ts`, `useInitialSync.ts`, `useMegaSprite.ts`). Fixed for
  real: the `immutability` hoisting order in all 4 load-on-mount hooks
  (`useTeams.ts`/`useSettings.ts`/`useSavedPokemon.ts`/`useBattles.ts`), and
  the 7 "reset derived state when a dependency changes" `set-state-in-effect`
  cases (`EditOverlays.tsx` x2, `OpponentRowFields.tsx`, `CalcAutocomplete.tsx`,
  `useDamageCalc.ts` x2, `useMegaSprite.ts`, `usePokemonTypeFilter.ts`,
  `useInitialSync.ts` - the last one restructured to derive `isDone`
  directly instead of needing an effect for that branch at all). Still
  deliberately disabled (per explicit user call, not silently dropped):
  `set-state-in-effect` on `useTeams.ts`/`useSettings.ts`/
  `useSavedPokemon.ts`/`useBattles.ts`/`useDatabase.ts`'s shared
  load-on-mount-and-reused-by-refresh idiom, plus `useSync.ts`'s
  `refreshStatus` (same shape) - a real fix needs splitting each into an
  effect-safe silent variant and a refresh variant, a bigger, riskier
  change to the core data-loading pattern of nearly every hook in the app
  than fits a routine cleanup pass. Revisit as its own dedicated task if
  wanted.
- ~~`CalcPage`'s lazy chunk just crossed Vite's 500kB build-warning
  threshold~~ **Done 2026-07-14** - investigated a real code-split first
  (checked whether `@smogon/calc` exposes any subpath/generation-specific
  export to tree-shake by; it doesn't - no `exports` map, all data bundled
  monolithically with no way to import just Gen 9 tables), concluded the
  507kB is inherent to the dependency and already appropriately
  lazy-loaded, so raised `vite.config.ts`'s `chunkSizeWarningLimit` to 550
  instead of chasing an impractical split (see COMPLETED.md).
- ~~No app icon set yet for packaging~~ **Done 2026-07-15** - user supplied
  `build/icon.png` (1024x1024, transparent, well-centered mascot art);
  electron-builder auto-generates the platform `.ico`/`.icns` from it via
  the default `directories.buildResources` (`build/`) convention, no
  `package.json` changes needed. **Not yet verified**: a real
  `npm run dist:win` packaging build to confirm the icon actually renders
  correctly on a built installer/exe - three attempts all failed at an
  unrelated environmental step (`EPERM` renaming the freshly-extracted
  Electron binary folder), reproducing identically with Defender disabled
  and even fully elevated, and Windows Search indexing confirmed not
  scoped to the D:\ drive at all - so the cause is still unidentified
  (likely some other background process/tool watching the project
  folder, or a genuine electron-builder extraction race). Revisit
  whenever the next real Windows release build happens (see the Mac
  installer entry above) - possibly worth trying from a different machine
  or after a reboot.
- ~~`game-data-cache.json` concurrent-write race~~ **Fixed 2026-07-15** -
  see COMPLETED.md.
- ~~Unseen Fist-through-Protect deep interaction~~ **Investigated and
  closed 2026-07-14** - read `@smogon/calc`'s compiled source directly
  rather than guessing: "Unseen Fist" appears exactly once in the whole
  package (the static ability-name list used for the autocomplete picker)
  and is never checked via `hasAbility()` anywhere in its damage
  mechanics, unlike abilities the library actually models (e.g. Parental
  Bond, checked in ~5 places). The library simply doesn't implement this
  ability's Protect-bypass behavior at all - so there's no hidden internal
  logic assuming the old 100% value to conflict with our tooltip
  correction. The feared "deep interaction" bug doesn't exist; no code
  change was needed. See COMPLETED.md.
