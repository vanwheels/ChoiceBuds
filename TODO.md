# ChoiceBuds TODO

Working task list for ongoing/planned work. Keep entries short; put rationale
in a `Why:` line only when it's not obvious from the task itself.

## In progress / up next

(nothing queued right now)

## Done

- **Widen bulk first-launch sync to shiny + item sprites** (2026-07-06)
  `useInitialSync.ts` now also downloads each species' shiny sprite and every
  `VGC_ITEMS` entry's sprite during the one-time bulk pass, not just normal
  Pokemon sprites. `SpeciesRosterEntry` gained a `shinySpriteUrl` field
  (`useSpeciesRoster.ts`, roster cache bumped to `v3` to invalidate old
  cached entries missing it).
- Add offline startup sync and sprite caching (normal sprites + move/ability/
  learnset data for the Reg M-B dex)
- Add damage calculator tab and regulation picker
- Refactor editors and add team validation
- Add in-slot item picker and dismissable hook

## Backlog / ideas (not yet scoped)

- None currently — add items here as they come up.
