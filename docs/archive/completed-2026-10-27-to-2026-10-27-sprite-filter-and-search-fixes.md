# Completed: Sprite, Filter & Search Fixes (2026-10-27)

- **[Team Search by Species] — Leg 2** (2026-10-27): `teamMatchesSearch` now compares species/nicknames and the query with all non-alphanumerics stripped, so spaced/hyphenated/period queries find the team, and `TeamPickerDropdown` matches team name or roster species. Verified manually on app and web by searching a spaced/hyphenated species on the Teams page and in a team picker. Tests later switched to Champions-legal species. See commit c890e66.

- **[Team Search by Species] — Leg 1 (scoping)** (2026-10-27): Found `teamMatchesSearch` already serves TeamsPage on app and web; the gap is spaced/hyphenated species queries and `TeamPickerDropdown` matching team names only. Leg 2 defined in TODO.md; no code changed. See commit 37429d1.

- **[Mega Meowstic-F Toggle Gap] — Leg 1** (2026-10-27): `getMegaApiSlug` now resolves a Meowstic-F holding Meowsticite to its own `meowstic-f-mega` slug (aliased to PokeAPI's `meowstic-female-mega`, Trace ability), so the team card Mega toggle appears and flips to the female Mega sprite. Verified manually: Meowstic-F toggles to its female Mega sprite. See commit cd69051.

- **[Team Header Mega Sprite Ignores Toggle] — Leg 1** (2026-10-27): The team header's mini sprite strip now resolves its Mega sprite through `resolveActiveMegaSlug` with each slot's toggle state (`useActiveFormsForIds`), so it shows the base sprite until the Mega toggle is on. Verified manually on the Teams page: base sprite with stone held, Mega on toggle, back to base on toggle off. See commit c45735e.

- **[Mega Team Card Sprite Toggle Bug] — Leg 1** (2026-10-27): Three causes
  behind the Mega toggle leaving the card on the base sprite. PokeAPI names
  Meowstic's and Floette's Megas differently (`toPokeApiMegaResource` alias);
  the ~81-slug prefetch burst drew PokeAPI 429s with no retry
  (`fetchMegaSprite` now retries with backoff, never caches a failure, and
  TeamCard prefetches only its own slugs); and Showdown's CDN can hang on a
  Mega GIF it lacks, so the card never fell back (it now shows the static
  sprite and swaps to the GIF only once loaded). Verified live by the user on
  existing shiny and non-shiny Golisopod (Soft TR Ruptpod); Meowstic/Floette
  were fixed by slug alias and unit test only, not separately checked live.
  See commits ee7efae, cb43b9a, 676991e.

- **[Mega Golisopod Steel Filter Bug] — Leg 1** (2026-10-27): Mega rows in
  + Add Pokemon were only emitted beside a base row that passed the active
  chips, so a Steel chip dropped Mega Golisopod (base Bug/Water); rows are now
  assembled independently via `assembleStatTableRows`, covering every Mega
  that gains a type. Verified live: Steel shows Mega Golisopod. See commit 6ad1d91.

- **[Animated Sprite Forme Filenames] — Leg 1** (2026-10-27): Animated GIF
  ids now keep the species/forme hyphen (`castform-snowy`, `charizard-megax`)
  with an exception list for hyphenated base names, and `CalcSideSprite`
  shows the static sprite first, swapping to the GIF on load. Verified live
  in the Calc with Mega Charizard X/Y: the GIF loads with no delay; the
  static-to-GIF swap is briefly visible (tracked in TODO.md). Landorus
  couldn't be live-checked, as it isn't in Champions. See commit ffdc5a5.
