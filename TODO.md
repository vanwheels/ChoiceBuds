# ChoiceBuds TODO

Working task list for ongoing/planned work. Keep entries short; put rationale
in a `Why:` line only when it's not obvious from the task itself.

## In progress / up next

- **Champions data-correctness audit (part 2)** (started 2026-07-06): the
  balance-patch fix covered what we'd found so far, but our PokeAPI-sourced
  data/calc formulas almost certainly have more Champions-specific gaps we
  haven't checked yet. Breaking this down by who can actually verify what:

  **Resolved (2026-07-06):**
  - Stat Point caps confirmed directly in-game by the user: **max 32 per
    stat, 66 total across all six.** The per-stat 0-32 clamp was already
    correctly enforced in `CalcStatRows.tsx`; added a soft 66-total warning
    there (red text, non-blocking - matches the Calc's existing free-form-
    sandbox philosophy) and updated `useDamageCalc.ts`'s `spToEv` comment
    from "unconfirmed assumption" to confirmed.
  - Movepool changes: the Reddit thread lead (r/stunfisk "Some movepool
    changes in Champions Version 1.1") was processed - user provided
    screenshots directly since automated fetching was blocked. Added to
    `config/championsMovepoolChanges.ts` (renamed from
    `championsMovepoolAdditions.ts` since it now handles removals too):
    Sceptile/Scolipede/Pyroar/Barbaracle gaining moves, Scolipede/
    Annihilape/Grimmsnarl/Scrafty/Overqwil/Metagross/Pyroar/Staraptor/
    Mawile/Malamar losing moves. One entry (Grimmsnarl "loses False
    Surrender") was left out - not a recognized move in any known game,
    likely a post error, not encoded without corroboration. The community
    spreadsheet lead is still unprocessed (see below).

  **Still needs the user (in-game access, or the spreadsheet lead):**
  - Anything noticed live during play that doesn't match what the app
    shows - exactly how the Make It Rain gap was originally caught.
  - The community Google Sheet of full Champions movepools (still
    unprocessed - not a diff, needs manual cross-referencing against
    PokeAPI's mainline data per species):
    https://docs.google.com/spreadsheets/d/1DeXjzohTUdKNERu6dsHsnznneva8MDJjglI3lqDLgm4

  **Self-serve (research only, no game access needed)** - Claude can pick
  these up directly:
  - Item mechanics - only the item *list* has been checked so far (which
    items exist), never whether any existing item's actual behavior
    differs in Champions (Life Orb recoil %, Choice item locking, etc.)
  - Whether the ability-changes list (currently just Healer + Unseen Fist)
    is actually exhaustive, or just what's been noticed/documented so far
  - Core formula pieces not yet double-checked: crit-hit mechanics, the
    type effectiveness chart itself (the "extremely/mostly ineffective"
    4x/0.25x labeling change is presentation-only and already fine, but the
    underlying chart wasn't independently re-verified)
  - Patch notes going forward - v1.0.3/v1.1.0 were bugfixes/new-Pokemon
    only, no further move rebalancing, but this needs periodic re-checking
    since the game is clearly still being patched (Serebii's
    `pokemonchampions/patch.shtml`)

- **Move flag tags (Sound/Bullet/etc.)** - Champions added visible tags on
  moves (e.g. `[Sound]`, `[Bullet]`) so their interactions with abilities
  like Soundproof/Bulletproof/Overcoat are clear at a glance. Our `MoveData`
  type doesn't store move flags at all right now - nothing needed them
  before. Rough shape: add a `flags` field to `MoveData`, populate it from
  PokeAPI's move response in `fetchMoveData` (PokeAPI already returns this,
  just never parsed), a small config for which flags Champions actually
  surfaces (confirm exactly which ones in-game), and a small badge/tag UI
  on move displays.

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
