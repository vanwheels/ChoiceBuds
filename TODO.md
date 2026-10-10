# ChoiceBuds TODO

Working task list for ongoing/planned work. Every item is titled
`[Item/Sweep Name] — Leg N` (say "Start [title]" to kick off a session on
it). Bodies stay short — commit-message-body length, not an investigation
log; deep cross-checks/history belong in `docs/investigations/<topic>.md`,
linked from the item. `Last touched` + `Re-checks` are tracked per item; no
status enum otherwise — absence of a `Blocked:` line means open. Blocked
items are exempt from the re-check counter and live in their own tier below
rather than mixed into the active list. This file adopted that format as of
2026-08-31 — all re-check counters started at 0 then regardless of how long
an item had been sitting. Reordered into priority order 2026-08-31; within
the current milestone and "Unscheduled", items are listed highest-to-lowest
priority. Only one milestone is "current" at a time — see root `CLAUDE.md`'s
Task Tracking rules for the full section-lifecycle (`## Current Milestone:
<name>` → `MILESTONES.md` + `COMPLETED.md` on ship). Finished work moves to
[COMPLETED.md](COMPLETED.md).

## Current Milestone: Sync & Clipboard Reliability Fixes

- **[Team Notes/Name/Author Don't Resync After Sync Pull] — Leg 1** *(Last
  touched: 2026-10-09 · Re-checks: 0)*
  Done, pending live multi-device verification. Root cause: `TeamCard.tsx`'s
  `localTeamName`/`localAuthor`/`localNotes` only initialized off the `team`
  prop via `useState(...)` on mount, with no resync when `team` changed
  externally - same unguarded-initializer shape `StatsColumn.tsx`'s EVs fix
  addressed (see COMPLETED.md). A sync pull updated `team.notes` on disk and
  in state, but an already-open card's textarea kept showing the pre-sync
  text; the next time that textarea lost focus, its `onBlur` compared the
  stale local value against the now-different `team.notes` and read it as a
  user edit, writing the stale value straight back over the synced one -
  this is why notes looked like they "didn't sync": the pull worked, but got
  silently reverted again moments later. Fixed with the same `prevProp`
  render-time resync pattern already used for this file's `orderedPokemonIds`
  and `StatsColumn.tsx`'s `localEVs`.

- **[Web Clipboard Image Copy Unreliable] — Leg 2** *(Last touched:
  2026-10-09 · Re-checks: 0)*
  Done, pending live verification. Two independent bugs found under the one
  symptom. (1) `handleCopy` awaited `html-to-image`'s async rasterization
  *before* calling `navigator.clipboard.write()` - Chrome tolerates that,
  but Safari/Firefox require the call within the click's transient user-
  activation window. Fixed by passing the pending `Promise<Blob>` straight
  into `ClipboardItem` so `write()` itself is called synchronously. (2) Live
  on Opera GX (Chromium - not the activation-window bug): console showed a
  raw `error` Event off a small `<img>`, traced to `html-to-image`'s
  `embed-images.js` - when a hotlinked image's fetch fails (here, a
  serebii.net item-sprite fallback blocked by Opera GX's built-in ad/tracker
  blocking, see `utils/itemSprite.ts`), `resourceToDataURL` swallows the
  fetch error but falls back to its default empty-string placeholder;
  setting the cloned `<img>`'s `src` to `''` then fires that element's own
  native `error` event, which html-to-image treats as a hard rejection of
  the *entire* render, not just a blank icon. Fixed by passing a real
  `imagePlaceholder` (1x1 transparent PNG data URI) into `toBlob`, so one
  blocked/broken image degrades to a blank icon instead of failing the whole
  export - applies to both Copy and Download, and to any flaky/blocked
  hotlink, not just this one Opera GX case.

