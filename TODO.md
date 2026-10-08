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

## Current Milestone: Web Client Bug Fix Sweep

Reported by Vanny 2026-10-08 from personal use of the web client. Legs 1
and 2 turned out to share one root cause (a lost-update race in
`useTeams.ts`'s mutators) — fixed and user-verified, see `COMPLETED.md`.
Leg 4 was confirmed to be a *separate* root cause (stale local component
state, not a persistence race) and has since been fixed and live-verified
on desktop — see `COMPLETED.md`. Leg 6 intentionally holds the milestone
open for a second bug-finding pass; don't close the milestone until that's
done.

- **[Web Bug Sweep: Second Pass Before Closing] — Leg 6** *(Last touched:
  2026-10-08 · Re-checks: 0)*
  Vanny flagged there may be more web-client bugs from personal use not yet
  written down. First batch of findings came in 2026-10-08, now filed as
  Legs 7-12 below. Still don't close the milestone until those are fixed
  *and* Legs 1-5 are re-verified — this item stays open as the catch-all for
  any further findings from continued use.

- **[Web Bug Sweep: Team Drag-Reorder Reverts After a Few Seconds] — Leg 7**
  *(Last touched: 2026-10-08 · Re-checks: 0)*
  Dragging a team to a new position in the list snaps back to its old spot
  a couple seconds later. `useTeams.ts`'s `setTeamOrder` already goes
  through the same ref+queue serialized-mutation fix Leg 1 (of the prior
  sweep) added, so this likely isn't that same lost-update race recurring —
  more likely something re-derives `TeamsPage.tsx`'s `orderedTeamIds` from
  a stale `sortedTeams` after the write round-trips (its "adjust state
  during render" sync at lines ~120-126 resets `orderedTeamIds` any time
  `sortedTeamIdsKey` changes). Needs investigation to confirm before
  fixing. Likely entangled with Leg 8 below (making regulation the primary
  sort key changes what "the list's order" even means) - resolve Leg 8's
  design first and re-check whether this reproduces under it.

- **[Web Bug Sweep: Teams List Should Always Sort by Regulation (Newest
  First)] — Leg 8** *(Last touched: 2026-10-08 · Re-checks: 0)*
  Teams currently sort only by favorite (`utils/teamSort.ts::sortTeamsByFavorite`
  has no regulation awareness at all) with drag-order as the tiebreaker.
  Vanny wants regulation as the primary sort (newest - currently Reg M-C -
  first), drag-order preserved within each regulation group. This also
  resolves Leg 5 of this list below (filtering to one regulation currently
  disables the grip handle entirely per `TeamsPage.tsx`'s `canReorderTeams`
  gate, by design, since a partial filtered view has no well-defined "moved
  to the end" target) - once regulation is the primary sort, a filtered
  view is just one contiguous group, so reordering within it is
  well-defined and the gate can come off.

- **[Web Bug Sweep: Regulation Filter Doesn't Persist Across Sessions] —
  Leg 9** *(Last touched: 2026-10-08 · Re-checks: 0)*
  `TeamsPage.tsx`'s `activeFilter` is plain `useState<FormatFilter>('All')`,
  reset every reload. Needs to persist (likely through `useSettings`,
  alongside `defaultRegulation` - see Leg 10 below for why these two are
  related but distinct settings).

- **[Web Bug Sweep: Default Regulation Falls Back to the Oldest, Not the
  Current, Regulation] — Leg 10** *(Last touched: 2026-10-08 · Re-checks:
  0)*
  Vanny recalls this being fixed before - it was, partially: `useSettings.ts`
  exposes a persisted, user-settable `defaultRegulation` that `ImportTeamModal`,
  `CalcPage`, `BoxPage`, and `VgcPasteCatalogModal` (sample-team browsing)
  all already read. The bug is narrower than it looks: `useSettings.ts`'s
  own `DEFAULT_SETTINGS` hardcodes `defaultRegulation: 'Reg M-A'` (line 23)
  - the oldest regulation, not the current one - as the fallback for any
  settings file that predates this field, or a fresh install. Reg M-C is
  current per `config/seasons.ts::getLatestSeason()`. Fix: derive that
  fallback from `getLatestSeason().regulation` instead of a hardcoded
  literal, so it tracks whatever's actually current without a second place
  to update when a new regulation drops.

- **[Web Bug Sweep: Remove Existing-vs-Imported Set Picker on Team Creation]
  — Leg 11** *(Last touched: 2026-10-08 · Re-checks: 0)*
  The popup asking whether to use an existing saved set or the freshly
  imported one when creating a new team is redundant - that same choice is
  already made per-Pokémon during editing. Vanny wants it removed from the
  team-creation flow entirely (just use the imported set, let editing
  handle the swap-to-existing-set case same as it already does elsewhere).

- **[Web Bug Sweep: Real Set Sampling Is Slow to Populate] — Leg 12** *(Last
  touched: 2026-10-08 · Re-checks: 0)*
  Not blocking - Vanny's fine with it being slow if it has to be - but
  wants either a faster load or a loading indicator / progressive
  populate-as-it-loads instead of an unexplained wait. Lowest priority of
  this batch; revisit after Legs 7-10 land.

- **[Web Bug Sweep: StatsColumn EVs Share Leg 4's Stale-Local-State Bug]
  — Leg 1** *(Last touched: 2026-10-08 · Re-checks: 0)*
  Found live-verifying Leg 4's fix: `StatsColumn.tsx`'s
  `const [localEVs, setLocalEVs] = useState(evs)` has the exact same
  unguarded-initializer shape Leg 4 fixed in `EditOverlays.tsx`/
  `EditablePokemonCore.tsx` — never resyncs when the `evs` prop changes from
  an externally-applied update. Confirmed live: picking a Real Set bundle
  correctly updated `showdownData.evs` underneath, but the displayed EV
  grid kept showing the pre-pick values. Same fix shape as Leg 4 (the
  `prevProp*` render-time resync pattern) should apply directly.

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

