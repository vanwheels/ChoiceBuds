# Sprite, Filter & Search Fixes — Post Mortem

2026-10-27, one day, 6 legs (1 scoping), 9 code/test commits. Suite at close:
1032 tests passing, lint and type-check clean.

## What shipped
- **Animated Sprite Forme Filenames** — GIF ids keep the species/forme hyphen
  (`castform-snowy`, `charizard-megax`); `CalcSideSprite` shows the static
  sprite first (ffdc5a5).
- **Mega Golisopod Steel Filter Bug** — Mega rows assembled independently of the
  base row in + Add Pokemon, so any Mega that gains a type survives a type chip
  (6ad1d91).
- **Mega Team Card Sprite Toggle Bug** — three causes: PokeAPI resource-name
  aliases for Meowstic/Floette Megas, 429s from the ~81-slug prefetch burst
  (retry + backoff, per-card prefetch), and Showdown CDN hangs (static sprite
  first) (ee7efae, cb43b9a, 676991e).
- **Team Header Mega Sprite Ignores Toggle** (c45735e) and **Mega Meowstic-F
  Toggle Gap** (cd69051) — two follow-ons found while verifying the card fix.
- **Team Search by Species** — scoping leg (37429d1) then fix: query and
  species/nicknames compared with non-alphanumerics stripped, and
  `TeamPickerDropdown` matches roster species (c890e66, 154dedf).

## What went well
- Scoping Team Search first found the premise was half wrong (search already
  existed on both targets); Leg 2 was a small, exact fix.
- Each fix was verified live the same day and recorded in COMPLETED.md.

## What didn't / friction points
- The Mega toggle "one bug" was really three stacked causes plus two siblings
  (header strip, Meowstic-F). Each was found only after the previous fix was
  checked live; nothing swept the whole Mega list up front.
- Meowstic/Floette were fixed by alias + unit test only; Landorus-Therian
  couldn't be checked live (not in Champions).
- Fixing the sprite load delay exposed a visible static-to-GIF swap, now
  tracked as Calc Sprite Swap Flicker.

## Scope creep observed
- Header strip and Meowstic-F legs were not in the milestone's Done-when
  bullets (the Mega-sprite bullet covered them loosely). Both were logged as
  their own legs rather than absorbed, which is the right handling.

## What changes for the next milestone
- Mega/alt-form slug bugs recur per species. Add a test that walks every Mega
  stone and asserts `getMegaApiSlug` resolves, with an expected PokeAPI
  resource name, so the next bad species fails a test instead of a live check.
- Any burst of PokeAPI requests needs retry/backoff and must never cache a
  failure.
- Bug fixes for one species in a table-driven area get a "which other rows share
  this cause" check before the leg closes.
