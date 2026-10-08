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

Reported by Vanny 2026-10-08 from personal use of the web client. Legs 1, 2,
and 4 share a suspicious shape (a mutation doesn't visibly/durably take
effect until some other trigger fires) and may turn out to be one root
cause in the web storage-adapter/state-update path rather than three
separate bugs — confirm or rule that out during Leg 1 rather than assuming
it going in. Leg 6 intentionally holds the milestone open for a second
bug-finding pass; don't close the milestone until that's done.

- **[Web Bug Sweep: Team Edit Needs Double Action] — Leg 1** *(Last
  touched: 2026-10-08 · Re-checks: 0)*
  Root cause confirmed and fixed in `useTeams.ts`: `useActiveEditor` turned
  out to be a dead end — it's mounted in `AppWeb.tsx`/`App.tsx` and passed
  into `TeamsPage` as a prop, but `TeamsPage` never destructures or forwards
  it anywhere; all real editing now goes through Always-On Editing's direct
  `onUpdatePokemon`/`updateTeam` calls instead, so its draft-commit path
  isn't involved in this bug at all (worth a separate cleanup TODO to delete
  it, since it's fully unused). The real cause: every `useTeams` mutator
  (`updateTeam`/`addTeam`/`deleteTeam`/`setTeamOrder`) rebuilt its "next
  teams array" from the `teams` state closured into that render, then
  persisted it independently - two mutations fired before React re-rendered
  (e.g. `StatsColumn.tsx`'s EV hold-to-repeat fires one `onUpdatePokemon`
  per interval tick, unawaited) both read the *same* stale base, and
  whichever write happened to resolve last won, silently dropping whichever
  edit lost the race regardless of which was issued last - repeating the
  same edit later (once a render had caught up) no longer raced, so it
  stuck. Fixed by giving `useTeams` a `teamsRef`/`tombstonesRef` (updated
  synchronously the instant a mutation computes its result, not only once
  React re-renders) and a serializing write queue (`enqueueMutation`) that
  every mutator, plus `refreshTeams`, now runs through - see that file's new
  header comment on the refs. Covered by a new race-reproducing test in
  `useTeams.test.ts`; full suite + type-check + lint all pass. Needs Vanny's
  own live verification (hold an EV +/- button, or fire two quick edits,
  then refresh) before this and Leg 2 close out.

- **[Web Bug Sweep: Export Shows Stale Data, Reverts on Refresh] — Leg 2**
  *(Last touched: 2026-10-08 · Re-checks: 0)*
  Same root cause as Leg 1 (confirmed during Leg 1's investigation) - the
  lost-update race in `useTeams.ts`'s mutators meant an edit could fail to
  actually persist while still looking applied in the moment, so a later
  export/refresh read back the pre-edit (or partially-overwritten) value.
  Leg 1's fix (serializing writes through `enqueueMutation` + ref-based
  bases) should resolve this too - not closing this leg out yet pending
  Vanny's own live verification of the specific export/refresh repro.

- **[Web Bug Sweep: Item Selector Spawns Off-Screen] — Leg 3** *(Last
  touched: 2026-10-08 · Re-checks: 0)*
  The item-select dropdown can position slightly outside the visible
  viewport vertically instead of anchoring to its trigger. Looks like a
  plain positioning/CSS calculation bug, independent of the state-
  persistence issues above.

- **[Web Bug Sweep: Real Set Import Not Visually Reflected] — Leg 4** *(Last
  touched: 2026-10-08 · Re-checks: 0)*
  Confirmed during Leg 1's investigation this is a **separate** root cause
  from Legs 1/2, not the same one: `EditOverlays.tsx`'s `selectedItem`/
  `selectedAbility`/`selectedMoves` and `EditablePokemonCore.tsx`'s
  `localNickname`/`isLocalShiny`/`localGender` all initialize once via
  `useState(pokemon.showdownData.X)` and never resync when the `pokemon`
  prop changes from an *externally-applied* update (Real Set import, Roster
  Swap, Saved Set load, Paste Pokémon, Speed Tiers override save) - those
  bypass the components' own on-click handlers (which optimistically
  `setSelectedX(...)` themselves) entirely, so the underlying data persists
  correctly but these components keep displaying their stale initial
  values until something else forces a remount. Needs its own fix (resync
  local state off a prop-change, e.g. the "adjust state during render"
  pattern already used elsewhere in this codebase - see `TeamCard.tsx`'s
  `rosterIdsKey` handling for a reference - or key the component so an
  externally-applied update remounts it) - not fixed by Leg 1's write-race
  fix.

- **[Web Bug Sweep: Real Sets Panel Hides Info Behind a Destructive Click]
  — Leg 5** *(Last touched: 2026-10-08 · Re-checks: 0)*
  The Real Sets panel doesn't show all of a set's information up front —
  seeing the rest requires clicking the set, but clicking also immediately
  applies it, overwriting the user's current set just to preview it. Needs
  a UX decision (e.g. a details-only expand/preview that doesn't apply)
  before a fix, not just a rendering tweak.

- **[Web Bug Sweep: Second Pass Before Closing] — Leg 6** *(Last touched:
  2026-10-08 · Re-checks: 0)*
  Vanny flagged there may be more web-client bugs from personal use not yet
  written down. Do a deliberate second look (and re-verify Legs 1-5) before
  closing this milestone — don't ship it on the strength of the initial
  five reports alone.

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

