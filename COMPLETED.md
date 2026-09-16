# ChoiceBuds - Completed Work Log

Archive of finished work, split out of `TODO.md` (2026-07-08) to keep the
active task list quick to scan. Newest entries first. Cross-references to
still-open items point to `TODO.md`; references to other entries here stay
local ("see below"/"see above").

Archived at milestone boundaries as of the 2026-09-13 split (Regular Calc
Popup - see `MILESTONES.md`), per CLAUDE.md's archiving rules: a shipped
milestone becomes the real cutoff instead of an arbitrary entry count.
Entries prior to this file's oldest are in:
- [docs/archive/completed-2026-06-17-to-2026-07-09.md](docs/archive/completed-2026-06-17-to-2026-07-09.md)
  (the 50 oldest entries as of the 2026-08-31 split)
- [docs/archive/completed-2026-07-09-to-2026-09-01.md](docs/archive/completed-2026-07-09-to-2026-09-01.md)
  (everything through the Battle Logger Re-eval + Data & Process Cleanup
  milestone, split out at the 2026-09-08 Card UI Polish boundary)
- [docs/archive/completed-2026-09-01-to-2026-09-13.md](docs/archive/completed-2026-09-01-to-2026-09-13.md)
  (Card UI Polish through Regular Calc Popup and everything shipped between
  them, split out at the 2026-09-13 Regular Calc Popup boundary)

- **[Calc Doubles Support] — Leg 1** (2026-09-15) - decision, no diff; see
  `docs/investigations/calc-doubles-support-scope.md`. Flagged 2026-09-14 to
  revisit scoping once VGCPastes Real-Set Sourcing's two legs shipped; the
  revisit killed the item instead of scoping it. A reliable doubles calc
  doesn't widely exist for good reason - it isn't a UI polish problem, it's
  a targeting-model problem: this app's `CalcPage`/`useDamageCalc` are a
  symmetric 1v1 model, and doubles needs 2 attackers × 2 defenders × an ally
  per side, redirection that can send a move to a target you didn't pick,
  per-target/per-category Protect variants, and ally-side state that affects
  damage without the ally ever being the target - none of which reduces to
  "add more fields to today's field state." A narrower slice (just the
  0.75x spread-move reduction as a toggle, no ally/redirection modeling) was
  raised and also passed on - the call was to kill doubles as a feature
  outright, not ship a partial version of it.

