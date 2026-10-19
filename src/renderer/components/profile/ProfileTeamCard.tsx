/**
 * ProfileTeamCard.tsx - One Team's Card on a Profile Page
 * Extracted out of ProfileCard.tsx (Profile Page Sections & Layout, see
 * TODO.md) once that file grew a second axis (open/closed sections) on top
 * of this one. Per-Pokemon detail now renders through ProfilePokemonTile
 * (grid layout) or ProfilePokemonRow (list layout) instead of the old
 * sprite-strip + plain-text-row OpenTeamSetPreview - see those files' own
 * header comments for the visual-style redo this replaces.
 *
 * Regulation accent border/badge color (getRegulationTheme, same as
 * TeamCard.tsx/TeamExportImageModal.tsx) now applied here too, for the same
 * "look like a real team card" reason - `team.format` is a plain `string`
 * off the Worker (not the app's own typed RegulationLabel), so
 * isRegulationLabel guards the lookup rather than asserting it.
 */

import { motion, useDragControls } from 'framer-motion';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { PublicTeam } from '../../services/syncApi';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import { getRegulationTheme } from '../../config/pokemonTheme';
import { isRegulationLabel, toRegulationId } from '../../utils/pokemonRules';
import { toMotionDragProps, type GridReorderHandlers } from '../../hooks/useGridReorder';
import { DRAG_REORDER_TRANSITION } from '../../config/motion';
import type { ProfileLayout } from '../../hooks/useProfileLayout';
import ProfilePokemonTile from './ProfilePokemonTile';
import ProfilePokemonRow from './ProfilePokemonRow';

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

export default function ProfileTeamCard({
  team,
  layout,
  gameDataState,
  spriteCacheState,
  status,
  onImportTeam,
  reorderHandlers,
}: {
  team: PublicTeam;
  layout: ProfileLayout;
  gameDataState?: UseGameDataReturn;
  spriteCacheState?: UseSpriteCacheReturn;
  status?: ImportTeamStatus;
  onImportTeam?: (team: PublicTeam) => void;
  reorderHandlers?: GridReorderHandlers;
}) {
  const dragControls = useDragControls();
  const reorderable = !!reorderHandlers;
  const detailed = team.visibility === 'open';
  const regulationTheme = getRegulationTheme(
    isRegulationLabel(team.format) ? toRegulationId(team.format) : '',
  );

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
      // Same elevated z-index-while-dragging treatment as the old
      // ProfileCard.tsx ProfileTeamCard - grid-mode tiles make open-tier
      // cards taller than closed ones, so a card picked up and dragged
      // past a taller sibling needs to stay on top for the whole drag.
      whileDrag={{ scale: 1.01, zIndex: 1, boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}
      {...(reorderHandlers ? toMotionDragProps(reorderHandlers) : {})}
      className={`rounded-lg border border-zinc-700 border-l-4 ${regulationTheme.accentBorder} bg-zinc-800 p-4`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          {reorderable && <GripHandle onPointerDown={(e) => dragControls.start(e)} />}
          <h2 className="truncate text-sm font-bold text-zinc-100">
            {team.name || 'Untitled Team'}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${regulationTheme.badgeBg}`}
          >
            {team.format}
          </span>
          {team.visibility === 'open' && onImportTeam && (
            <ImportTeamButton team={team} status={status} onImportTeam={onImportTeam} />
          )}
        </div>
      </div>

      {layout === 'grid' ? (
        // @container (not a viewport media query) - keyed off this card's own
        // rendered width, same pattern TeamCardRosterGrid.tsx's roster grid
        // uses, so a wide-but-sidebar-narrowed window still gets the right
        // column count instead of a viewport breakpoint guessing wrong.
        <div className="mt-3 @container">
          <div className="grid grid-cols-2 gap-2 @[600px]:grid-cols-3 @[1024px]:grid-cols-6">
            {team.pokemon.map((p, idx) => (
              <ProfilePokemonTile
                key={idx}
                pokemon={p}
                detailed={detailed}
                gameDataState={gameDataState}
                spriteCacheState={spriteCacheState}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-1.5">
          {team.pokemon.map((p, idx) => (
            <ProfilePokemonRow
              key={idx}
              pokemon={p}
              detailed={detailed}
              gameDataState={gameDataState}
              spriteCacheState={spriteCacheState}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
