# Regular Calc Popup — Pivot Scoping Session

Scoping conversation 2026-09-13. After shipping all 3 legs of Live Calc
Page Layout & Function Rework plus the Known-Ability Lock, Result Clarity
Pass, and both legs of Usage-Data-Backed Inference (see `COMPLETED.md`),
Vanny sat with the result and remained unhappy with Live Calc as a whole —
not a polish problem, a wrong-tool-for-the-moment problem.

## The core call

Live Calc's observation/inference model (log "their move did X% to me",
narrow the opponent's spread from evidence) optimizes for precision at the
cost of interaction speed during live play. But a faster path already
exists for anything actually observed: set the field directly, which the
plain Calc tab (`CalcPage`) already supports. Inference only pays for
itself on values that are still unknown — and usage-ranking already answers
"what's most likely" there without any observation math. So the whole
narrow-from-evidence machinery (observation lists, bidirectional inference,
`liveCalcEngine.ts`, its own tab/panels) is being retired rather than tuned
further.

## Decided (2026-09-13, Vanny's calls)

- **Live Calc is ripped.** Tab, `liveCalcEngine.ts`, observation lists (both
  directions), bidirectional inference, `components/livecalc/*` — all go
  away rather than continuing to be tuned. (Exact removal-vs-build-alongside
  sequencing not decided yet — see `TODO.md`'s not-yet-scoped items.)
- **The popup is the existing regular Calc, relocated.** No new UI
  paradigm — `CalcPage` becomes launchable as an overlay from anywhere in
  the app instead of being tab-locked. Supersedes the former "Live Calc
  Global Popup Launcher" item (scoped for Live Calc specifically; now
  retargeted at the plain Calc).
- **Battle Log integration carries over from the old plan, retargeted.**
  Opening the popup from an active Battle Log session pre-fills the enemy
  team from that session's `opponentRoster`, and anything newly set while
  it's open writes back into that same roster — `OpponentPokemonEntry`
  (`types/battle.ts:47`) already has the `moves`/`ability`/`item`/
  `*RevealedOnTurn` fields this needs, no new schema. Supersedes the former
  Blocked "Live Calc Battle Log Auto-Populate" item.
- **Multi-set auto-populate, near-term shape: per-axis, not synthesized
  bundles.** Fabricating a full "set" out of independently-top-ranked
  move/item/ability/nature picks implies a co-occurrence the data doesn't
  back (rejected — see below). Near-term default reuses the already-shipped
  `championsbattledata.com` per-axis ranking
  (`utils/liveCalcUsageWeighting.ts`), generalized off Live Calc and onto
  the popup.
- **Real correlated full-set data is a separate, later milestone.**
  VGCPastes (a public Google Sheet + Discord bot of real tournament team
  Pokepastes) was raised as the best real source — confirmed technically
  pullable (see `vgcpastes-sourcing-feasibility.md`), but deferred: needs
  its own policy exception (bulk vs. today's single-user-triggered
  pokepaste-read exception), refresh-cadence, and species-name-
  normalization work this milestone doesn't need to solve. Also surfaced a
  second, simpler use case for that same pull: a browsable sample-team
  catalog (list real teams, import one as-is via the existing Pokepaste
  importer) — no per-species extraction needed, likely worth sequencing
  before the harder per-species correlation problem.

## Rejected

- **Synthesizing full sets from independent per-axis top picks** (e.g. top
  move + top item + top ability + top nature presented as "Set #2"). Reads
  as a real, confirmed set when the underlying data never actually confirms
  those axes co-occur — actively misleading rather than merely imprecise.

## Not yet scoped into legs

This session stopped at the pivot decision, matching the project's usual
practice of not turning a scoping pass into legs in the same sitting it's
decided in. See `TODO.md`'s Current Milestone section for the resulting
not-yet-scoped items.

## Popup Launcher — Leg 1 scoping (2026-09-13, continued)

Scoped in a follow-up session, same day. Three product calls, Vanny's:

