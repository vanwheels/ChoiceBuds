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

- **Battle Logger - beyond the core MVP** (see plan at
  `C:\Users\vanny\.claude\plans\recursive-singing-graham.md` for full
  context): field/side-condition tracking is done, battlefield redesign
  Stage 1 is done (see Done below). **Stage 2 is next** (planned in full in
  the plan file, not yet built): replace `ActionEntryBar.tsx`'s dropdown
  entirely with click-mon -> click-move -> click-target logging on the
  `Battlefield.tsx` component; add a `target` field to `MoveData` (PokeAPI
  has it, unparsed today - same story as the move-flags feature); Protect-
  fail prompts only on a Pokemon's 2nd+ consecutive protect-family move in
  a row, never the first; lightweight outcome tags (Missed/Failed/No
  Effect/Blocked by Protect/Blocked by Ability) instead of a rules engine;
  turn-phase categorization (switch -> mega -> move) so the turn log always
  displays in real-game resolution order regardless of tap order; weather/
  terrain source-aware duration confidence (fixed 5 turns if set by a Mega,
  an uncertainty marker if set by a non-Mega ability trigger since a Heat/
  Damp/Icy/Smooth Rock could extend it to 8 and isn't knowable up front).
  Still open beyond Stage 2: Bo3 "set" grouping across games, post-battle
  damage-calc review (step through a logged battle's turns against the
  Calc), and the stat-inference idea (needs Limitless/championsbattledata-
  sourced per-species data first). Also noted but not built: synthesizing
  turn-log entries when a field condition changes (the countdown display
  already shows "set N turns ago" implicitly, so this is a nice-to-have).
- Everything else from the original 9-item roadmap discussion not yet
  built: general UI polish (#1), cross-device sync via file-sync-folder
  (#2), further Calc UI cleanup (#3), Settings page (#4), Limitless usage
  data once the API key is approved (#7), Statistics page (#9, depends on
  the Battle Logger producing real win/loss data).

## Done

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
