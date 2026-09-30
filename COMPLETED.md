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

- **[Web Nav Shell: Adopt Sidebar.tsx] — Leg 1** (2026-09-30) - Replaced
  `AppWeb.tsx`'s hand-rolled 2-button nav with the real `Sidebar.tsx` +
  `App.tsx`'s lazy-load/visited-tabs pattern. Since `Sidebar.tsx` hardcodes
  all 7 desktop tabs internally, every tab now shows in the web nav even
  though only Teams/Box are functionally wired - added a small
  `WebComingSoon.tsx` placeholder for the other 5 (Battle Log, Statistics,
  Type Matchup, Speed Tiers, Settings) rather than let those tabs render
  blank until their own parity legs land. Also added an optional
  `renderFooter` slot to `Sidebar.tsx` (collapse-aware, unused by desktop)
  so web's existing sync-status/sign-in footer - previously part of the
  hand-rolled sidebar - has somewhere to live with no Settings tab wired
  yet to host it. Pure shell/structure change, no new feature surface. See
  commit `ccf4d57`.

- **[Full Web Feature Parity: Scoping] — Leg 1** (2026-09-29) - Surveyed every
  desktop-only tab (Battle Log, Statistics, Type Matchup, Speed Tiers,
  Settings, Calc Popup) for actual `window.electron` dependencies rather than
  assuming each needed its own storage-adapter port. Found Calc/Type
  Matchup/Speed Tiers are already storage-adapter-clean (zero porting cost),
  only `useBattles.ts` needs a real hook port, and Settings needs two small
  `openExternal` fallbacks plus excluding the auto-update section (no web
  equivalent). Also decided to replace `AppWeb.tsx`'s hand-rolled nav with
  the real `Sidebar.tsx` now that the tab list is about to match desktop's.
  Split into 5 build legs - see `TODO.md`'s Current Milestone section and
  [docs/investigations/web-feature-parity-scope.md](docs/investigations/web-feature-parity-scope.md).

- **Vanny's Own Account Migration** (2026-09-29) - Migrated Vanny's real
  local data (17 teams, 31 battles, 8 saved Pokémon in
  `%APPDATA%\choicebuds`) into his new `vanny` account. No code diff - his
  installed app (v0.8.1) predates the accounts system, so the app was built
  from source and launched with the real Electron binary (working around an
  `ELECTRON_RUN_AS_NODE=1` env var leaking from Claude Code's own host
  process into spawned child processes, which had been silently forcing
  `npm run dev`'s Electron child to run as plain Node instead of a real
  Electron app - unrelated to the `vite-plugin-electron`@1.1.0/`vite`@8.1.4
  version mismatch also hit along the way, which independently breaks
  `npm run dev`'s own Electron spawn and still needs a real fix, not done
  here). Surfaced a real KV-consistency race live: a second device
  (Vanny's own browser, freshly signed up with empty local state)
  auto-synced moments after the real push and clobbered it by
  read-modify-writing against a stale pre-push KV snapshot - recovered by
  re-pushing directly against the Worker's `PUT /sync/:username` with the
  browser tab closed. See `TODO.md`'s Existing Account Migration item for
  the workaround and the open follow-up (not yet fixed).

- **[Web Login/Signup UX] — Leg 1** (2026-09-29) - Wired `useSync`'s
  auto-sync into `AppWeb.tsx`, opt-in via a new sidebar "Sign in to sync"
  prompt that opens a dismissible `WebAuthScreen` modal - Teams/Box/the calc
  work fully signed-out on web, same as desktop, per Vanny's Showdown-style
  correction to this leg's first pass (which had wrongly gated the whole app
  behind sign-in; see commit `3da0937`). `useBattles.ts` isn't ported to the
  storage adapter yet and Battle Logger has no web UI, so `useSync`'s
  required battles state is a new stub (`useWebBattlesStub.ts`) that always
  reports zero battles/tombstones - confirmed safe against the Worker's
  merge (`worker/src/merge.ts`), which only overwrites ids it's actually
  given. See commits `1210b69` and `3da0937`.

