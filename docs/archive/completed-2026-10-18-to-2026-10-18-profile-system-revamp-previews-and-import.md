# Archived: Profile System Revamp: Previews & Import (2026-10-18)

Split out of `COMPLETED.md` at the 2026-10-18 Profile System Revamp:
Previews & Import milestone boundary - named with the milestone slug since
it shares its date range with the Profile System Revamp: Foundation and
Scoping Sweep archives above. See
[docs/postmortems/profile-system-revamp-previews-and-import.md](../postmortems/profile-system-revamp-previews-and-import.md).

## [Profile Previews UI Consistency Pass] — Leg 5 (2026-10-18)

Brought Legs 1-4's one-off styling in line with established patterns
elsewhere in the app: `ProfileTeamCard.tsx`'s drag handle now matches
`TeamCardHeader.tsx`/`BoxCard.tsx`'s responsive touch-target size and
zinc-400 color, its regulation badge matches `RegulationBadge.tsx`'s
padding/tracking, and the regulation filter pills match the layout
toggle's height so the two selector groups in `ProfileCard.tsx`'s header
row read as one family of controls. Also gave `ProfilePokemonTile.tsx`/
`ProfilePokemonRow.tsx` the per-type `.type-glow-ring` border every other
Pokemon card (`PokemonCard.tsx`/`BoxCard.tsx`) has, via a new cache-only
`getProfileTypeGlowColors` lookup in `profileGameData.ts` off the optional
`databaseState` prop (same graceful-fallback shape the existing item/move
lookups there already use). Four further asks that came up during manual
review - an Edit-mode toggle with click-the-sprite favorite editing, a "+
Team" add picker per section, drag-and-drop between Open/Closed tiers, and
a profile-visibility indicator on the Teams page itself - were split out
to `TODO.md`'s Unscheduled section rather than folded into this leg, since
they're new interaction models, not a consistency fix. See commit
a81c40a.

## [Regulation Filter on Profile Page] — Leg 4 (2026-10-18)

Added a pill-row regulation filter (`All`/`Reg M-A`/`Reg M-B`/`Reg M-C`) to
`ProfileCard.tsx`, narrowing both the Open and Closed Teamsheet sections
down to one regulation - shared by the in-app profile page and the
standalone `/u/<username>` route, since both render through this one
component. Built from `ALL_REGULATION_IDS`/`getRegulationLabel`
(`pokemonRules.ts`), the same source `TeamsPage.tsx`'s own Format Filter
Buttons use, rather than a hardcoded list - a future regulation needs no
change here. First pass gated the pill row on whether 2+ regulations were
actually present (mirroring `StatisticsPage.tsx`'s season filter instead),
which hid the control on profiles that hadn't yet mixed regulations;
switched to always rendering every option, matching `TeamsPage.tsx`'s own
convention exactly, once that was flagged live. Manually verified live.
See commit af764a6.

## [Profile Page Sections & Layout] — Leg 3 (2026-10-18)

Previewed teams on a profile page now split into separate "Open
Teamsheets"/"Closed Teamsheets" sections (`ProfileTeamSection.tsx`, each
owning its own drag-reorder scope so a drag never crosses tiers), with a
localStorage-backed grid/list layout choice (`useProfileLayout.ts`, same
pattern as `useSidebarCollapsed.ts`) controlling whether each team's
Pokemon render as poster-style tiles (`ProfilePokemonTile.tsx`) or a denser
list (`ProfilePokemonRow.tsx`) - both mirroring `TeamPosterTile.tsx`'s
team-poster-export layout instead of the old plain text-row dump, per the
visual-style redo flagged live during Teamsheet Open/Closed Visibility
Tiers Leg 3. Two follow-up fixes landed during manual verification: the
per-Pokemon grid was capped at 3 columns inside a narrow fixed-width
column, so a wide window left most of the page empty - switched to a
`@container`-keyed grid (same pattern as `TeamCardRosterGrid.tsx`'s roster
grid) inside a wider section so it actually reaches 6 columns when there's
room, and `gameDataState`/`spriteCacheState` (already mounted app-wide)
were threaded down for real type-colored move chips/item sprites when
viewing a profile from inside the app (`utils/profileGameData.ts`,
cache-only reads - the standalone `/u/<username>` route still has neither,
by design). A third fix, found while verifying this leg: public profile
sprites were being served from a Team Pokemon's stale, never-shiny-aware
stored `spriteUrl` field instead of the live `pokedexNumber`/gender/shiny
the rest of the app actually renders from - `worker/src/spriteUrl.ts`
(hand-duplicated port of the renderer's `getPixelSpriteUrl`, same
reasoning as `safetyFilter.ts`) fixes this for both tiers. Manually
verified live. See commits 634cbfb, c142488, 04f7970.

## [Drag-to-Rearrange Previewed Teams] — Leg 2 (2026-10-18)

The profile page's team preview now has its own drag-to-reorder order,
persisted via a new `Team.profileOrder` field kept deliberately separate
from the private Teams tab's `sortOrder` - reordering one never touches
the other. `useTeams.ts`'s new `setProfileTeamOrder` stamps it only on the
dragged teams; the Worker's new `sortTeamsForProfile`
(`worker/src/publicProfile.ts`) applies it before `GET /profile/:username`
responds, so owner and visitor views agree. `ProfileCard.tsx` reuses the
existing `useGridReorder` 2D hit-test drag (same one Teams/Box already
use), gated behind a new optional `onReorderTeams` prop only wired up on
your own profile. No `TeamsDatabase` schemaVersion bump - `profileOrder` is
a plain additive optional field, same precedent as `sortOrder`/`favorite`
(only `visibility`'s old-shape migration needed a real bump). A follow-up
commit fixed a z-index stacking glitch found during manual verification:
dragging a card past a taller open-tier team (extra competitive-set
content) briefly painted it behind that team instead of on top. Manually
verified live; `/leg-review` passed clean. See commits 74e8d3e, c3ddc7c.

## [Save/Import a Team From a Profile] — Leg 1 (2026-10-18)

Added an "Import to my Teams" action on any open-teamsheet team shown on
someone else's profile (own profile and closed-teamsheet teams excluded).
`ProfileCard.tsx` renders the button; `ProfilePage.tsx` converts the
`PublicTeam`'s Pokemon into `ShowdownPokemon` (new `utils/
profileTeamImport.ts`, unit-tested) and runs them through the normal
`enrichPokemonWithAPI` -> `useTeams().addTeam()` pipeline. Manually
verified live against a real test account (`cbtestimport` - see
`feedback_champions_sp_not_gen9_evs` memory note for a demo-data mistake
caught along the way, unrelated to this leg's own code). See commit
e18f589.
