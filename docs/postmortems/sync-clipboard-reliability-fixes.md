# Sync & Clipboard Reliability Fixes — Post-Mortem

2026-10-09 to 2026-10-11. Started from two live bug reports from Vanny
(cross-device team notes not syncing, inconsistent clipboard image copy on
web) and grew substantially through live debugging across the session.

## What shipped

- **Team notes/name/author not resyncing after a sync pull** (Leg 1):
  `TeamCard.tsx`'s local text fields never resynced off the `team` prop,
  so a synced update got silently overwritten by stale local state on the
  next blur.
- **Web clipboard image copy unreliable** (Leg 2): two independent causes
  under one symptom - a transient-activation-window issue (Safari/Firefox)
  and, found live on Opera GX, a single ad-blocked image failing the
  *entire* poster render instead of just that icon.
- **Auto-sync self-retriggering, tripping the Worker's write throttle**
  (Leg 3): a one-shot boolean meant to suppress a sync's own state-write
  from re-triggering itself assumed three concurrent writes always land in
  one React commit - they don't.
- **Mega sprite lookup fetch-storm** (Leg 4): every `TeamCard` prefetching
  Mega sprites independently raced past a cache check meant to prevent
  duplicate requests.
- **PokeAPI 404 for the "Leek" item** (Leg 5): a legacy slug mismatch from
  a Gen 8 English rename.
- **Roster picker storing invalid gender-suffix species text** (Leg 6):
  the biggest leg by far - took three follow-up rounds across two days to
  actually stick, see below.
- **Wrong Pokédex number shown for form/gender-divergent species** (Leg 7):
  caught and reworked mid-session after discovering the first approach
  would have broken sprite rendering - see below.

All seven legs live-verified by Vanny, with one known accepted gap (Leg
7's self-heal for already-saved entries never visibly worked, even after
adding diagnostic logging - see COMPLETED.md's own entry).

## What went well

- **One console capture, four bugs.** Legs 2-5 all came from a single
  Opera GX console screenshot Vanny shared "by the way." Reading it
  carefully instead of just addressing the headline symptom surfaced three
  more real (if smaller) bugs in one pass.
- **Caught a real regression before shipping it, not after.** The first
  draft of Leg 7's fix overwrote `pokedexNumber` directly with the real
  National Dex number. Before committing, checking every
  `getPixelSpriteUrl` call site in the codebase revealed that field is also
  used verbatim as the sprite image filename for non-default forms -
  overwriting it would have silently broken sprites for every Rotom form,
  regional form, and gender-divergent species in the app. Caught by manual
  inspection, not a test; worth remembering that "does this field serve a
  second purpose elsewhere" is a question worth asking explicitly before
  any multi-purpose-field change, not just running the existing suite.
- **Flagging scope growth kept the user looped in.** This milestone
  started as 2 items and grew to 7 through live debugging. Explicit
  AskUserQuestion checkpoints before diving into the dex-number bug's full
  self-heal (and before reworking it mid-flight) meant the user always
  knew when the session was expanding past the original ask, rather than
  it quietly growing underneath them.
- **Established patterns generalized again.** The `prevProp` render-time
  resync pattern (Leg 1), the read-boundary self-heal-on-load pattern, and
  the in-flight-request-dedup pattern (Leg 4) all reused shapes this
  codebase had already proven out elsewhere, rather than inventing new
  ones per bug.

## What didn't go well / friction points

- **The species-text sync fix took three real attempts to land.** Round 1
  (read-boundary display correction) fixed what was shown but never
  persisted for real. Round 2 (bumping/correcting at the sync-payload
  level) turned out structurally unable to fire in the normal case, since
  round 1's own correction had already pre-corrected everything before
  `useSync.ts` ever saw it. Round 3 (bumping `updatedAt` at the exact
  point the raw broken data was still visible - the local load) is what
  actually worked. This is the second time this exact bug class has bitten
  a fix in this codebase (the Team drag-reorder bug from the previous
  milestone was the first) - a local-only correction that never bumps
  `updatedAt` is structurally guaranteed to lose to the Worker's
  strictly-greater-than merge rule and get silently reverted by the next
  auto-sync. This should be a standing checklist item, not something
  re-discovered per bug.
- **Leg 7's self-heal for already-saved entries shipped with an
  unexplained gap.** New entries get the correct dex number; already-saved
  ones don't visibly pick up the backfill, even after adding diagnostic
  `console.warn` logging for every failure path the hook has. Closed out
  per Vanny's explicit call rather than keep digging, but the actual root
  cause is still unknown.
- **A testing-environment quirk cost real time for no app-logic payoff.**
  A test asserting on a rejected-promise failure path kept failing with
  what looked like an unhandled-rejection flag, even after the hook's own
  try/catch correctly handled it (confirmed via isolated runs, removing
  re-throws, adding a blanket outer `.catch()` - none of it changed the
  result). Worked around by testing a different, non-rejecting failure
  path instead rather than continuing to chase it. Worth remembering this
  is a known rough edge in this test setup for next time, not re-deriving
  it from scratch.

## Scope creep observed

- Explicitly named at the time rather than silently absorbed: the
  milestone opened as "notes don't sync + clipboard copy is unreliable" (2
  items) and grew to 7 legs as the user kept surfacing adjacent bugs mid-
  session (a console capture, a follow-up report, a "related note" about
  dex numbers). Each expansion got an explicit checkpoint
  (AskUserQuestion) before proceeding rather than being quietly folded in.
- Leg 7 in particular ballooned well past its original "wrong number
  shown" framing once the sprite-breakage conflict was discovered -
  what started as a display-text fix became a new field across two types,
  a new backfill hook wired into both app shells, and a cache-eviction
  design that was built, then deliberately reverted for being wasteful.

## What changes for the next milestone

- **Any fix that "corrects already-saved data" must bump `updatedAt` and
  persist through the real mutator from the start**, not a read-boundary-
  only correction - don't re-discover this per bug. If sync is enabled for
  a collection, a display-only fix is never sufficient on its own.
- **Before changing a field's meaning, grep every call site first.** Leg
  7's near-miss (sprites) would have shipped as a real regression if that
  check had been skipped in favor of "the tests pass."
- Continue using explicit checkpoints when a session's scope is visibly
  growing - it worked well here and cost little.