- **[Web Hosting & Domain] — Leg 1** (2026-09-29) - Deployed the web build
  and wired up `choicebuds.vannyproductions.com`, narrowed to deploy+domain
  only (login/signup UX split into its own `TODO.md` leg after a
  sequencing check-in, since the original leg bundled infra deploy,
  external DNS, and a real code feature). Pivoted from the originally
  planned Cloudflare Pages to GitHub Pages mid-leg: a live
  `wrangler pages deploy` attempt showed Cloudflare's current CLI funnels
  new projects into Workers-with-static-assets rather than classic Pages,
  and Workers Custom Domains require the whole DNS zone to live on
  Cloudflare (confirmed via the real `10082 Can't infer zone from route`
  API error) - too big and risky a change for what this leg needed, since
  `vannyproductions.com`'s zone is on IONOS with live email (MX/SPF/DMARC)
  already. Switched to GitHub Pages instead - the same CNAME-subdomain
  pattern `www.vannyproductions.com` already uses safely against the same
  GitHub account. Added `.github/workflows/deploy-web.yml` (builds
  `dist/web` via `actions/deploy-pages`, mirroring `release.yml`'s style -
  see commit `d27b0cc`); Pages enablement and the custom domain were set
  via `gh api` outside of git. Vanny added the CNAME record at IONOS and
  approved/enforced HTTPS in the repo's Settings > Pages once GitHub's
  cert finished provisioning.
  Dead-end avoided along the way: an initial
  `wrangler pages deploy dist/web --project-name=choicebuds` silently
  created a plain Worker (not a Pages project) that deployed the wrong
  build output (the Electron renderer's `dist/renderer`, not `dist/web`)
  and mutated the root `vite.config.ts`/`package.json` with an unrelated
  Cloudflare Vite plugin - all reverted locally and the stray Worker
  deleted (with explicit approval, since deletion is irreversible) before
  redoing the deploy cleanly.

- **[Web Box Parity] — Leg 1** (2026-09-29) - Wired the real `BoxPage` into
  `AppWeb.tsx`, replacing the "Coming soon" placeholder. No further hook
  porting was needed (`BoxPage`'s own dependencies never touched
  `window.electron`, and every hook state it takes as a prop was already
  ported by the Teams Parity leg above). See commit `d9ed9c3`.

- **[Web Teams Parity] — Leg 1** (2026-09-29) - Wired the real `TeamsPage`
  into `AppWeb.tsx` (import/CRUD/display), replacing the scaffold leg's
  placeholder. Ported the five remaining hooks `TeamsPage` needed
  (`useGameData`, `useSettings`, `useSavedPokemon`, `useVgcPastesCache`,
  `useVgcRealSetsCache`) to `getStorageAdapter()`, adding matching
  `StorageKey`/adapter cases; `useSpeciesRoster`/`useActiveEditor` needed no
  changes (no Electron dependency already). `useSpriteCache` now no-ops on
  web (no filesystem to cache sprites into there) instead of being ported.
  `createPokepaste()` (Showdown export's Pokepaste-link button) resolves
  null on web instead of throwing, since export itself isn't ported this
  leg - ExportTeamModal.tsx's existing error path already covers a null
  result. Confirmed live (curl) that pokepast.es's `/json` read endpoint
  sends `Access-Control-Allow-Origin: *`, so the existing pokepast.es-link
  import path needed no CORS workaround. Also fixed a test-isolation gap
  the adapter port exposed - no hook test file unmounts its `renderHook()`
  instances, so a dangling debounced-write timer from one test used to just
  harmlessly re-fire against its own already-finished test's mock (the old
  code captured `window.electron.writeXCache`'s reference once at render
  time); the adapter re-reads live `window.electron` at call time instead
  (correct for production, where there's only one), so the same dangling
  timer now fires against whichever later test is running when
  `window.electron` gets reassigned, previously observed as
  `useGameData.test.ts` flaking under repeated runs. Added a shared
  `afterEach(cleanup())` to `setupElectronMock.ts` to fix it file-wide.
  Scoped down 2026-09-29 (Vanny, mid-leg): auto-sync (`useSync`) is
  deliberately not wired into `AppWeb.tsx` this leg - it hard-requires
  `useBattles` (unported, Battle Logger has no web UI) and there's no
  sign-up/log-in UI on web yet either (that's Web Hosting & Domain's job);
  wiring it with nothing to trigger it would be premature. See commit
  `7fa9130`. Follow-up fix the same day once Vanny checked it live: the page
  rendered fully unstyled (no crash, so nothing showed in console) - Tailwind
  v4's automatic content-detection bases its scan on the active Vite
  config's own `root`, which for `web/vite.config.ts` is the `web/` folder
  itself, two levels above where every actual component lives
  (`src/renderer/`), so it silently found nothing to generate utility
  classes for. Fixed with an explicit `@source "./";` in `index.css`. See
  commit `43f3385`.

- **[Web App Scaffold: Storage Adapter] — Leg 1** (2026-09-29) - Introduced
  a `StorageAdapter` interface (`src/renderer/services/storage/`) with two
  implementations - `ElectronStorageAdapter` (delegates to the existing
  `window.electron` bridge) and `IndexedDBStorageAdapter` (new, one
  `choicebuds`/`kv` IndexedDB store) - selected lazily by `getStorageAdapter()`
  so Vitest's `window.electron` mock (installed in a `beforeEach`, after
  module import) still resolves correctly. `useTeams`/`useDatabase` now
  persist through it instead of calling `window.electron` directly; every
  other data hook (`useSavedPokemon`, `useGameData`, `useSettings`, etc.)
  is still Electron-only, deferred to the Teams/Box Parity legs. Added a
  second Vite entry at `web/` (shares the root `package.json`, unlike the
  fully standalone `worker/`) with a trimmed `AppWeb.tsx` shell - a
  Teams/Box nav where Teams shows a live team-name list read through the
  adapter and Box is a placeholder, proving the round-trip without building
  out either page's real UI. Plumbing only, per plan. See commit
  `68b2e0a`.

- **[Sync Data Model: Per-Record Merge & Auto Sync] — Leg 1** (2026-09-29) -
  Replaced whole-blob push/pull (safe only because a human picked direction
  by hand) with per-record last-write-wins merge on the Worker, keyed by each
  record's existing `updatedAt` plus a new `SyncTombstone` (id + deletedAt)
  per collection so a merge can tell "deleted on one side" apart from "never
  seen there." Box (`SavedPokemonEntry`) joins sync for the first time.
  `useSync` now runs automatically (sign-in/reconnect, a 5s post-mutation
  debounce, a 5-minute fallback interval) instead of needing a manual
  push/pull button, and moved from `SettingsPage` into `App.tsx` so those
  triggers run from launch. Desktop-only - the Worker isn't deployed live
  yet; see `TODO.md`'s note on this being the coordinated deploy point
  alongside the accounts leg. See commit `8f8fffa`.

- **[Sync Accounts: Username + Password] — Leg 1** (2026-09-29) - Replaced
  the `username#XXXX` shared-secret sync identifier with real username +
  password accounts on the Worker, authenticated per device via a
  server-issued opaque bearer token (not the password itself) so multiple
  devices can stay signed in independently. Fixed the Worker's missing
  `GET` rate limiting by relocating the actual brute-forceable secret: the
  password is now only checked at `POST /login`, which has a real
  failed-attempt lockout, while `GET`/`PUT /sync/:username` require an
  unguessable bearer token. See commit `eb3653c`.

- **[Web Version: Teams & Box MVP: Scoping] — Leg 1** (2026-09-29) -
  Scoping-only, no code change. Reopened a web-version discussion previously
  deferred here and on GW2Squaded; resolved five open forks (Vanny's calls,
  worked through in conversation): local storage stays canonical with sync
  as an automatic background mirror rather than the source of truth; sync
  moves from whole-blob overwrite to per-record last-write-wins (needs
  `updatedAt` timestamps + delete tombstones); the existing `username#XXXX`
  shared-secret identifier is replaced with real username+password accounts
  (no reset flow yet, but an optional email field is collected at signup to
  avoid a later backfill) since Vanny wants public profile pages as a real
  feature and the current identifier is unsafe to display on stream/in
  Settings; the renderer stays one shared codebase with a storage-adapter
  interface (Electron IPC vs. IndexedDB) rather than a forked web app;
  hosting on Cloudflare Pages with a vannyproductions.com subdomain via an
  IONOS CNAME. Also surfaced a live bug while reading `worker/src/index.ts`:
  the sync Worker's `GET` endpoint has no rate limiting, so brute-forcing a
  known username's 4-digit discriminator is ~10k plain requests - folded
  into the accounts leg's scope rather than filed separately since it's the
  same auth surface. Split into 7 legs in `TODO.md`. Full reasoning in
  [docs/investigations/web-version-scope.md](docs/investigations/web-version-scope.md).

- **[Dev Console GPU Overlay Error Noise] — Leg 1** (2026-09-16) - see
  commit `0112f6d`. Added `app.commandLine.appendSwitch('disable-direct-composition')`
  before the existing `disableHardwareAcceleration()` call in `main.ts` to
  skip the DirectComposition video-overlay capability probe that was
  failing (harmlessly) on this machine's GPU/driver combo. Live-verified
  by restarting `npm run dev` - the `GetGpuDriverOverlayInfo` error no
  longer appears.

- **[Team Gap Analysis: Usage Cutoff Tuning] — Leg 1** (2026-09-16) -
  decision, no diff to the cutoff itself (doc-comment update only, see
  commit below). The item's premise was stale: `useUsageSync` has bulk-
  populated real `columnPosition` ladder-usage ranks for every legal-roster
  species since 2026-09-01 (its own Leg 1, a different item - see
  `docs/archive/completed-2026-07-09-to-2026-09-01.md`), it just hadn't
  been checked against. Pulled the live `game-data-cache.json` and found
  253 legal species ranked 2-261 with no unresolved fallbacks. Ranks 2-60
  are nearly gapless (about one species per integer rank), so there's no
  natural cliff at 50 specifically to retune around - the API only exposes
  ordinal rank, not a usage-share percentage, so rank density is the best
  justification available. Kept `USAGE_THREAT_RANK_CUTOFF = 50` as-is;
  `utils/usageThreats.ts`'s doc comment now records the finding instead of
  flagging it unmeasured.

- **[Real Sets: Mega Evolution Species Matching Bug] — Leg 1** (2026-09-16) -
  see commit `e51eef6` and
  [docs/investigations/mega-real-sets-matching-bug.md](docs/investigations/mega-real-sets-matching-bug.md)
  for the original root-cause. Fixed both the surfaced bug (RealSetsButton.tsx
  passing the already-Mega-stripped species into the lookup) and a second,
  deeper instance the investigation hadn't caught: `extractRealSetsForSpecies()`
  re-parses each sampled paste through the same parser that strips Mega
  suffixes, so even the corrected caller couldn't match anything pulled out
  of a fetched paste - live testing (before this fix landed) still returned
  zero bundles for a Mega Salamence lookup despite 113 matching sheet rows,
  which is what surfaced it. Also fixed `CalcPokemonPanel.tsx`'s Mega toggle
  not re-triggering the lookup at all, per the investigation's flagged
  follow-up. Live-verified via `run-desktop` for both Team Builder and Calc.

- **[Calc Stat Rows: SP / Stat Total Toggle] — Leg 1** (2026-09-16) -
  decision, no diff. Killed on revisit rather than scoped: the underlying
  need (see the computed stat total instead of doing base+SP+nature math by
  hand) is already met on both fronts it was compared against - `CalcStatRows.tsx`
  already has an always-visible Total column (base+SP+nature+stage boost,
  no toggle needed), and the actual originating ask was separately built and
  shipped as the Team Builder roster-card toggle below. This item was a
  leftover from that miscommunication (see the `6d9d3ee` revert commit's
  message): the Calc-tab toggle got built first by mistake, was reverted,
  and got re-added to TODO.md as if still a distinct ask, when the Total
  column already covered it. The only gap versus the item's literal wording
  is that Total includes the stage boost where the ask specified
  pre-boost - a narrow edge case (only diverges when a stage boost is
  actually set) judged not worth a dedicated toggle.

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
