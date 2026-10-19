/**
 * ProfileCard.tsx - Profile Content (Avatar, Favorite, Team Sections)
 * Pure presentational render of a fetched `PublicProfile`, extracted out of
 * PublicProfilePage.tsx so the standalone `/u/<username>` route and the
 * in-app profile page (ProfilePage.tsx) render identical content from one
 * place instead of two hand-synced copies.
 *
 * Profile Page Sections & Layout (see TODO.md): teams now split into
 * "Open Teamsheets"/"Closed Teamsheets" sections (ProfileTeamSection.tsx)
 * instead of one flat list, with a grid/list layout toggle
 * (useProfileLayout.ts, localStorage-backed, same as
 * useSidebarCollapsed.ts) controlling how every team card's per-Pokemon
 * detail renders (ProfileTeamCard.tsx).
 *
 * `onImportTeam`/`importStatus` (Save/Import a Team From a Profile, see
 * TODO.md) are optional - the standalone, unauthenticated `/u/<username>`
 * route (PublicProfilePage.tsx) never passes them, since it has no Teams
 * state to import into. ProfilePage.tsx (the in-app view) passes
 * `onImportTeam={undefined}` when `username` is the viewer's own profile,
 * so the action never appears there either. Only an `open`-visibility team
 * gets the action - a `closed` team has no competitive set to import.
 *
 * `onReorderTeams` (Drag-to-Rearrange Previewed Teams, see TODO.md) is
 * likewise optional and only ever passed by ProfilePage.tsx on your own
 * profile - same isOwnProfile gate as onImportTeam, just the opposite
 * direction (you can't drag someone else's preview, and dragging your own
 * import button away makes no sense).
 *
 * `localTeams`/`onAddTeamToTier` (Profile Section Add-Team Picker, see
 * TODO.md) are the same isOwnProfile-only pair again, feeding each
 * section's "+ Team" box. `localTeams` is ProfilePage.tsx's full local
 * `teamsState.teams` (not `profile.teams`, the synced/lagging copy this
 * component otherwise renders from - same reasoning as `favoriteEditing`
 * below), filtered here per tier to teams not already in it.
 * `onAddTeamToTier` is also what commits a cross-section drag below - both
 * are just "set this team's visibility to this tier", the picker just
 * drives it from a dialog instead of a drop.
 *
 * Profile Section Drag-and-Drop Between Open/Closed (see TODO.md): the two
 * ProfileTeamSection instances no longer each own their own reorder state -
 * a drag that crosses between them has to move the dragged id out of one
 * section's ids and into the other's, which only this shared parent can
 * coordinate. `useCrossTierReorder` (a useGridReorder-adjacent hook - see
 * its own header comment) owns both sections' ordered-id arrays and hands
 * back one containerRef + one getHandlers per tier. Committing a same-tier
 * reorder still calls `onReorderTeams` exactly as before; committing a
 * cross-tier move calls `onAddTeamToTier` (the real visibility write) then
 * `onReorderTeams` (to persist the dropped-at-the-end position in the new
 * tier) - same two existing props, no new ones needed.
 *
 * `gameDataState`/`spriteCacheState`/`databaseState` are optional for the
 * same reason - ProfilePage.tsx (in-app) always has all three (App.tsx/
 * AppWeb.tsx mount them once, app-wide) and passes them through for real
 * type-colored move chips/item sprites/the same per-type `.type-glow-ring`
 * card treatment PokemonCard.tsx/BoxCard.tsx use (Profile Previews UI
 * Consistency Pass, see TODO.md); PublicProfilePage.tsx never does, since
 * that route deliberately pulls in nothing beyond the one profile fetch
 * (see its own header comment). See ProfilePokemonTile.tsx for the fallback
 * rendering that keeps working without them.
 *
 * Regulation Filter on Profile Page (see TODO.md): a pill row - same
 * always-show-every-option convention as TeamsPage.tsx's own Format Filter
 * Buttons (never gated by what's actually present) and the same active/
 * inactive styling as the layout toggle below - narrows `profile.teams` to
 * one regulation before the open/closed split, so both the in-app and
 * standalone routes get the filter for free from this one shared component.
 *
 * `favoriteEditing` (Profile Edit Mode: Inline Favorite Pokemon Editing,
 * see TODO.md) is the same isOwnProfile-only-and-optional shape as the
 * props above, passed only by ProfilePage.tsx when its Edit toggle is on.
 * When present it swaps the plain favorite-Pokemon display for
 * FavoritePokemonEditor, rendering live local settings state (so edits
 * reflect instantly) instead of `profile.favoritePokemon`'s lagging synced
 * copy - same reasoning as the other own-profile-only props using
 * `localTeams` instead of `profile.teams`.
 *
 * `onRemoveTeam` (Profile Section Remove-Team Control, see TODO.md) is the
 * same isOwnProfile-and-edit-mode-only shape as `favoriteEditing` - passed
 * through unchanged to both ProfileTeamSection instances, which thread it
 * down to each ProfileTeamCard's own "x" button. It's the one way left to
 * take a team back out of its Open/Closed section from the profile page
 * itself, now that the old per-team visibility dropdown is gone.
 */

