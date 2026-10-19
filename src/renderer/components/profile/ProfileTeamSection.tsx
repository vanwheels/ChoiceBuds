/**
 * ProfileTeamSection.tsx - Open/Closed Teamsheet Section on a Profile Page
 * Profile Page Sections & Layout (see TODO.md): previewed teams now group
 * into separate "Open Teamsheets"/"Closed Teamsheets" sections instead of
 * one flat list, so a visitor can tell at a glance which teams reveal full
 * sets vs. species/sprites only.
 *
 * Purely presentational: `orderedTeamIds`/`teamsById`/`containerRef`/
 * `getHandlers` are all owned by ProfileCard.tsx now, not computed here
 * (Profile Section Drag-and-Drop Between Open/Closed, see TODO.md) - a
 * cross-section drag has to move an id out of one section's array and
 * into the other's, which only the shared parent can coordinate.
 * ProfileCard.tsx's own useCrossTierReorder call is what actually does
 * that; this component just renders whatever ids/handlers it's handed.
 * `team.visibility` is overridden to this section's own `tier` when
 * rendering a card rather than trusting the fetched `PublicTeam`'s own
 * value - once a drag moves a team's id into this section's
 * `orderedTeamIds`, it has to look like it belongs here immediately, even
 * before the real `updateTeam` write (and the next profile refetch that
 * would otherwise reflect it) lands.
 *
 * Profile Section Add-Team Picker (see TODO.md): the trailing "+ Team" box
 * (only rendered when `onAddTeam` is passed - ProfileCard.tsx only wires it
 * up on your own profile, same isOwnProfile gate as the drag/reorder
 * plumbing above) opens AddTeamToProfileDialog.tsx. `availableTeamsToAdd`
 * is pre-filtered by ProfileCard.tsx to teams not already in this tier, so
 * an otherwise-empty section (e.g. the first team ever added to Closed)
 * still needs to render its header + the "+ Team" box rather than bailing
 * out via the `orderedTeamIds.length === 0` check below.
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { RefObject } from 'react';
import type { PublicTeam } from '../../services/syncApi';
import type { Team } from '../../types/pokemon';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import type { UseDatabaseReturn } from '../../hooks/useDatabase';
import type { GridReorderHandlers } from '../../hooks/useGridReorder';
import type { ProfileTier } from '../../hooks/useCrossTierReorder';
import type { ProfileLayout } from '../../hooks/useProfileLayout';
import ProfileTeamCard, { type ImportTeamStatus } from './ProfileTeamCard';
import AddTeamToProfileDialog from './AddTeamToProfileDialog';

interface ProfileTeamSectionProps {
  title: string;
  tier: ProfileTier;
  orderedTeamIds: string[];
  teamsById: Map<string, PublicTeam>;
  layout: ProfileLayout;
  gameDataState?: UseGameDataReturn;
  spriteCacheState?: UseSpriteCacheReturn;
  databaseState?: UseDatabaseReturn;
  onImportTeam?: (team: PublicTeam) => void;
  importStatus?: Record<string, ImportTeamStatus>;
  containerRef?: RefObject<HTMLDivElement | null>;
  getHandlers?: (id: string) => GridReorderHandlers;
  availableTeamsToAdd?: Team[];
  onAddTeam?: (teamId: string) => Promise<boolean>;
  onRemoveTeam?: (teamId: string) => void;
}

export default function ProfileTeamSection({
  title,
  tier,
  orderedTeamIds,
  teamsById,
  layout,
  gameDataState,
  spriteCacheState,
  databaseState,
  onImportTeam,
  importStatus,
  containerRef,
  getHandlers,
  availableTeamsToAdd,
  onAddTeam,
  onRemoveTeam,
}: ProfileTeamSectionProps) {
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);

  if (orderedTeamIds.length === 0 && !onAddTeam) return null;

  return (
    // max-w-6xl (not max-w-xl like the rest of the profile page) - the same
    // wide-modal convention CalcPopup.tsx/TeamExportImageModal.tsx already
    // use, so the per-Pokemon grid (ProfileTeamCard.tsx) actually has room to
    // reach its own @[1024px]:grid-cols-6 breakpoint on a normal desktop
    // window instead of being squeezed into the page's narrow text-column
    // width.
    <div className="mt-6 flex w-full max-w-6xl flex-col gap-2">
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      <div ref={containerRef} className="flex flex-col gap-4">
        {orderedTeamIds.map((id) => {
          const team = teamsById.get(id);
          if (!team) return null;
          return (
            <ProfileTeamCard
              key={id}
              team={team.visibility === tier ? team : { ...team, visibility: tier }}
              layout={layout}
              gameDataState={gameDataState}
              spriteCacheState={spriteCacheState}
              databaseState={databaseState}
              status={importStatus?.[team.id]}
              onImportTeam={onImportTeam}
              reorderHandlers={getHandlers?.(id)}
              onRemoveTeam={onRemoveTeam}
            />
          );
        })}
        {onAddTeam && (
          <button
            onClick={() => setIsAddTeamOpen(true)}
            className="w-full rounded-lg border-2 border-dashed border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-500 transition-colors cursor-pointer hover:border-accent-gold hover:text-accent-gold"
          >
            + Team
          </button>
        )}
      </div>
      <AnimatePresence>
        {isAddTeamOpen && onAddTeam && (
          <AddTeamToProfileDialog
            availableTeams={availableTeamsToAdd ?? []}
            spriteCacheState={spriteCacheState}
            onAddTeam={onAddTeam}
            onClose={() => setIsAddTeamOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
