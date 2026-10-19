/**
 * ProfileCard.tsx - Profile Content (Avatar, Favorite, Teams)
 * Pure presentational render of a fetched `PublicProfile`, extracted out of
 * PublicProfilePage.tsx so the standalone `/u/<username>` route and the
 * in-app profile page (ProfilePage.tsx) render identical content from one
 * place instead of two hand-synced copies.
 *
 * A `visibility: 'open'` team's Pokemon additionally carry the full
 * competitive set (Teamsheet Open/Closed Visibility Tiers, see TODO.md/
 * COMPLETED.md) - rendered as an expanded per-Pokemon block below the
 * sprite grid, same compact item/ability-nature/EVs/moves line layout
 * VgcPasteCatalogRow.tsx's own set preview already uses. A `'closed'` team
 * just shows the existing sprite-strip-only view.
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
 * import button away makes no sense). `profile.teams` already arrives in
 * whatever order `GET /profile/:username` applied (worker/src/publicProfile
 * .ts's sortTeamsForProfile, keyed off each team's own `profileOrder`), so
 * this component only needs to track the *local* drag-in-progress order and
 * hand the final result back - it never computes the persisted order itself.
 */

import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { motion, useDragControls } from 'framer-motion';
import type { PublicProfile, PublicTeam } from '../../services/syncApi';
import { formatEvs } from '../../utils/vgcPasteRowDisplay';
import {
  useGridReorder,
  toMotionDragProps,
  type GridReorderHandlers,
} from '../../hooks/useGridReorder';
import { DRAG_REORDER_TRANSITION } from '../../config/motion';

export type ImportTeamStatus = 'importing' | 'imported' | 'error';

function ImportTeamButton({
  team,
  status,
  onImportTeam,
}: {
  team: PublicTeam;
  status?: ImportTeamStatus;
  onImportTeam: (team: PublicTeam) => void;
}) {
  const label =
    status === 'importing'
      ? 'Importing…'
      : status === 'imported'
        ? 'Imported ✓'
        : status === 'error'
          ? 'Retry Import'
          : 'Import to my Teams';

  return (
    <button
      onClick={() => onImportTeam(team)}
      disabled={status === 'importing' || status === 'imported'}
      className="shrink-0 cursor-pointer rounded bg-accent-gold px-2 py-1 text-[10px] font-semibold text-zinc-900 transition-colors hover:bg-accent-gold-deep disabled:cursor-default disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function OpenTeamSetPreview({ pokemon }: { pokemon: PublicTeam['pokemon'] }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 border-t border-zinc-700 pt-3 sm:grid-cols-2">
      {pokemon.map((p, idx) => (
        <div key={idx} className="text-xs">
          <p className="truncate font-semibold text-zinc-100">
            {p.nickname || p.species}
            {p.item ? ` @ ${p.item}` : ''}
          </p>
          <p className="truncate text-zinc-400">
            {[p.ability, p.nature && `${p.nature} Nature`].filter(Boolean).join(' · ') || ' '}
          </p>
          {p.evs && <p className="text-zinc-400">{formatEvs(p.evs)}</p>}
          <p className="truncate text-zinc-500">{p.moves?.join(' / ') || 'No moves'}</p>
        </div>
      ))}
    </div>
  );
}

/** Same grip-icon glyph as TeamCardHeader.tsx's own drag handle, for visual consistency. */
function GripHandle({
  onPointerDown,
}: {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      title="Drag to reorder"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors select-none hover:bg-zinc-700 hover:text-zinc-200 cursor-grab"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <circle cx="9" cy="6" r="1.4" />
        <circle cx="15" cy="6" r="1.4" />
        <circle cx="9" cy="12" r="1.4" />
        <circle cx="15" cy="12" r="1.4" />
        <circle cx="9" cy="18" r="1.4" />
        <circle cx="15" cy="18" r="1.4" />
      </svg>
    </div>
  );
}

