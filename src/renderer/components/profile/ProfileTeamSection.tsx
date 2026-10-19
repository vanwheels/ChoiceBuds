/**
 * ProfileTeamSection.tsx - Open/Closed Teamsheet Section on a Profile Page
 * Profile Page Sections & Layout (see TODO.md): previewed teams now group
 * into separate "Open Teamsheets"/"Closed Teamsheets" sections instead of
 * one flat list, so a visitor can tell at a glance which teams reveal full
 * sets vs. species/sprites only.
 *
 * Owns its own local drag-in-progress order + useGridReorder instance,
 * scoped to just this section's team ids - a drag never crosses between
 * open and closed (dragging a team to the other section would silently
 * change what it reveals, which belongs to ProfileEditControls' visibility
 * picker, not a reorder). Committing only this section's ids through
 * `onReorderTeams` is safe even though `Team.profileOrder` is one flat
 * field across every team (not per-tier) - useTeams.ts's
 * setProfileTeamOrder only stamps teams named in the array it's given, and
 * worker/src/publicProfile.ts's sortTeamsForProfile is a stable sort that
 * only compares entries that both have a profileOrder, so two sections each
 * independently numbering their own teams 0..n never cross-contaminate: the
 * section split happens again, client-side, before either array's order is
 * read.
 */

import { useState } from 'react';
import type { PublicTeam } from '../../services/syncApi';
import { useGridReorder } from '../../hooks/useGridReorder';
import type { ProfileLayout } from '../../hooks/useProfileLayout';
import ProfileTeamCard, { type ImportTeamStatus } from './ProfileTeamCard';

interface ProfileTeamSectionProps {
  title: string;
  teams: PublicTeam[];
  layout: ProfileLayout;
  onImportTeam?: (team: PublicTeam) => void;
  importStatus?: Record<string, ImportTeamStatus>;
  onReorderTeams?: (orderedIds: string[]) => void;
}

export default function ProfileTeamSection({
  title,
  teams,
  layout,
  onImportTeam,
  importStatus,
  onReorderTeams,
}: ProfileTeamSectionProps) {
  // Same "adjust state during render" resync as the old ProfileCard.tsx -
  // see its prior header comment (now scoped to just this section's ids).
  const fetchedTeamIdsKey = teams.map((t) => t.id).join('|');
  const [orderedTeamIds, setOrderedTeamIds] = useState(() => teams.map((t) => t.id));
  const [prevFetchedTeamIdsKey, setPrevFetchedTeamIdsKey] = useState(fetchedTeamIdsKey);
  if (fetchedTeamIdsKey !== prevFetchedTeamIdsKey) {
    setPrevFetchedTeamIdsKey(fetchedTeamIdsKey);
    setOrderedTeamIds(teams.map((t) => t.id));
  }
  const { containerRef, getHandlers } = useGridReorder({
    orderedIds: orderedTeamIds,
    setOrderedIds: setOrderedTeamIds,
    onCommit: (ids) => onReorderTeams?.(ids),
  });
  const reorderable = !!onReorderTeams;
  const teamsById = new Map(teams.map((t) => [t.id, t]));

  if (teams.length === 0) return null;

  return (
    <div className="mt-6 flex w-full max-w-xl flex-col gap-2">
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      <div ref={reorderable ? containerRef : undefined} className="flex flex-col gap-4">
        {orderedTeamIds.map((id) => {
          const team = teamsById.get(id);
          if (!team) return null;
          return (
            <ProfileTeamCard
              key={id}
              team={team}
              layout={layout}
              status={importStatus?.[team.id]}
              onImportTeam={onImportTeam}
              reorderHandlers={reorderable ? getHandlers(id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
