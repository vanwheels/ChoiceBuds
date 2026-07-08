/**
 * TeamRosterColumn.tsx - Shared 6-Vertical-Row Roster List
 * Purely presentational - PlayerFieldPanel.tsx/OpponentFieldPanel.tsx each
 * map their own data/mutations into RosterRowData and pass callbacks in,
 * matching the "thin wrapper over a shared component" pattern used
 * elsewhere. Both sides render the same compact per-row layout (sprite+name,
 * then Ability | Move 1+2, then Item | Move 3+4) - the player side's cells
 * are plain read-only text (its set is fixed at battle start), the
 * opponent's are live editable controls (OpponentRowFields.tsx) - either
 * way RosterRow.tsx just drops whatever ReactNode it's given into each grid
 * cell, so this component and its layout stay identical for both sides.
 *
 * A row's main body click is the one meaningful action for its side,
 * decided by the caller via onRowClick: for the player side that's
 * "toggle brought" (0-4 of the 6); the opponent side no longer does
 * anything on row click (active-switching for both sides now lives
 * entirely on the Battlefield - click an empty slot, or (when
 * `enableDrag` is set) drag a row onto one) - isActive here just drives
 * the highlighted-border visual, read-only. Fainted state is likewise
 * read-only here (a skull indicator only) - it's set from the
 * Battlefield now too, since a Pokemon can only faint while active.
 * Per-row rendering (mega sprite swap, drag payload) lives in
 * RosterRow.tsx - split out as a real component so useMegaSprite (a
 * hook) has a stable per-row lifecycle.
 */

import type { ReactNode } from 'react';
import type { BattleSide } from '../../types/pokemon';
import RosterRow from './RosterRow';

export interface RosterRowData {
  id: string;
  species: string;
  displayName: string;
  spriteUrl: string;
  item?: string; // raw value, needed to resolve the Mega sprite - see RosterRow.tsx
  isMega?: boolean;
  isBrought?: boolean; // undefined = the brought/benched concept doesn't apply (opponent side)
  isActive: boolean;
  isFainted: boolean;
  ability: ReactNode; // Ability cell content - plain text (player) or an editable control (opponent)
  itemDisplay: ReactNode; // Item cell content - plain text (player) or an editable control (opponent)
  moves: [ReactNode, ReactNode, ReactNode, ReactNode]; // Move 1-4 cell content
  extra?: ReactNode; // anything below the grid - e.g. the Consumed checkbox/ability chip (OpponentRowFields.tsx)
}

interface TeamRosterColumnProps {
  title: string;
  titleColorClass: string;
  activeColorClass: string;
  side: BattleSide;
  rows: RosterRowData[];
  resolveSprite: (remoteUrl: string) => string;
  onRowClick: (id: string) => void;
  addSlot?: ReactNode;
  enableDrag?: boolean; // lets a draggable row be dropped onto a Battlefield slot
}

export default function TeamRosterColumn({
  title, titleColorClass, activeColorClass, side, rows, resolveSprite,
  onRowClick, addSlot, enableDrag,
}: TeamRosterColumnProps) {
  return (
    <div className="flex flex-col gap-2 w-full lg:w-56 shrink-0">
      <h3 className={`text-xs font-bold uppercase tracking-wide ${titleColorClass}`}>{title}</h3>
      <div className="flex flex-col gap-1">
        {rows.map(row => (
          <RosterRow
            key={row.id}
            row={row}
            side={side}
            activeColorClass={activeColorClass}
            resolveSprite={resolveSprite}
            onRowClick={onRowClick}
            enableDrag={enableDrag}
          />
        ))}
        {addSlot}
      </div>
    </div>
  );
}