- **[Auto-Sync Self-Retriggers After Every Sync] — Leg 3** *(Last touched:
  2026-10-09 · Re-checks: 0)*
  Done, pending live verification. Surfaced from the same console capture as
  Leg 2: a `PUT /sync/:id 429 (Too Many Requests)` on page load, confirmed
  live with only one device/tab signed in (ruling out two sessions racing
  each other). Root cause in `useSync.ts`: the debounced-on-mutation effect
  used a one-shot boolean (`skipNextMutationSyncRef`) to suppress itself for
  the render where `syncNow`'s own `applySyncedState` calls wrote the synced
  result back into `teams`/`battles`/`savedPokemon` state - set once right
  before three concurrent `applySyncedState` calls, on the assumption all
  three land in a single React commit. They don't: each goes through its own
  hook's `enqueueMutation` queue and its own storage-adapter write (separate
  IndexedDB/Electron-IPC calls, independent latency), so they routinely
  commit across 2-3 separate renders. The boolean only swallowed the first of
  those - the next one re-triggered the debounce effect for real, with no
  actual local edit behind it, scheduling a phantom sync 5s later; that
  phantom sync's own response did the same thing again. Closely-spaced
  automatic pushes like this were enough to occasionally trip the Worker's
  own 3-second per-account write throttle even for a single device. Fixed by
  replacing the boolean with a ref holding the exact `teams`/`battles`/
  `savedPokemon` array references the last sync wrote (useTeams.ts's
  `applySyncedState` stores the given `records` array as-is, so this is an
  exact reference, not a guess) - the debounce effect now skips scheduling
  whenever current state still matches that snapshot, regardless of how many
  renders it took to get there.

- **[Mega Sprite Lookup Fetch-Storms on Page Load] — Leg 4** *(Last touched:
  2026-10-09 · Re-checks: 0)*
  Done, pending live verification. Same console capture again: ~15 duplicate
  `GET /pokemon/meowstic-mega 404`s in one page load. The 404 itself is
  expected/harmless (Meowstic's Champions-only Mega Stone has no PokeAPI
  resource yet, exactly what `useMegaSprite.ts`'s own header comment already
  documents) - the bug was purely the duplicate volume. Root cause:
  `fetchMegaSprite`'s dedup only checked `cache.has(apiSlug)`, which blocks a
  *second* fetch once the *first* has already resolved, but does nothing for
  concurrent callers that all check before any of them resolves - the common
  case here, since every `TeamCard` (one per team) independently mounts its
  own `useMegaSpritePrefetch()` call, so on a Teams page with several teams
  they all see an empty cache for the same slug at once and each fire their
  own redundant request. Fixed by adding a module-level `inFlight` map so a
  slug already being fetched hands back the same pending promise instead of
  starting a new request.

- **[PokeAPI 404 for "Leek" Item] — Leg 5** *(Last touched: 2026-10-09 ·
  Re-checks: 0)*
  Done, pending live verification. `GET /item/leek 404` in the same capture.
  PokeAPI kept its original Gen 1-7 resource slug after Gen 8 renamed
  Farfetch'd's held item from "Stick" to "Leek" in English - the data is
  still at `/item/stick`. Same "display name diverges from PokeAPI's own
  slug" shape `services/pokeapi.ts`'s `normalizeSpeciesForAPI` already
  handles for gender-divergent species. Fixed with a small
  `ITEM_SLUG_API_OVERRIDES` map in `pokeapiService.ts`'s `fetchItemData`,
  applied only to the request URL - the cache key and stored `name` field
  stay on "leek" so nothing else downstream (display name, the existing
  fairy-feather special-case) needs to change.

