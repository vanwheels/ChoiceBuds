# Renderer layers

Deep-dive split out of `ARCHITECTURE.md`; the summary there links here.

- `src/renderer/types/` — single source of truth for all data contracts,
  split into four domain files (most call sites import from `types/pokemon`
  regardless of which file actually defines a given type — not worth a mass
  path rewrite): `pokemon.ts` (barrel; also holds the core team/Pokémon-set
  types and re-exports the other three), `battle.ts` (Battle Logger domain —
  UI archived, but `Battle`/`BattlesDatabase` are still live), `settings.ts`
  (persisted app-settings/sync-payload types), `gameData.ts` (cached
  PokeAPI/Champions-usage types).
- `src/renderer/hooks/` — all state lives here; components stay
  presentational. Notable hooks: `useTeams` (CRUD over teams, persists via
  the storage adapter on every mutation), `useDatabase` (PokeAPI species
  cache — entries never expire once cached, see `utils/cacheExpiry.ts`'s
  `NEVER_EXPIRES`), `useGameData` (move/item/ability/learnset/Champions-usage
  cache — everything except `ChampionsUsageEntry` is likewise permanent),
  `useInitialSync` (on launch, diffs the legal species roster against
  `GameDataCache.lastSyncedSpeciesNames` and bulk-syncs whatever's missing;
  gates the app behind a `LoadingScreen` — this plus Champions usage's 5-day
  refresh are the only things that need network after first launch). Editing
  a Pokémon goes straight through `useTeams().updateTeam()` calls from
  `TeamCard.tsx` — there is no separate draft/commit scratchpad hook.
  `usePokemonFormToggle` (keyed by a roster slot's own stable id, not
  species) holds the live "currently Mega-Evolved"/"currently in an
  alternate stat-forme" display override that the team card, team builder,
  and battle logger share (Mega & Alt-Form Toggle State, see TODO.md) — a
  module-level store (subscribed to via `useSyncExternalStore`, same
  session-only-cache shape as `useMegaSprite`'s sprite lookup) rather than
  persisted/synced state, since Mega Evolution and Aegislash's Blade/Shield
  only happen in-battle and are never part of a saved set.
- `useTeams`, `useSavedPokemon`, `useBattles`, and `useSettings` each mirror
  their state into a ref and queue mutations through it rather than closing
  over state captured at render time, so two concurrent `update*` calls in
  the same tick can't silently lose one's write (the second overwriting the
  first's un-rerendered result). `useDatabase` doesn't need this — its one
  write path already uses a functional `setState` update. See
  `docs/investigations/sibling-hooks-lost-update-audit.md` for the audit
  that found/fixed this.
- `src/renderer/services/parser.ts` — pure, offline, regex-based
  Showdown/Pokepaste text parser: `parseShowdownText()` → `ParseResult`
  (`ShowdownPokemon[]` plus parse errors). No API calls, no side effects.
- `src/renderer/services/pokeapi.ts` — all `fetch` calls to
  `https://pokeapi.co/api/v2`. `normalizeSpeciesForAPI()` handles
  gender-divergent species' separate `-male`/`-female` slugs;
  `enrichPokemonWithAPI()` enriches parsed data with API stats/types/sprites
  through the `useDatabase` cache getter/setter.
- `src/renderer/config/` — static lookup tables only (type/move/ability data,
  VGC legality lists, theme maps, Champions balance-patch overrides applied
  at the read boundary in `useGameData.ts`: `championsMoveOverrides.ts`,
  `championsAbilityOverrides.ts`, `championsMovepoolChanges.ts`;
  `missingMoveDescriptions.ts` fills PokeAPI's own description gaps at the
  same read boundary, same pattern, different reason). Those tables apply
  to every regulation; `championsRegulationPatches.ts` holds the dated
  layer, whose entries apply from a tagged regulation onward (so a new
  regulation's balance patch never shows in older teams or calcs). Every
  `useGameData` move/ability/learnset getter and
  `getChampionsCalcMoveOverride` take a required `RegulationId`: the calc
  passes its `regulationId`, team surfaces their `team.format`, and
  surfaces with no regulation (Box, bulk sync) `LATEST_REGULATION_ID`.
  No hardcoded colors
  or species lists belong anywhere else. External-source policy for this
  directory and `services/` lives in `.claude/rules/external-data-sources.md`.
- `src/renderer/components/` — presentational only.
