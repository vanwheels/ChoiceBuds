# Post-mortem: Regulation M-C Prep

**Date:** 2026-09-05 to 2026-09-09 (spanned Reg M-C's actual release,
2026-09-08 6pm PST). **Status:** Shipped. Full implementation detail lives
in `COMPLETED.md`'s Leg 1/Leg 2 entries (`git log` from `6a46613` through
`86d1fc0`, interleaved with other work) - this doc is the retrospective, not
a restatement.

## What shipped

Full app support for Pokémon Champions' Regulation M-C, built in two legs
split by the regulation's own release date:

1. **Leg 1** (`6a46613`, 2026-09-05, ahead of release) - hand-curated the
   roster/Mega-Stone/regulation-selector plumbing with no official source to
   check against yet: 4 new species, 6 new Mega Stones (3 ordinary + a
   brand-new "Mega Z" second form for Absol/Garchomp/Lucario), and a 3rd
   regulation widened end-to-end through 11 call sites.
2. **Leg 2** (2026-09-08 to 2026-09-09, post-release) - piecemeal
   verification against official sources as Vanny fed in confirmed details
   (3 source-text dumps, plus live Serebii/Bulbapedia fetches once their Reg
   M-C pages went up), catching and fixing 3 real pre-existing bugs along
   the way (Golisopod's Mega ability, a missing `GENDER_DIVERGENT_BASE_SPECIES`
   entry for Indeedee, and 3 species' signature moves being silently
   stripped by a PokeAPI champions-tag gap).

## What went well

- **The Leg 1/Leg 2 split by release date was the right call.** Curating
  ahead of release let the roster/UI plumbing be ready day-one, while
  deferring fact-verification to Leg 2 meant Leg 1 wasn't blocked waiting on
  sources that didn't exist yet. Neither leg tried to do both jobs at once.
- **Piecemeal verification against a running tally, not one big dump, matched
  how the real-world data actually arrived.** Vanny fed in confirmed details
  as they landed rather than waiting for one complete datamine; treating
  each batch as incremental config population (not a full re-verification
  pass) kept each session's scope small and let real progress show up
  immediately instead of after a long wait.
- **Verification work kept finding real bugs, not just confirming values.**
  3 separate real bugs surfaced purely from the *act* of cross-checking
  (Golisopod's ability, Indeedee's gender-divergence registration, the
  champions-tag movepool-stripping bug hitting 3 more species) - the
  verification pass wasn't just a rubber stamp on Leg 1's guesses.
- **Escalating from a single spot-check to the app's own audit methodology
  paid off.** The Z-A-exclusive-move question started as an ad hoc Serebii
  WebFetch, which produced unreliable signal (it flagged Rillaboom's own
  existing signature moves as "unusual"). Recognizing that and deferring to
  a dedicated live-PokeAPI methodology (`hasChampionsMoveData`) instead of
  forcing a low-confidence Serebii-only answer into this leg was the right
  tradeoff.

## What didn't go well / friction points

- **Third-party pre-release data (`@smogon/calc`'s bundled Champions data)
  was wrong in a specific, recurring way.** Golisopod's Mega ability had its
  own *ordinary* ability leaking in as stale placeholder data - the same
  failure shape already known from the Z-Mega abilities before this
  milestone even started. This is now a confirmed pattern (pre-release
  third-party data placeholder-fills unknown Mega abilities with the
  species' own ordinary ability), not a one-off - worth checking for by
  default the next time a new Mega/Z-Mega ability needs verifying ahead of
  an official source.
  - Ad hoc, per-species Serebii spot-checks don't reliably distinguish
  "genuinely new to Champions" from "existing move/data the page's own
  wording just flagged as unusual" - confirmed twice this milestone (the
  Z-A-exclusive-move question, and Rillaboom's signature moves specifically
  being mis-flagged). The app's own live-PokeAPI methodology
  (`hasChampionsMoveData`) is the reliable tool for that class of question;
  a wiki-page read is a fine source for "does X exist / what changed" but
  not for "is X new."

## Scope creep observed

None in the legs themselves - Leg 2's verification work stayed inside
"confirm Leg 1's hand-curated data against sources as they appear," even as
it grew across multiple sessions and 3 dumps. The one deliberate scope
boundary (Z-A-exclusive-move audit, `seasons.ts` M-7+ rows) was correctly
kept out of Leg 2 rather than absorbed into it - see TODO.md's new
`[Reg M-C Z-A-Exclusive Movepool Audit]` item for the former; the latter
isn't being tracked as an open item at all per Vanny, since it can simply be
picked up whenever a future season gets published.

## What changes for the next milestone

- When a future regulation's Mega/Z-Mega ability needs verifying ahead of an
  official source, check `@smogon/calc`'s bundled pre-release value against
  the species' own ordinary ability first - if they match, treat that as a
  placeholder-fill red flag, not a confirmed value.
- Default to the app's own live-PokeAPI audit methodology
  (`hasChampionsMoveData`, `config/championsMovepoolChanges.ts`) over a
  wiki-page spot-check for any "is this move/data genuinely new" question -
  reserve wiki reads for "what changed" questions where a page's own prose
  is the actual source of truth.
- Keep the Leg-split-by-release-date pattern (hand-curate ahead of release,
  verify against real sources after) for the next regulation's prep work -
  it worked cleanly here and there's no reason to change it.
