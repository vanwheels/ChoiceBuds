/**
 * ProfileCard.tsx - Profile Content (Avatar, Favorite, Team Sections)
 * Pure presentational render of a fetched `PublicProfile`, extracted out of
 * PublicProfilePage.tsx so the standalone `/u/<username>` route and the
 * in-app profile page (ProfilePage.tsx) render identical content from one
 * place instead of two hand-synced copies.
 *
 * Profile Page Sections & Layout (see TODO.md): teams now split into
 * "Open Teamsheets"/"Closed Teamsheets" sections (ProfileTeamSection.tsx -
 * see its own header for why a drag never crosses between them) instead of
 * one flat list, with a grid/list layout toggle (useProfileLayout.ts,
 * localStorage-backed, same as useSidebarCollapsed.ts) controlling how
 * every team card's per-Pokemon detail renders (ProfileTeamCard.tsx).
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
 */

import type { PublicProfile, PublicTeam } from '../../services/syncApi';
import { useProfileLayout } from '../../hooks/useProfileLayout';
import type { ImportTeamStatus } from './ProfileTeamCard';
import ProfileTeamSection from './ProfileTeamSection';

export type { ImportTeamStatus } from './ProfileTeamCard';

export default function ProfileCard({
  profile,
  onImportTeam,
  importStatus,
  onReorderTeams,
}: {
  profile: PublicProfile;
  onImportTeam?: (team: PublicTeam) => void;
  importStatus?: Record<string, ImportTeamStatus>;
  onReorderTeams?: (orderedIds: string[]) => void;
}) {
  const { layout, setLayout } = useProfileLayout();
  const openTeams = profile.teams.filter((t) => t.visibility === 'open');
  const closedTeams = profile.teams.filter((t) => t.visibility === 'closed');

  return (
    <>
      <img src="/mascot.png" alt="" className="h-20 w-20" />
      <h1 className="mt-6 text-2xl font-bold">{profile.username}</h1>

      {profile.favoritePokemon && (
        <div className="mt-6 flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Favorite Pokémon
          </span>
          <img
            src={profile.favoritePokemon.spriteUrl}
            alt={profile.favoritePokemon.species}
            className="h-20 w-20 object-contain [image-rendering:pixelated]"
          />
          <span className="text-sm text-zinc-300">{profile.favoritePokemon.species}</span>
        </div>
      )}

      {profile.teams.length > 0 && (
        <div className="mt-10 flex w-full max-w-xl items-center justify-end gap-1.5">
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
      )}

      <ProfileTeamSection
        title="Open Teamsheets"
        teams={openTeams}
        layout={layout}
        onImportTeam={onImportTeam}
        importStatus={importStatus}
        onReorderTeams={onReorderTeams}
      />

      <ProfileTeamSection
        title="Closed Teamsheets"
        teams={closedTeams}
        layout={layout}
        onImportTeam={onImportTeam}
        importStatus={importStatus}
        onReorderTeams={onReorderTeams}
      />
    </>
  );
}