import { useMemo, useState } from 'react';
import type { PublicProfile, PublicTeam } from '../../services/syncApi';
import type { Team } from '../../types/pokemon';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import type { UseDatabaseReturn } from '../../hooks/useDatabase';
import { useProfileLayout } from '../../hooks/useProfileLayout';
import { useCrossTierReorder } from '../../hooks/useCrossTierReorder';
import {
  ALL_REGULATION_IDS,
  getRegulationLabel,
  isRegulationLabel,
  toRegulationId,
  type RegulationId,
} from '../../utils/pokemonRules';
import type { ImportTeamStatus } from './ProfileTeamCard';
import ProfileTeamSection from './ProfileTeamSection';
import FavoritePokemonEditor, { type FavoritePokemonEditorProps } from './FavoritePokemonEditor';

export type { ImportTeamStatus } from './ProfileTeamCard';

const ALL_REGULATIONS = 'All';
type RegulationFilter = RegulationId | typeof ALL_REGULATIONS;
const REGULATION_FILTERS: RegulationFilter[] = [ALL_REGULATIONS, ...ALL_REGULATION_IDS];

export default function ProfileCard({
  profile,
  gameDataState,
  spriteCacheState,
  databaseState,
  onImportTeam,
  importStatus,
  onReorderTeams,
  localTeams,
  onAddTeamToTier,
  favoriteEditing,
  onRemoveTeam,
}: {
  profile: PublicProfile;
  gameDataState?: UseGameDataReturn;
  spriteCacheState?: UseSpriteCacheReturn;
  databaseState?: UseDatabaseReturn;
  onImportTeam?: (team: PublicTeam) => void;
  importStatus?: Record<string, ImportTeamStatus>;
  onReorderTeams?: (orderedIds: string[]) => void;
  localTeams?: Team[];
  onAddTeamToTier?: (teamId: string, tier: 'open' | 'closed') => Promise<boolean>;
  favoriteEditing?: FavoritePokemonEditorProps;
  onRemoveTeam?: (teamId: string) => void;
}) {
  const { layout, setLayout } = useProfileLayout();
  const [regulationFilter, setRegulationFilter] = useState<RegulationFilter>(ALL_REGULATIONS);

  const filteredTeams = useMemo(
    () =>
      regulationFilter === ALL_REGULATIONS
        ? profile.teams
        : profile.teams.filter(
            (t) => isRegulationLabel(t.format) && toRegulationId(t.format) === regulationFilter,
          ),
    [profile.teams, regulationFilter],
  );

  const openTeams = filteredTeams.filter((t) => t.visibility === 'open');
  const closedTeams = filteredTeams.filter((t) => t.visibility === 'closed');
  const teamsById = new Map(filteredTeams.map((t) => [t.id, t]));

  const availableForOpen = localTeams?.filter((t) => t.visibility !== 'open');
  const availableForClosed = localTeams?.filter((t) => t.visibility !== 'closed');

  // Same "adjust state during render" resync ProfileTeamSection.tsx used to
  // do itself, now once per tier here instead - each tier's ordered-id
  // array has to live above both sections so a cross-tier drag can move an
  // id from one into the other.
  const openIdsKey = openTeams.map((t) => t.id).join('|');
  const closedIdsKey = closedTeams.map((t) => t.id).join('|');
  const [openOrderedIds, setOpenOrderedIds] = useState(() => openTeams.map((t) => t.id));
  const [closedOrderedIds, setClosedOrderedIds] = useState(() => closedTeams.map((t) => t.id));
  const [prevOpenIdsKey, setPrevOpenIdsKey] = useState(openIdsKey);
  const [prevClosedIdsKey, setPrevClosedIdsKey] = useState(closedIdsKey);
  if (openIdsKey !== prevOpenIdsKey) {
    setPrevOpenIdsKey(openIdsKey);
    setOpenOrderedIds(openTeams.map((t) => t.id));
  }
  if (closedIdsKey !== prevClosedIdsKey) {
    setPrevClosedIdsKey(closedIdsKey);
    setClosedOrderedIds(closedTeams.map((t) => t.id));
  }

  const { containerRefs, getHandlers } = useCrossTierReorder({
    tiers: {
      open: { ids: openOrderedIds, setIds: setOpenOrderedIds },
      closed: { ids: closedOrderedIds, setIds: setClosedOrderedIds },
    },
    onReorder: (_tier, ids) => onReorderTeams?.(ids),
    onMoveTier: (teamId, toTier, ids) => {
      // Only persist the dropped-at-the-end order if the visibility write
      // actually landed - otherwise a failed write still leaves the team
      // stamped with a profileOrder for a tier its visibility never joined.
      void onAddTeamToTier?.(teamId, toTier)?.then((success) => {
        if (success) onReorderTeams?.(ids);
      });
    },
  });
  const reorderable = !!onReorderTeams;
  const publicFavorite = profile.favoritePokemon;

  return (
    <>
      <img src="/mascot.png" alt="" className="h-20 w-20" />
      <h1 className="mt-6 text-2xl font-bold">{profile.username}</h1>

      {(favoriteEditing || publicFavorite) && (
        <div className="mt-6 flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Favorite Pokémon
          </span>
          {favoriteEditing ? (
            <FavoritePokemonEditor {...favoriteEditing} />
          ) : publicFavorite ? (
            <>
              <img
                src={publicFavorite.spriteUrl}
                alt={publicFavorite.species}
                className="h-20 w-20 object-contain [image-rendering:pixelated]"
              />
              <span className="text-sm text-zinc-300">{publicFavorite.species}</span>
            </>
          ) : null}
        </div>
      )}

      {profile.teams.length > 0 && (
        <div className="mt-10 flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {REGULATION_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setRegulationFilter(filter)}
                className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  regulationFilter === filter
                    ? 'bg-accent-gold text-zinc-900'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                {filter === ALL_REGULATIONS ? 'All' : getRegulationLabel(filter)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Layout:
            </span>
            <div className="flex overflow-hidden rounded-lg border border-zinc-600">
              <button
                onClick={() => setLayout('grid')}
                title="Grid of per-Pokemon tiles, mirroring the team-poster export"
                className={`cursor-pointer px-3 py-1 text-xs font-medium transition-colors ${
                  layout === 'grid'
                    ? 'bg-accent-gold text-zinc-900'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setLayout('list')}
                title="Denser one-row-per-Pokemon list"
                className={`cursor-pointer px-3 py-1 text-xs font-medium transition-colors ${
                  layout === 'list'
                    ? 'bg-accent-gold text-zinc-900'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileTeamSection
        title="Open Teamsheets"
        tier="open"
        orderedTeamIds={openOrderedIds}
        teamsById={teamsById}
        layout={layout}
        gameDataState={gameDataState}
        spriteCacheState={spriteCacheState}
        databaseState={databaseState}
        onImportTeam={onImportTeam}
        importStatus={importStatus}
        containerRef={reorderable ? containerRefs.open : undefined}
        getHandlers={reorderable ? (id) => getHandlers(id, 'open') : undefined}
        availableTeamsToAdd={availableForOpen}
        onAddTeam={onAddTeamToTier ? (teamId) => onAddTeamToTier(teamId, 'open') : undefined}
        onRemoveTeam={onRemoveTeam}
      />

      <ProfileTeamSection
        title="Closed Teamsheets"
        tier="closed"
        orderedTeamIds={closedOrderedIds}
        teamsById={teamsById}
        layout={layout}
        gameDataState={gameDataState}
        spriteCacheState={spriteCacheState}
        databaseState={databaseState}
        onImportTeam={onImportTeam}
        importStatus={importStatus}
        containerRef={reorderable ? containerRefs.closed : undefined}
        getHandlers={reorderable ? (id) => getHandlers(id, 'closed') : undefined}
        availableTeamsToAdd={availableForClosed}
        onAddTeam={onAddTeamToTier ? (teamId) => onAddTeamToTier(teamId, 'closed') : undefined}
        onRemoveTeam={onRemoveTeam}
      />
    </>
  );
}
