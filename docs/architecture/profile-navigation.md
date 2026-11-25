# In-app profile navigation

Deep-dive split out of `ARCHITECTURE.md`; the summary there links here.

- `src/renderer/hooks/useProfileNav.ts` — a back-stack of usernames (not a
  single optional field) layered on top of `ActiveTab` in both `App.tsx`/
  `AppWeb.tsx`: opening a profile pushes a username without changing the
  active tab, so "Back" just pops the stack and whichever tab was already
  active underneath reappears untouched. A real stack rather than one field
  because the profile page's own username lookup can open a second profile
  without losing the first — back from there returns to the previous
  profile, not straight to the tab. `closeProfile` resets the whole stack
  at once; `Sidebar.tsx`'s `onTabChange` calls it before switching tabs so
  picking a different tab always lands on that tab rather than leaving a
  (now-hidden) profile view stuck on screen underneath.
- `src/renderer/components/profile/ProfilePage.tsx` — renders inside
  `<main>` (not a route) whenever the stack is non-empty, sharing its
  fetch/render logic (`usePublicProfile`/`ProfileCard`) with the standalone
  `/u/<username>` route (`PublicProfilePage.tsx`) so both render off the
  same `GET /profile/:username` call via `usePublicProfile`. Own-profile
  detection compares lowercased usernames (`worker/src/index.ts` lowercases
  every lookup server-side) against `useSync`'s `syncUsername`; when they
  match, every own-profile editing affordance — favorite-Pokémon edit, each
  section's "+ Team" picker, cross-section drag, and the per-team "×"
  remove control — is permanently visible, gated only by `isOwnProfile`.
  There is no Edit-mode toggle: one shipped in Profile Editing & Visibility
  Controls Leg 4 and was removed again the same milestone (Leg 5) once it
  was clear that gating editing behind an extra click put this page out of
  step with the rest of the app's always-on-editing convention (e.g.
  `PokemonCard.tsx`'s own permanent "×"). The old always-visible
  `ProfileEditControls.tsx` panel (per-team visibility dropdowns + a
  favorite-Pokémon search box, originally moved here from Settings'
  `PublicProfileSection`) is gone outright — team visibility is instead set
  from three places, all committing through the same
  `updateTeam(team.id, { visibility })` call: the Teams tab's own
  `TeamVisibilityBadge` (next to `RegulationBadge` in
  `TeamCardHeader.tsx`), each profile section's "+ Team" picker
  (`AddTeamToProfileDialog.tsx`), and dragging a card across the
  Open/Closed boundary. `FavoritePokemonEditor.tsx` replaces the plain
  favorite-Pokémon display: the sprite (or "+" placeholder) is permanently
  clickable and opens a `Modal.tsx` popup with the species search box and
  shiny/public toggles. Edits write through the normal
  `teamsState`/`settingsState` mutators and reflect immediately; the
  `ProfileCard` preview rendered alongside can lag a few seconds behind
  since it still reflects `useSync`'s last-synced server copy.
- `ProfileCard` splits a profile's teams into "Open Teamsheets"/"Closed
  Teamsheets" sections (`ProfileTeamSection`, one instance per tier) instead
  of one flat list, and a localStorage-backed grid/list layout choice
  (`useProfileLayout`, same pattern as `useSidebarCollapsed`) controls how
  every team's Pokémon render (`ProfileTeamCard` → `ProfilePokemonTile`/
  `ProfilePokemonRow`) — a visual-style redo so both tiers read as real team
  cards (sprite/item/ability/moves/stat-alignment, mirroring
  `TeamPosterTile.tsx`'s team-poster-export layout) rather than plain text
  rows. `gameDataState`/`spriteCacheState` (App.tsx/AppWeb.tsx mount both
  once, app-wide) are threaded down from `ProfilePage` through to
  `ProfilePokemonTile`/`ProfilePokemonRow` (`utils/profileGameData.ts`'s
  cache-only lookups, same as `TeamPosterTile`'s — never a live PokeAPI
  fetch, so viewing a profile never adds new network calls) for real
  type-colored move chips and PokeAPI-sourced item icons there. Both props
  are optional on every component in this chain, since the standalone
  `/u/<username>` route (`PublicProfilePage.tsx`) deliberately never pulls
  in the PokeAPI-backed game-data cache (see `web-build.md`) —
  without them, items only get an icon via `getItemFallbackSpriteUrl`'s
  static Serebii fallback set and moves render as neutral chips.
  `ProfileCard` itself (not each section) owns both tiers' ordered-id
  arrays via `useCrossTierReorder` (a `useGridReorder`-adjacent hook reusing
  its pure `pickSlotIndex`/`moveToIndex`), so a drag crossing the
  Open/Closed boundary can move an id out of one tier's array and into the
  other's — committing through `onAddTeamToTier` (the visibility write)
  then `onReorderTeams` (the dropped-at-the-end position), only persisting
  the latter once the former actually succeeds. This is safe even though
  `Team.profileOrder` is one flat field across every team because
  `sortTeamsForProfile` is a stable sort and the section split happens
  again, client-side, before either array's order is read.
  Because `usePublicProfile`'s fetch is one-shot and never refreshes
  mid-session, `ProfileCard` keeps its own optimistic local state so
  adds/removes/moves show immediately instead of waiting on a reload:
  `utils/publicTeamSynthesis.ts`'s `synthesizePublicTeam` (mirroring
  `worker/src/publicProfile.ts`'s `extractPublicTeam`) builds a client-side
  `PublicTeam` stand-in for a team added to a tier for the first time (one
  with no real `PublicTeam` yet), merged into an overlay map. Each tier's
  ordered-id array is still resynced only off the *real* fetched teams
  (never the overlay-merged list) — keying the resync off the overlay
  instead would reset straight back to the stale fetch and resurrect a team
  removed earlier in the same session the moment any unrelated add changed
  what the merged list contains (confirmed live during Leg 5).
- Pinned via `Sidebar.tsx`'s footer entry (desktop rail + mobile drawer,
  hidden entirely when signed out) above the Settings entry, reusing the
  same `renderNavItem` row styling/active-highlight the tab items use —
  generalized to take an explicit `isActive`/key pair instead of deriving
  it from `ActiveTab`.
- `ProfileCard`'s per-section regulation filter (pill row: All plus one
  pill per regulation, built off the same `ALL_REGULATION_IDS`/
  `getRegulationLabel` source `TeamsPage.tsx`'s own Format Filter Buttons
  use) narrows both Open/Closed sections to one regulation at a time;
  shared by the in-app profile page and the standalone `/u/<username>`
  route since both render through `ProfileCard`.
- Any open-teamsheet team on someone else's profile (own profile and
  closed-teamsheet teams excluded) gets an "Import to my Teams" action:
  `utils/profileTeamImport.ts` converts the `PublicTeam`'s Pokemon into
  `ShowdownPokemon`, then runs them through the normal
  `enrichPokemonWithAPI` → `useTeams().addTeam()` pipeline — the same path
  a pasted Showdown export goes through, not a separate import mechanism.
