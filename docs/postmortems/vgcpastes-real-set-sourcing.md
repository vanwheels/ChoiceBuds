# Postmortem: VGCPastes Real-Set Sourcing

**Shipped:** 2026-09-14 to 2026-09-15

## What shipped

- A browsable "Browse Sample Teams" catalog (Teams page) pulled from the
  public VGCPastes Google Sheet, filtered to rows with a confirmed real EV
  spread, with per-row expand-to-preview and search/filter across
  species/owner/description.
- Catalog import fixes: correct Team Name/Author sourced from the sheet row
  (not the pokepaste's own title/author), auto-populated Notes from the
  sheet's tournament/rank/source/report columns, and a sprite-matching fix
  (3-tier resolver + a real `normalizeSpeciesForAPI` Toxtricity bug fix that
  also silently affected the main import path, not just the catalog).
- Per-species real-set extraction: an on-demand pipeline that fetches and
  dedupes real EV/move/item/ability/nature bundles for a species from the
  cached catalog pastes, surfaced as its own "real sets seen" section in
  both the Calc panel and, later, a floating panel on Team Builder roster
  cards - deliberately kept separate from the existing `ChampionsUsageEntry`
  ranking rather than blended into it.
- Two scoping-only legs (Calc Real Sets Section visual polish, Team Builder
  Real Sets Integration) resolved placement/treatment decisions via
  `AskUserQuestion` before any code was written.
- A Tailwind/terrain speed-modeling correctness fix folded in from
  Unscheduled, unrelated to the sourcing work itself.
- Two more unrelated items landed in this milestone's current slot purely
  because only one milestone can be "current" at a time: Team Builder Stat
  Display's SP/Base/Real Total toggle (shipped), and Calc Doubles Support's
  flagged revisit (killed outright rather than scoped - see
  `docs/investigations/calc-doubles-support-scope.md`).

Full leg-by-leg detail and commit hashes are in `COMPLETED.md`.

## What went well

- The scope-first pattern (a dedicated Scoping leg with `AskUserQuestion`
  before any build leg) worked cleanly across all three places it was
  used - sourcing itself, real-set extraction, and Team Builder
  integration - each producing a clear split into build legs with no
  re-litigating decisions mid-build.
- Live verification caught a real bug early: the catalog's sprite-matching
  gap traced back to a genuine `normalizeSpeciesForAPI` omission
  (Toxtricity) that was silently breaking the *existing* import path too,
  not just the new catalog feature. Building the catalog surfaced a latent
  bug outside its own scope.
- Search/filter was correctly flagged as scope creep during Catalog Leg 1
  instead of getting absorbed into that pass, then picked up cleanly as
  its own leg once the core catalog was stable.
- The "flag for revisit" pattern on Calc Doubles Support worked as
  intended - deferred rather than force-scoped while the higher-priority
  legs shipped, then revisited and killed outright with a real
  investigation doc backing the call, instead of quietly reappearing as an
  open item indefinitely.

## Friction points

- Two topically-unrelated items (Stat Display Toggle, Calc Doubles Support)
  had to be parked in this milestone's current-milestone slot solely
  because CLAUDE.md's "only one current milestone at a time" rule leaves
  nowhere else for small in-flight work to live once a milestone is
  current. Not a real problem here, but it means this milestone's
  COMPLETED.md/postmortem trail includes work that has nothing to do with
  VGCPastes - worth remembering when reading this postmortem back later
  looking specifically for real-set-sourcing history.
- The sprite-matching gap (75/119 direct matches) wasn't caught until live
  verification of Catalog Leg 2, despite the resolver logic being
  straightforward in hindsight - the existing `normalizeSpeciesForAPI`
  special-case table wasn't audited against the full VGCPastes species set
  before building the row display, only discovered by looking at what
  actually rendered.

## Scope creep observed

- None absorbed silently. Search/filter (Catalog Leg 1) was flagged and
  deferred rather than built inline, per CLAUDE.md's scope-creep rule -
  the intended behavior, working as designed.

## What changes for the next milestone

- When building a display feature over an existing normalization/lookup
  table (species names, form slugs, etc.), spot-check coverage against the
  real data set up front rather than discovering gaps via live rendering -
  would have caught the Toxtricity gap a leg earlier.
- No change needed to the scoping-leg-before-building pattern - it held up
  well across three separate uses this milestone and should stay the
  default for any leg with real placement/UX decisions still open.
