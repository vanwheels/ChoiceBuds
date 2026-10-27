# Calc Follow-ups — Post Mortem

2026-10-27, one day, 6 legs, 6 code/test commits. Suite at close: 1117 tests
passing, lint and type-check clean.

## What shipped
- **Mega Stone Slug Coverage Test** — walks every `MEGA_STONE_TO_SPECIES`
  entry (plus Meowstic-F) against a saved PokeAPI Mega-resource fixture
  (ba27f98).
- **Calc Sprite Swap Flicker** — `CalcSideSprite` cross-fades the static
  sprite into the Showdown GIF at a uniform 1.2x native size; regulation
  buttons moved to the popup header (b55312c).
- **Calc Side Panel Height Parity** — panel root `flex-1` so both sides and
  their Box panels align (3553229).
- **Calc Item Picker: Champions Items & Full Scroll** — picker lists only
  `VGC_ITEMS`, `maxResults={Infinity}` (25f8a72).
- **Calc Autocomplete: Show All On Focus** — select-all on focus and an
  unedited open lists every option, across species/item/ability/move
  (7a94b5f).
- **Calc Item Picker: Item Icon Coverage** — audit of every `VGC_ITEMS`
  entry; only Leek lacked an icon, fixed via the Serebii fallback with a
  coverage test (097b2bf).

## What went well
- The Mega slug test landed first, as the Sprite, Filter & Search Fixes
  post mortem asked, and was done in one commit.
- Every UI leg was verified live by the user and recorded the same day.
- The icon audit checked the whole table (one miss out of the full item
  list) instead of fixing only the reported item.

## What didn't / friction points
- Calc Sprite Swap Flicker took a second pass: a 3x size cap shrank Megas
  before settling on a uniform 1.2x native size.
- "Show All On Focus" only surfaced while verifying the item picker leg, so
  it became a sixth leg and the milestone's Done-when bullets don't mention
  it.

## Scope creep observed
- Regulation buttons moved into the popup header during the flicker leg (user
  request, small). Show All On Focus and Item Icon Coverage were added as
  legs rather than absorbed into the item picker leg, which is the right
  handling.

## What changes for the next milestone
- Sprite sizing across forms (base, Mega, regional) needs a check across
  several species of different native sizes before the leg closes, not just
  one. Convert to a check in the leg's done-when.
