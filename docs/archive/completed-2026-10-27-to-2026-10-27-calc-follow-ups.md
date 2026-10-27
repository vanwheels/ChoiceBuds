# Completed: Calc Follow-ups (2026-10-27)

- **[Calc Item Picker: Item Icon Coverage] — Leg 1** (2026-10-27)
  Audited every `VGC_ITEMS` entry against PokeAPI/Serebii; Leek was the only
  one without an icon (no `leek` item in PokeAPI), fixed via the Serebii
  fallback, with a coverage test in `itemSprite.test.ts`. Live-verified by the
  user: no blank icons in the calc item picker. See commit 097b2bf.

- **[Calc Autocomplete: Show All On Focus] — Leg 1** (2026-10-27)
  `CalcAutocomplete` now selects all text on focus and lists every option while unedited (the
  "All" section included), so species/item/ability/move fields no longer need text deleted first;
  typing replaces the value and filters as before. Verified live by the user across the species,
  item, ability and move fields (full list on click, typing filters, click-away restores value).
  Full suite, lint and type-check green. See commit 7a94b5f.

- **[Calc Item Picker: Champions Items & Full Scroll] — Leg 1** (2026-10-27)
  Calc item picker now lists only `VGC_ITEMS` (full `@smogon/calc` list kept as
  `allItemOptions` for the Leg 5 "All" section) and passes `maxResults={Infinity}` so it
  scrolls fully. A new test asserts every Champions item exists in `@smogon/calc`. Verified
  live by the user (Champions-only list, scrolls to the end). Full suite, lint and type-check
  green. See commit 25f8a72.

- **[Calc Side Panel Height Parity] — Leg 1** (2026-10-27)
  Calc Pokémon panel root now `flex-1`, so it fills its column (already stretched to the
  taller side) and both panels and their Box panels align. Verified live by the user with
  empty, single-forme and multi-forme species on each side. Full suite, lint and type-check
  green. See commit 3553229.

- **[Calc Sprite Swap Flicker] — Leg 1** (2026-10-27)
  `CalcSideSprite` now cross-fades the static sprite into the Showdown GIF and renders
  the GIF at a uniform 1.2x native size (a 3x-capped attempt had shrunk Megas), spanning
  the move-grid row height. Also moved the regulation buttons into the popup header beside
  the close X (user request, small scope add). Verified live by the user: no flicker, Mega
  and base sprites look proportionate. Full suite, lint and type-check green. See commit b55312c.

- **[Mega Stone Slug Coverage Test] — Leg 1** (2026-10-27)
  Added a test walking every `MEGA_STONE_TO_SPECIES` entry (plus Meowstic-F) that
  asserts the resolved slug exists in a saved PokeAPI Mega-resource fixture; full
  suite, lint and type-check green, no manual verification needed. See commit ba27f98.