- **[Roster Picker Stores Invalid "-Female"/"-Male" Species Text] — Leg 6**
  *(Last touched: 2026-10-10 · Re-checks: 0)*
  Done, pending live verification. Reported live: exported Showdown text for
  an Indeedee-F read "Indeedee-Female" - invalid for real Showdown, which
  only recognizes this app's own "Indeedee-F" convention - and flagged as a
  likely cause of some Pokémon missing VGC Real Sets data too. Root cause:
  `useSpeciesRoster.ts`'s `toDisplayName` capitalizes PokeAPI's raw resource
  name as-is. For the four species PokeAPI only models as fully separate
  `-male`/`-female` resources (Basculegion/Indeedee/Meowstic/Oinkologne -
  CLAUDE.md's Gender/form handling section), that produced roster rows
  literally named "Indeedee-Male"/"Indeedee-Female", not this app's own
  convention (bare species = male/default, "-F" suffix = female, no "-M"
  form at all - `config/pokemonRules.ts`'s `GENDERED_FORM_VARIANTS`).
  Picking one of these from the "+ Add Pokémon" roster picker (species typed
  in directly, not parsed from pasted text, so `parser.ts`'s
  `getFallbackGender` normalization never runs on it) stored that exact
  invalid string as the Pokémon's species - breaking Showdown re-export, and
  silently breaking `getFallbackGender`/VGC Real Sets matching too, since
  both key off "Indeedee-F", not "Indeedee-Female". This was a species-string
  problem, not a sync/clipboard one, but bundled into this milestone since it
  surfaced in the same session. Fixed with a small override table in
  `toDisplayName` for exactly those 8 known slugs, plus a roster cache-key
  version bump (`v3` -> `v4`) so existing installs' already-cached stale
  roster entries get rebuilt rather than continuing to serve the old invalid
  names indefinitely (that cache never otherwise expires). Added a test case
  covering the mapping. Worth double-checking live whether any already-saved
  team/Box entry has "Indeedee-Female"-shaped species text baked in from
  before this fix - those would need a manual one-time correction, since this
  fix only prevents *new* bad entries, it doesn't repair existing ones.

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

- **[In-App Auto-Update: macOS] — Leg 1** *(Last touched: not recorded ·
  Re-checks: 0)*
  Blocked: user needs a paid Apple Developer account ($99/yr) + notarization.
  Windows shipped in v0.2.1 (see COMPLETED.md). macOS is blocked: Squirrel.Mac
  (what `electron-updater` uses there) requires code signing to auto-update
  at all, and Gatekeeper heavily restricts unsigned builds regardless. Once
  unblocked, `registerAutoUpdater()`'s `process.platform !== 'win32'` guard
  in `main.ts` is the one line to revisit.
  - Separately, a paid Windows code-signing cert (~$100-400+/yr) isn't
    required for Windows auto-update to function, but would remove the
    SmartScreen warning — not yet decided.

- **[TypeScript 7 Upgrade] — Leg 1** *(Last touched: not recorded ·
  Re-checks: 0)*
  Blocked: waiting on real `typescript-eslint` 7.x support.
  `typescript-eslint` doesn't support TypeScript 7.0.2 yet (confirmed
  peer-range rejection + real runtime crash reports). Currently on
  TypeScript ^6.0.3.

## Unscheduled (not yet scoped, highest-to-lowest priority)

- **[Delete Dead useActiveEditor Hook] — Leg 1** *(Last touched: 2026-10-08 ·
  Re-checks: 0)*
  Found during Web Bug Sweep Leg 1's investigation: `useActiveEditor.ts`
  (draft/commit scratchpad for the old modal-based edit flow) is mounted in
  both `App.tsx` and `AppWeb.tsx` and passed into `TeamsPage` as
  `editorState`, but `TeamsPage` never destructures or forwards it to
  anything - Always-On Editing replaced that whole flow with direct
  `onUpdatePokemon`/`updateTeam` calls and nothing was ever wired back up.
  Fully dead code (hook + its test file + the unused prop plumbing) -
  safe to delete outright.

- **[Audit Sibling Hooks for useTeams' Lost-Update Race] — Leg 1** *(Last
  touched: 2026-10-08 · Re-checks: 0)*
  `useTeams.ts` had a lost-update race (fixed, see COMPLETED.md/TODO.md's
  Web Bug Sweep Leg 1) from its mutators rebuilding "next state" off a
  `teams` value closured at render time instead of a synchronously-updated
  ref, with no serialization between concurrent mutations. `useSavedPokemon`,
  `useBattles`, `useSettings`, and `useDatabase` all follow the same
  "closure over state array + persist via storage adapter" shape and
  plausibly share the same race - not fixed proactively here (out of Leg 1's
  scope), but worth auditing each for the same pattern and applying the same
  ref+queue fix where it applies.

- **[UI Shift Assessment Sweep — Post Card UI Polish] — Leg 1** *(Last
  touched: 2026-09-08 · Re-checks: 0)*
  Continue scoping/assessing UI shifts and changes to the rest of the app,
  following on from the UI/UX Overhaul and Card UI Polish milestones (see
  `MILESTONES.md`). Open-ended — needs a pass identifying which
  screens/components haven't had a UI-focused pass yet before it turns
  into concrete legs.

- **[Write Up Web-Transition Playbook for GW2 Squaded Handoff] — Leg 1**
  *(Last touched: 2026-10-08 · Re-checks: 0)*
  Done - see `docs/web-transition-playbook.md`. Covers the storage-adapter
  pattern, the separate `AppWeb.tsx`/`web/` entry point, the GitHub Pages
  deploy, the lost-update-race and stale-local-state-prop-resync bug
  classes this sweep found and fixed, and the decisions ChoiceBuds deferred
  (mobile support, account model, sync shape) that GW2 Squaded should make
  earlier than ChoiceBuds did. Kept as its own TODO item rather than moved
  to COMPLETED.md since it's a standalone reference doc, not tied to a
  commit - revisit/update it if ChoiceBuds' web effort surfaces more
  transferable lessons before GW2 Squaded's web work actually starts.

## Future Milestones (unscheduled)

2026-09-10 feedback pass batched into 4 candidate milestones; Battle Logger
Overhaul, Statistics Improvements, and Team Management QoL were each
promoted to current and have since shipped (see `MILESTONES.md`). Live Calc
Tuning, the last of the four, was promoted 2026-09-11 and later retired in
favor of Regular Calc Popup (see `MILESTONES.md`). VGCPastes real-set
sourcing, deferred out of Regular Calc Popup, was itself promoted to
current 2026-09-14 and shipped 2026-09-15 (see `MILESTONES.md`).

Two fast-follows deferred out of Web Version: Teams & Box MVP's scoping
(2026-09-29, see `docs/investigations/web-version-scope.md`) - not yet
worth their own legs until the MVP milestone ships:
- Password reset flow (needs a transactional email API + SPF/DKIM
  deliverability setup on a dedicated vannyproductions.com subdomain).
- Public profile / team-sharing pages (the account model's username design
  already accommodates this, but the public routes/per-team visibility
  toggle need their own scoping pass). Scope widened 2026-09-29 (Vanny) to
  cover profile search and a shared team database where users can upload
  teams for others to browse in-app, not just per-team visibility toggles -
  needs a privacy-model decision (what's public by default) and abuse/
  moderation considerations for a public upload database before it's ready
  to scope into legs.

Download/landing page for choicebuds.vannyproductions.com (proposed
2026-09-29, out of Web Hosting & Domain's Leg 1): make the new site the
default download entry point instead of sending people straight to the
GitHub Releases page. No universal/self-fetching installer needed - a page
calling `api.github.com/repos/vanwheels/ChoiceBuds/releases/latest` (the
same call `services/github.ts`'s in-app update checker already makes) and
linking to that release's OS-appropriate asset is enough; GitHub Releases
stays the actual file host. Needs its own scoping pass (OS detection UI,
where the page lives relative to the app shell, page design) - not yet
worth a leg on its own.

General web content-area padding gap (flagged 2026-09-30 by Vanny during
live verification of Battle Log & Statistics Parity): `AppWeb.tsx`'s
`<main>` has no padding at all, unlike `App.tsx`'s desktop `<main>`
(2rem/1.5rem inline styles), so ported pages render edge-to-edge in the
browser - visible on the Battle Log page's card grid butting against the
viewport edges. Distinct from the mobile-friendliness pass above (that one's
about touch/breakpoints for phone-sized viewports; this is a plain desktop-
browser layout gap). Not fixed now per Vanny's call to worry about it later
- likely a quick fix (mirror `App.tsx`'s `<main>` padding) whenever a web UI
polish pass happens, but worth confirming it doesn't collide with any
page's own assumption that `<main>` has zero padding first.

Teams tab search bar (proposed 2026-09-29): search for a specific Pokémon
by name and surface which of the user's saved teams include it. Needs its
own scoping pass (exact vs. partial name match, whether it also searches
the Box or is Teams-only, UI placement) - not yet worth a leg.

Battle Logging: special events / Global Challenge (proposed 2026-09-29):
let a logged battle be tagged to a specific event so a user can filter/
view matches for that event specifically. Global Challenge is online,
dated, and officially endorsed by The Pokémon Company, so it's a plausible
source of truth to track. In-person Regionals are also official but (a)
there's no clear source for a complete/reliable schedule to pull from and
(b) players are unlikely to log in-person tournament games in the app
anyway (no external devices allowed at the event), so Regionals may not be
worth pursuing even once scoped. Open question from Vanny that needs a
decision before this can be scoped further: let users freeform-create
their own named events, vs. only tracking a curated list of official ones
(e.g. just GC).

