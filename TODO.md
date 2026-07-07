# ChoiceBuds TODO

Working task list for ongoing/planned work. Keep entries short; put rationale
in a `Why:` line only when it's not obvious from the task itself.

## In progress / up next

- **Battle Logger - beyond the core MVP** (see plan at
  `C:\Users\vanny\.claude\plans\recursive-singing-graham.md` for full
  context): field/side-condition auto-tracking with turn countdowns
  (Tailwind, screens, weather, hazards), Bo3 "set" grouping across games,
  post-battle damage-calc review (step through a logged battle's turns
  against the Calc), and the stat-inference idea (guess a foe's likely
  nature/EV spread from observed damage ranges instead of manual entry -
  needs Limitless/championsbattledata-sourced per-species data first).
- Everything else from the original 9-item roadmap discussion not yet
  built: general UI polish (#1), cross-device sync via file-sync-folder
  (#2), further Calc UI cleanup (#3), Settings page (#4), Limitless usage
  data once the API key is approved (#7), Statistics page (#9, depends on
  the Battle Logger producing real win/loss data).

## Done

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