function ProfileTeamCard({
  team,
  status,
  onImportTeam,
  reorderHandlers,
}: {
  team: PublicTeam;
  status?: ImportTeamStatus;
  onImportTeam?: (team: PublicTeam) => void;
  reorderHandlers?: GridReorderHandlers;
}) {
  const dragControls = useDragControls();
  const reorderable = !!reorderHandlers;

  return (
    <motion.div
      layout="position"
      drag={reorderable}
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0}
      dragListener={false}
      dragControls={dragControls}
      data-reorder-id={team.id}
      transition={DRAG_REORDER_TRANSITION}
      // Open-tier teams render much taller than closed ones
      // (OpenTeamSetPreview below) - without an elevated z-index while
      // dragging, a card picked up and moved down past a taller open team
      // painted behind that team's extra content (later in DOM order) until
      // the hit-test's reorder actually fired, instead of staying on top for
      // the whole drag. Same whileDrag shape as PokemonCard.tsx/
      // MoveBubbleGrid.tsx's own per-slot drag handles.
      whileDrag={{ scale: 1.01, zIndex: 1, boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}
      {...(reorderHandlers ? toMotionDragProps(reorderHandlers) : {})}
      className="rounded-lg border border-zinc-700 bg-zinc-800 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          {reorderable && <GripHandle onPointerDown={(e) => dragControls.start(e)} />}
          <h2 className="truncate text-sm font-bold text-zinc-100">
            {team.name || 'Untitled Team'}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            {team.format}
          </span>
          {team.visibility === 'open' && onImportTeam && (
            <ImportTeamButton team={team} status={status} onImportTeam={onImportTeam} />
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {team.pokemon.map((p, idx) => (
          <div key={idx} className="flex flex-col items-center w-14">
            <img
              src={p.spriteUrl}
              alt={p.species}
              className="h-12 w-12 object-contain [image-rendering:pixelated]"
            />
            <span className="w-full truncate text-center text-[10px] text-zinc-400">
              {p.nickname || p.species}
            </span>
          </div>
        ))}
      </div>
      {team.visibility === 'open' && <OpenTeamSetPreview pokemon={team.pokemon} />}
    </motion.div>
  );
}

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
  // Local drag-in-progress order, resynced from profile.teams whenever its
  // identity/order actually changes (a fresh fetch, or a reorder's own
  // optimistic re-sort elsewhere) - same "adjust state during render" shape
  // as TeamsPage.tsx's orderedTeamIds, which that component's own comment
  // explains picking over an effect (an effect keyed on a fresh array every
  // render would stomp a live drag's in-progress reorder).
  const fetchedTeamIdsKey = profile.teams.map((t) => t.id).join('|');
  const [orderedTeamIds, setOrderedTeamIds] = useState(() => profile.teams.map((t) => t.id));
  const [prevFetchedTeamIdsKey, setPrevFetchedTeamIdsKey] = useState(fetchedTeamIdsKey);
  if (fetchedTeamIdsKey !== prevFetchedTeamIdsKey) {
    setPrevFetchedTeamIdsKey(fetchedTeamIdsKey);
    setOrderedTeamIds(profile.teams.map((t) => t.id));
  }
  const { containerRef, getHandlers } = useGridReorder({
    orderedIds: orderedTeamIds,
    setOrderedIds: setOrderedTeamIds,
    onCommit: (ids) => onReorderTeams?.(ids),
  });
  const reorderable = !!onReorderTeams;
  const teamsById = new Map(profile.teams.map((t) => [t.id, t]));

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
        <div
          ref={reorderable ? containerRef : undefined}
          className="mt-10 flex w-full max-w-xl flex-col gap-4"
        >
          {orderedTeamIds.map((id) => {
            const team = teamsById.get(id);
            if (!team) return null;
            return (
              <ProfileTeamCard
                key={id}
                team={team}
                status={importStatus?.[team.id]}
                onImportTeam={onImportTeam}
                reorderHandlers={reorderable ? getHandlers(id) : undefined}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
