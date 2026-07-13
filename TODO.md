# ChoiceBuds TODO

Working task list for ongoing/planned work. Keep entries short; put rationale
in a `Why:` line only when it's not obvious from the task itself. Finished
work moves to [COMPLETED.md](COMPLETED.md) once done, so this file stays
focused on what's actually next.

## In progress / up next

- **Top priority for next macOS session: build + verify + publish the Mac
  installer** (raised 2026-07-09): Windows now has a real, verified,
  working installer attached to `v0.1.1` (see COMPLETED.md) - macOS is the
  one remaining platform gap before real friend-testing can start on both.
  `electron-builder`'s Mac config (dmg + zip targets) has existed since the
  2026-07-06 packaging pass but has **never actually been built or run** -
  needs a real Mac, which wasn't available until now. Steps: `npm run
  dist:mac`, then actually launch the built `.app` (don't just trust that
  the build commands succeeded - that exact false confidence is what let
  the Windows build ship broken for days, see the "packaging bug" entry in
  COMPLETED.md) and click through the app for real before calling it done.
  Two things worth specifically watching for that don't affect Windows:
  unsigned/unnotarized macOS builds get blocked or heavily warned by
  Gatekeeper by default (no Apple Developer account yet - see the
  in-app-auto-update backlog entry above for the same underlying
  blocker) - may need to walk through right-click-Open or a
  `xattr -cr`-style workaround for friend-testing until that's resolved;
  and confirm the `run-desktop` skill's cross-platform path-resolution fix
  (from the first macOS testing pass, see COMPLETED.md) still correctly
  finds the Mac Electron binary for live UI verification. Once verified,
  publish as a new asset on `v0.1.1` (or cut `v0.1.2` if anything needs
  fixing along the way, same pattern as the Windows installer-bug patch).

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