- **Calc tab is removed, not kept alongside the popup.** The sidebar's
  `Calc` entry (`Sidebar.tsx`'s `MAIN_NAV_ITEMS`) and `App.tsx`'s `'calc'`
  `ActiveTab` case go away entirely — the popup is the only way to reach
  `CalcPage` going forward.
- **Trigger is a persistent floating button**, not a sidebar click. Visible
  on every tab regardless of which one is active or whether the sidebar is
  collapsed — needed since the sidebar's Calc entry no longer exists to
  double as the trigger.
- **In-progress matchup persists across close/reopen**, matching how every
  other tab already behaves (`App.tsx`'s `visitedTabs` pattern) rather than
  resetting each time the popup opens.

### The architecture conflict this created, and how it's resolved

The straightforward way to satisfy "persists across close/reopen" would be
lifting `useDamageCalc()`'s instantiation up into `App.tsx`, next to
`teamsState`/`gameDataState`/etc. — that's the existing pattern for state
that needs to outlive a component's mount/unmount.

That's wrong here specifically: `useDamageCalc.ts` has a **static top-level
import of `@smogon/calc`**, and `App.tsx`'s own header comment documents
*why* `CalcPage` (and therefore this hook) is loaded through
`React.lazy()` today — `@smogon/calc` is "the heaviest dependency in the
app," and the lazy boundary exists so a Teams-only session never pays to
parse/load it. Importing `useDamageCalc` directly in `App.tsx` would pull
that import out from behind the lazy boundary and load it on every launch,
regardless of whether the popup is ever opened — a real regression, not a
minor tradeoff.

**Resolution:** reuse `App.tsx`'s existing `visitedTabs` trick instead of
inventing new architecture. Today, a tab that's been opened once stays
mounted (`display:none` when inactive) rather than unmounting, and is only
`React.lazy()`-imported the first time it's actually visited. The popup
gets the same treatment: a `hasOpenedCalcPopup` flag (parallel to
`visitedTabs`) gates a lazy-loaded `CalcPopup` host that, once opened once,
stays mounted-but-hidden rather than unmounting on close — so
`useDamageCalc`'s state (owned inside `CalcPopup`, not hoisted to
`App.tsx`) survives close/reopen for the rest of the session, and
`@smogon/calc` still only loads the first time a user actually opens the
popup. No new pattern, no eager-load regression.

### Resulting shape

- `CalcPopup.tsx` (new, lazy-loaded like today's `CalcPage` import in
  `App.tsx`): wraps the existing `CalcPage` content in overlay chrome.
  Reuses `Modal.tsx`'s portal/animation shell but needs its own, much wider
  `panelClassName` — `CalcPage`'s two move grids + result panel + 3-column
  field row don't fit `Modal.tsx`'s existing `max-w-3xl` default. A close
  button in a header bar (existing modals don't have overlay-click/Escape
  dismissal per `Modal.tsx`'s own note — matching that, not adding new
  dismissal behavior here).
- `App.tsx`: drops the `'calc'` `ActiveTab` variant and its
  `visitedTabs.has('calc')` block; adds `isCalcPopupOpen`/
  `hasOpenedCalcPopup` state and renders `<CalcPopup>` the same
  lazy-once/hidden-after way `visitedTabs` renders other tabs, plus the new
  floating launcher button (rendered unconditionally, outside the
  per-tab `<main>` content so it survives tab switches).
- `Sidebar.tsx`: remove the `calc` entry from `MAIN_NAV_ITEMS` (and its
  `CalcIcon` import, unless the launcher button reuses it — likely does,
  for visual continuity).
- No changes needed to `CalcPage.tsx`/`useDamageCalc.ts`/the rest of
  `components/calc/*` — they're relocated wholesale into the new overlay
  chrome, not modified.

Ready to implement as a single leg — the pieces above don't have a useful
half-shipped midpoint (a launcher button with no popup, or a popup with no
way to open it, are equally not-useful on their own).
