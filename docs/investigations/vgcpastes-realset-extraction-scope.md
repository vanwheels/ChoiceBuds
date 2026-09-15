# VGCPastes Per-Species Real-Set Extraction — Scoping Session

Scoped 2026-09-15, per `[VGCPastes Per-Species Real-Set Extraction] — Leg 2`'s
own text ("needs its own scoping pass once Leg 1 ships and there's real
sheet-pull plumbing to build on top of" — Leg 1, the Sample Team Catalog,
shipped 2026-09-14; see `COMPLETED.md`). Resolves the two "known needs" the
original `vgcpastes-sourcing-scope.md` scoping session deliberately left
unscoped, plus the decisions raised while resolving them (Vanny's calls, via
`AskUserQuestion`). Scoping-only, no code touched — see
[[feedback_split_scoping_from_building]].

## Finding: species-name normalization is already solved, not a new problem

The TODO item flagged "sheet text like 'Salamence-Mega' → this app's
PokeAPI-normalized slugs" as an open need. Live-checked against the real
sheet (Reg M-C tab, 268 rows) during this session: the species columns
(`VgcPasteTeamRow.species`, sheet columns AL-AQ) are already raw Showdown-
format species tokens — `"Salamence-Mega"`, `"Raichu-Mega-Y"`,
`"Indeedee-F"`, `"Arcanine-Hisui"` — because that section of the sheet is
literally labeled "Pokemon Text for Copypasta" (copy-pasted straight out of
Showdown exports, not hand-typed free text).

That means the exact gender-divergent-species handling the TODO item pointed
at already exists and already produces the right key space:
`championsBattleData.ts`'s `stripGenderSuffix()` (strips this app's own
trailing `-F`, e.g. `Indeedee-F` → `Indeedee`) feeding
`normalizeUsageCacheKey()` (lowercase + trim on top) — the exact key
convention `GameDataCache.usage` already uses. No new normalization function
is needed: matching a sheet species string against a species the user looked
up in Calc is just `normalizeUsageCacheKey(sheetSpeciesText) ===
normalizeUsageCacheKey(calcSpecies)`. Mega/regional-form suffixes are
deliberately *not* stripped, matching the existing usage-cache convention of
keying Mega Salamence separately from base Salamence.

`normalizeSpeciesForAPI` (the PokeAPI-slug normalizer the original TODO text
pointed at) is the wrong tool here — that's for hitting PokeAPI's REST
endpoints specifically, not for building a plain string key alongside
`ChampionsUsageEntry`.

## Decided (via `AskUserQuestion`)

- **Extraction trigger: on-demand per species, not eager bulk-on-refresh.**
  `VgcPasteTeamRow.species` is already loaded in the existing per-regulation
  row cache (`VgcPastesCache`) with no extra fetch, so filtering "which rows
  mention Salamence" is free. Only the matching rows' pokepastes get
  fetched — sequentially/politely, per the CLAUDE.md eighth exception's
  existing "never parallel-blasted" clause — the first time a species is
  looked up in Calc, then persisted so it's never re-fetched. A regulation
  tab can hold 200+ rows; eager bulk extraction on every catalog refresh
  would sequentially fetch hundreds of pastes nobody ends up looking up.
- **Calc panel presentation: a separate "real sets seen" section, not
  blended into the existing usage ranking.** `CalcPokemonPanel.tsx` already
  re-ranks candidates against `ChampionsUsageEntry` (independent per-axis
  move/item/ability/nature percentages — Regular Calc Usage-Data
  Auto-Populate Leg 1). Feeding real co-occurrence into that same ranking
  would re-introduce exactly the "synthesized from independent per-axis
  rankings" problem this leg exists to avoid, and echoes
  `ChampionsUsageEntry`'s own doc-comment precedent (never conflate
  suggested/independent-axis with actually-observed-together). Real sets
  surface as their own pick-one-to-fill-the-panel list instead.
- **Duplicate bundles: dedupe + occurrence count.** Real teams frequently
  repeat an identical build for a popular species (e.g. Incineroar) across
  many source pastes. Store each distinct move/item/ability/nature/EV bundle
  once with a count of how many sampled pastes had it, rather than one row
  per source paste — keeps the cache small and gives the UI a genuine
  "seen in N of M sampled teams" signal, similar in spirit to
  `ChampionsUsageEntry`'s percentages.

## Other findings (no decision needed — existing precedent already answers these)

- **Regulation scoping**: `CalcPage.tsx` already tracks `regulationId`
  (`toRegulationId`/`getRegulationLabel`), so the new cache keys the same
  way `VgcPastesCache` does — `Partial<Record<RegulationLabel, ...>>` per
  species. No new regulation-selection UI needed.
- **Player vs. opponent scoping**: `CalcPokemonPanel.tsx` is the same
  component for both Pokemon 1 and Pokemon 2 (symmetric, not
  player/opponent-exclusive) and already fetches `ChampionsUsageEntry`
  symmetrically for both. Real-set data should surface the same way on
  either panel, not gated to an "opponent" side.
- **Set data source**: reuse `services/pokepaste.ts::fetchPokepaste` (paste
  JSON → raw Showdown text) → `services/parser.ts::parseShowdownText`
  (already pure/sync, already the app's one normalization path for
  move/item/ability/nature/EVs) to get each matching row's parsed
  `ShowdownPokemon[]`, then pull out the entry whose species matches. No new
  parsing logic — only new correlation/bundling on top of the existing
  parser output.

## Resulting legs

Both continue the base item title so `TODO.md`'s per-item Leg-N sequence
stays intact (this scoping session is that item's own Leg 2; see
`COMPLETED.md`'s matching `[VGCPastes Real-Set Sourcing: Scoping] — Leg 1`
precedent for the same shape one level up):

- **[VGCPastes Per-Species Real-Set Extraction: Extraction Pipeline &
  Cache] — Leg 3** — headless plumbing: species-to-row matching, sequential
  polite pokepaste fetch+parse, dedupe+count bundling, new persisted
  `VgcRealSetsCache` (own userData JSON file + IPC handlers, same shape as
  `VgcPastesCache`'s `getVgcPastesCachePath`/`file:read-vgcpastes-cache`
  pair), new `useVgcRealSetsCache`-style hook with a
  get-cached-or-fetch-on-miss getter matching `useGameData.ts`'s
  `getChampionsUsage` shape. No UI. Unit-testable in isolation (the
  matching/dedupe logic is pure).
- **[VGCPastes Per-Species Real-Set Extraction: Calc Panel Real Sets UI] —
  Leg 4** — wires Leg 3's hook into `CalcPokemonPanel.tsx`, adds the
  separate "real sets seen" section with loading/empty/error states and the
  pick-a-bundle-to-fill-the-panel interaction.