- **[Team Builder Stat Display: SP / Base / Real Total Toggle] — Leg 1**
  (2026-09-15) - see commits `1f7bbec`, `7a4b4c7`, `ea6173b`.
  `StatsColumn.tsx`'s stat grid now switches between **SP** (existing 0-32
  editable input), **Base** (species base stat, read-only), and **Real
  Total** (Base + SP + Nature at Lv50, max IVs, no stage boost) via a
  3-segment button row (same pattern as `calc/FormeToggle.tsx`'s forme-family
  toggle) - redone from an initial bare-clickable-"SP"-text cycle version
  after live feedback that nothing signaled it was interactive. Real Total
  is computed via a new lazy-imported `utils/realTotalStats.ts` (mirrors
  `TeamSheetPdfModal.tsx`'s dynamic-`import()` pattern so `@smogon/calc`'s
  runtime `Pokemon` class doesn't enter the main bundle), memoized per-card
  against an input key.

- **[VGCPastes Sample Team Catalog: Search/Filter] — Leg 1** (2026-09-15) -
  see commit `bd976cc`. A single text box filters `VgcPasteCatalogModal.tsx`'s
  row list case-insensitively by species/owner/description, client-side over
  the active tab's already-cached rows.

- **[Team Builder Real Sets Integration] — Leg 2** (2026-09-15) - see commit
  `567b2de`. Built to Leg 1's scoping spec
  (`docs/investigations/team-builder-real-sets-scope.md`): a new
  `RealSetsButton` trigger on each roster `PokemonCard` opens a
  `FloatingCardPanel` hosting `CalcRealSetsSection` (collapse toggle dropped
  via a new `collapsible` prop, since the panel's own open/close is the
  affordance now). Kept out of `EditOverlays`/`EditablePokemonCore` since
  those are shared with the Saved Builds Box, which has no per-entry
  regulation to look real sets up against.
  `useVgcPastesCache`/`useVgcRealSetsCache` now mount once in `TeamsPage.tsx`
  and thread through `TeamCard` to each `PokemonCard`, same shared-instance
  fix Calc's own panels needed. New `realSetBundleToShowdownUpdates` mapper
  (`utils/teamRealSetImport.ts`, with its own test) - a trivial field copy,
  no SP-scale conversion needed.

- **[Team Builder Real Sets Integration: Scoping] — Leg 1** (2026-09-15) -
  Scoping-only, no code change. VGCPastes real-set data was Calc-tab-only;
  this leg resolved the placement/visual-treatment decisions the item's own
  text left open. Investigated `PokemonCard.tsx`'s fixed-width always-
  inline-editing roster card and the fragile card-height tuning behind the
  Blocked Team Card Grid Layout item, then presented three placement options
  (`AskUserQuestion`) - an on-demand floating panel (matching the existing
  item/ability/move picker pattern), an inline collapsed section (matching
  the Calc tab's own Visual Polish leg), or a separate context-menu view.
  Vanny picked the floating panel: zero resting footprint, so it can't
  reopen the grid-layout tuning, and lets the visual treatment reuse
  `CalcRealSetsSection`'s existing bundle-card styling directly instead of
  designing something new. Full reasoning in
  `docs/investigations/team-builder-real-sets-scope.md`. Scoped as
  `[Team Builder Real Sets Integration] — Leg 2` in `TODO.md`.

- **[Calc Real Sets Section: Visual Polish] — Leg 2** (2026-09-15) - see
  commit `a0a8598`. Built to Leg 1's spec below:
  `CalcRealSetsSection.tsx`'s bundle list now sits behind a collapsed-by-
  default toggle in the existing "Real Sets Seen" label row ("Show N" /
  "Hide"), and expanding it wraps the same full-card bundle rows in a
  `max-h-72 overflow-y-auto` container instead of letting the panel grow
  unbounded. No change to card content or click-to-fill behavior.

- **[Calc Real Sets Section: Visual Polish: Scoping] — Leg 1** (2026-09-15) -
  Scoping-only, no code change. `CalcRealSetsSection.tsx` renders every real-
  set bundle as a full-height stacked card with no cap, pushing
  `CalcPokemonPanel.tsx` to grow unbounded for a species with many distinct
  real sets. Presented three options (`AskUserQuestion`) - a scrollable
  capped list, a collapsed-by-default section, a compact chip row like
  `CalcStatSpreadChips.tsx` - plus a combined option; Vanny picked collapsed
  by default with a scrollable/capped list once expanded, since collapsed-
  only still grows unbounded on open and chips would've dropped the existing
  card's per-bundle EV/move detail. Scoped as `[Calc Real Sets Section:
  Visual Polish] — Leg 2` in `TODO.md`.

- **[Calc/Live Calc Tailwind & Terrain-Ability Speed Modeling] — Leg 1**
  (2026-09-15) - see commit `845ee26`. `computeBoostedStats()`/
  `computeEffectiveSpeed()` now take an optional `side: CalcSideConditions`
  param threaded into their `Field` as `attackerSide`, and
  `useDamageCalc.ts`'s two stat-panel call sites now pass
  `field.pokemon1Side`/`pokemon2Side` (mirroring the existing
  `computeSideResults()` pattern), so a Tailwind set's displayed Speed Total
  finally reflects the 2x boost. Terrain was already correctly threaded
  before this leg - only the stale header comment claiming otherwise needed
  correcting.

- **[VGCPastes Per-Species Real-Set Extraction: Calc Panel Real Sets UI] —
  Leg 4** (2026-09-15) - see commit `c7cab0f`. Wires Leg 3's
  `useVgcRealSetsCache` into `CalcPokemonPanel.tsx`: a species pick (or
  Battle Log opponent load) kicks off a real-set lookup rendered as its own
  `CalcRealSetsSection` "real sets seen" list, deliberately separate from the
  existing `ChampionsUsageEntry` ranking. Picking a bundle fills item/
  ability/nature/moves/Stat Points via a new `realSetBundleToCalcUpdates`
  mapper. `useVgcPastesCache`/`useVgcRealSetsCache` are mounted once in
  `CalcPage.tsx` and threaded down to both panels as shared props (avoids a
  persisted-cache write race between two independent instances), while each
  panel's own loading/error UI is tracked locally via a new
  `useCalcRealSetsLookup` hook so the two panels' in-flight fetches can't
  cross-contaminate each other's spinner.

- **[VGCPastes Per-Species Real-Set Extraction: Extraction Pipeline &
  Cache] — Leg 3** (2026-09-15) - see commit `c4d9ca9`. Headless plumbing:
  given a regulation + species, filters the already-cached
  `VgcPasteTeamRow[]` by species, sequentially fetches+parses only the
  matching pokepastes, and dedupes identical move/item/ability/nature/EV
  bundles into an occurrence count, persisted in a new `VgcRealSetsCache`
  (own userData JSON file + IPC handlers) via a new `useVgcRealSetsCache`
  hook. No UI - that's Leg 4.

- **[VGCPastes Per-Species Real-Set Extraction: Scoping] — Leg 2**
  (2026-09-15) - Scoping-only, no code change. Resolved the two "known
  needs" the original sourcing-scope session left open: species-name
  normalization turned out already solved (the sheet's species columns are
  already raw Showdown-format tokens, so the existing
  `normalizeUsageCacheKey()` handles matching with no new code), and the
  set-correlation/storage layer's shape (`AskUserQuestion`, Vanny's calls):
  on-demand per-species extraction rather than eager bulk-on-refresh, a
  separate "real sets seen" Calc panel section rather than blending into
  the existing `ChampionsUsageEntry` ranking, and dedupe-with-occurrence-
  count for repeated bundles. Split into `[VGCPastes Per-Species Real-Set
  Extraction: Extraction Pipeline & Cache] — Leg 3` and `[VGCPastes
  Per-Species Real-Set Extraction: Calc Panel Real Sets UI] — Leg 4` in
  `TODO.md`. Full reasoning in
  `docs/investigations/vgcpastes-realset-extraction-scope.md`.

- **[VGCPastes Sample Team Catalog: Notes Auto-Population] — Leg 4**
  (2026-09-14) - see commit `a8d6f33`. Catalog imports now auto-populate the
  new team's Notes from the sheet's Tournament/Event, Rank, Link to Source,
  Report/Video, and Other Links columns (AE-AI), one non-blank field per
  line via `vgcPastes.ts`'s new `buildCatalogNotes()`. Added the 3
  previously-unparsed columns (AG/AH/AI) to `VgcPasteTeamRow`, verified live
  against the sheet that they hold what their headers claim and that "-" is
  the sheet's own "not filled in" placeholder. Confirmed `Team.notes` is a
  plain `<textarea>`-backed string with no rich-text rendering anywhere in
  the app, so "hyperlinked if possible" resolves to a bare URL as text.

- **[VGCPastes Sample Team Catalog: Import Field Fixes] — Leg 3**
  (2026-09-14) - see commit `ef09182`. Fixed 3 correctness bugs found during
  Leg 1's live verification: `VgcPasteCatalogModal`'s `onPickPaste` now
  hands the whole `VgcPasteTeamRow` to `ImportTeamModal` (new `catalogRow`
  prop, replacing `prefillPokepasteUrl`), so a catalog import uses the row's
  own `description`/`owner` for Team Name/Author instead of the paste's own
  `title` (rental-code suffix) and `author` (always the literal string
  "VGCPastes"), and skips the Review Saved Builds step entirely.

- **[VGCPastes Sample Team Catalog: Row Display Rework] — Leg 2**
  (2026-09-14) - see commits `d96aef9`, `4cb5ff7`, `ed39fdf`, and `532c494`.
  Reworked catalog rows (`VgcPasteCatalogRow.tsx`, split out of
  `VgcPasteCatalogModal.tsx`) from plain description/owner/tournament/rank/
  date text + species-name chips to match `TeamCard.tsx`'s own visual
  format: name/author header + 6 species sprites, plus a per-row expand
  toggle previewing a team's full moves/EV spreads before importing - fetch
  is lazy (on expand-click only, cached per row), decided via
  `AskUserQuestion` over eager-per-row-on-tab-load given a regulation tab
  can hold 200+ rows.
  Live verification immediately surfaced far more empty sprite slots than
  expected - diagnosed live against the real Reg M-C sheet + PokeAPI (see
  `docs/investigations/vgcpastes-catalog-sprite-matching.md`): only 75/119
  unique species strings matched the roster by direct name. Fixed with a
  3-tier resolver (`utils/vgcPasteRowDisplay.ts::resolveCatalogSpriteEntry`)
  - direct match, then a sheet-spelling override or the same
  `normalizeSpeciesForAPI` slug normalization the real import path already
  uses (covers Aegislash/Mimikyu/gender-divergent species/"Maushold-Four"),
  then a Mega-form slug read from the same Mega-sprite cache `TeamCard.tsx`
  warms (with a gender-token strip for "Meowstic-F-Mega") - full 119/119
  coverage once `normalizeSpeciesForAPI` also got its Toxtricity fix (below).
  Real-import bug, not a catalog-only issue: PokeAPI has no bare
  `toxtricity` resource, the same class of gap `normalizeSpeciesForAPI`'s
  `formMappings` table already covered for Aegislash/Mimikyu/Gourgeist/
  Lycanroc/Morpeko/Palafin/Pyroar, just never added for Toxtricity - added
  (`services/pokeapi.ts`), fixing a silent import-enrichment 404 for a
  common VGC pick, independent of the catalog. Added `services/
  pokeapi.test.ts` (previously untested despite backing every enrichment
  fetch) covering the full special-case table.

- **[VGCPastes Sample Team Catalog] — Leg 1** (2026-09-14) - see commit
  `dc903aa`. Browsable "Browse Sample Teams" catalog (Teams page) of real
  tournament teams pulled from the public VGCPastes Google Sheet, filtered
  to rows with a confirmed real EV spread, manually refreshed per regulation
  tab. Picking a row hands its pokepaste link to the existing
  `ImportTeamModal` import path as-is. Column layout
  (`services/vgcPastes.ts`) verified live against all three current-game
  sheet tabs during implementation planning, not guessed. Added the eighth
  CLAUDE.md bulk-ingestion policy exception + README Credits entry in the
  same change. Flagged a search/filter follow-up as scope creep rather than
  building it - see `TODO.md`'s Unscheduled section.

- **[VGCPastes Real-Set Sourcing: Scoping] — Leg 1** (2026-09-14) -
  Scoping-only, no code change. Resolved the four open questions left by
  `vgcpastes-sourcing-feasibility.md` (Vanny's calls, via
  `AskUserQuestion`): sequence the browsable sample-team catalog before
  per-species real-set extraction; refresh via manual pull only, no
  scheduled job; keep only rows flagged `EVs == Yes`. Also drafted the
  proposed eighth CLAUDE.md bulk-ingestion policy exception text for Leg 1
  to apply when it starts. Split into `[VGCPastes Sample Team Catalog] —
  Leg 1` and `[VGCPastes Per-Species Real-Set Extraction] — Leg 2` in
  `TODO.md`. Full reasoning in
  `docs/investigations/vgcpastes-sourcing-scope.md`.
