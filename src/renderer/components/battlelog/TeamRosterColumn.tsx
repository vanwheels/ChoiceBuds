/**
 * TeamRosterColumn.tsx - Shared 6-Vertical-Row Roster List
 * Purely presentational - PlayerFieldPanel.tsx/OpponentFieldPanel.tsx each
 * map their own data/mutations into RosterRowData and pass callbacks in,
 * matching the "thin wrapper over a shared component" pattern used
 * elsewhere (e.g. OpponentInfoTags inside OpponentFieldPanel already).
 *
 * A row's main body click is context-dependent, decided by the caller via
 * onRowClick: for the player side that's "bring it" when not yet brought,
 * or "toggle active" when already brought; for the opponent side it's
 * always "toggle active". onToggleBrought (player-only) is a separate
 * small corner control so bringing/benching and active/inactive stay two
 * independent toggles instead of one click doing double duty.
 */

import type { ReactNode } from 'react';

export interface RosterRowData {
  id: string;
  species: string;
  displayName: string;
  spriteUrl: string;
  isBrought?: boolean; // undefined = the brought/benched concept doesn't apply (opponent side)
  isActive: boolean;
  isFainted: boolean;
  extra?: ReactNode; // e.g. OpponentInfoTags
}

interface TeamRosterColumnProps {
  title: string;
  titleColorClass: string;
  activeColorClass: string;
  rows: RosterRowData[];
  resolveSprite: (remoteUrl: string) => string;
  onRowClick: (id: string) => void;
  onToggleBrought?: (id: string) => void;
  onToggleFainted: (id: string) => void;
  addSlot?: ReactNode;
}

export default function TeamRosterColumn({
  title, titleColorClass, activeColorClass, rows, resolveSprite,
  onRowClick, onToggleBrought, onToggleFainted, addSlot,
}: TeamRosterColumnProps) {
  return (
    <div className="flex flex-col gap-2 w-full lg:w-56 shrink-0">
      <h3 className={`text-xs font-bold uppercase tracking-wide ${titleColorClass}`}>{title}</h3>
      <div className="flex flex-col gap-1.5">
        {rows.map(row => {
          const isBenched = row.isBrought === false;
          return (
            <div
              key={row.id}
              className={`relative p-1.5 rounded-lg border-2 transition-colors ${
                row.isFainted
                  ? 'border-gray-800 bg-gray-900/40 opacity-40'
                  : isBenched
                    ? 'border-gray-800 bg-gray-900/40 opacity-50'
                    : row.isActive
                      ? activeColorClass
                      : 'border-gray-700 bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRowClick(row.id)}
                  disabled={row.isFainted}
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer disabled:cursor-not-allowed"
                  title={isBenched ? 'Click to bring' : row.isActive ? 'Active - click to bench' : 'Click to mark active'}
                >
                  <img
                    src={resolveSprite(row.spriteUrl)}
                    alt={row.species}
                    className="w-9 h-9 object-contain [image-rendering:pixelated] shrink-0"
                  />
                  <span className="text-xs text-gray-100 truncate">{row.displayName}</span>
                </button>

                {onToggleBrought && (
                  <button
                    type="button"
                    onClick={() => onToggleBrought(row.id)}
                    title={isBenched ? 'Not brought - click to bring' : 'Brought - click to remove'}
                    className={`text-[10px] font-bold shrink-0 w-5 h-5 flex items-center justify-center rounded cursor-pointer ${
                      isBenched ? 'bg-gray-900 text-gray-600 hover:text-gray-400' : 'bg-blue-900/60 text-blue-300'
                    }`}
                  >
                    {isBenched ? '+' : '✓'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onToggleFainted(row.id)}
                  title={row.isFainted ? 'Fainted - click to revive' : 'Mark fainted'}
                  className="text-sm shrink-0 opacity-70 hover:opacity-100 cursor-pointer"
                >
                  💀
                </button>
              </div>

              {row.extra}
            </div>
          );
        })}
        {addSlot}
      </div>
    </div>
  );
}
