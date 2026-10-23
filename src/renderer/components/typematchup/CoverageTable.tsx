/**
 * CoverageTable.tsx - Shared Layout for Offensive/Defensive Coverage Tables
 * Both tables are structurally identical (18 type rows, one column per team
 * slot, two aggregate count columns) - only the data, column labels, and
 * which direction counts as "favorable" differ, so a single generic table
 * covers both rather than duplicating markup.
 */

import type { ImportedPokemonInfo } from '../../types/pokemon';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import type { CoverageRow } from '../../utils/typeCoverage';
import { getPixelSpriteUrl } from '../../utils/spriteUrl';
import TypeBadge from '../TypeBadge';
import CoverageCell from './CoverageCell';

// Threshold coloring for the two aggregate count columns (how many team
// slots land on each side for this type), independent of CoverageCell's
// per-cell magnitude palette - a row with 4+ weaknesses reads as a real
// team-building problem (red) even if none of the individual hits is a 4x.
const COUNT_BADGE = 'inline-block w-6 rounded py-0.5 font-semibold';

function unfavorableCountClasses(count: number): string {
  if (count === 0) return `${COUNT_BADGE} bg-zinc-700 text-zinc-300`;
  if (count >= 3) return `${COUNT_BADGE} bg-red-900/50 text-red-300`;
  return `${COUNT_BADGE} bg-yellow-900/50 text-yellow-300`;
}

function favorableCountClasses(count: number): string {
  if (count === 0) return `${COUNT_BADGE} bg-yellow-900/50 text-yellow-300`;
  if (count >= 3) return `${COUNT_BADGE} bg-blue-900/50 text-blue-300`;
  return `${COUNT_BADGE} bg-green-900/50 text-green-300`;
}

interface CoverageTableProps {
  title: string;
  pokemon: ImportedPokemonInfo[];
  rows: CoverageRow[];
  favorableWhenAbove1: boolean;
  unfavorableLabel: string;
  favorableLabel: string;
  spriteCacheState: UseSpriteCacheReturn;
}

export default function CoverageTable({
  title,
  pokemon,
  rows,
  favorableWhenAbove1,
  unfavorableLabel,
  favorableLabel,
  spriteCacheState,
}: CoverageTableProps) {
  return (
    <div className="bg-zinc-800 rounded-lg p-4 overflow-x-auto">
      <h2 className="text-sm font-bold text-zinc-100 mb-3">{title}</h2>
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr className="bg-zinc-900/60">
            <th className="w-20 border border-zinc-700/60" />
            {pokemon.map((p, i) => (
              <th
                key={i}
                className="py-1.5 px-1 border border-zinc-700/60"
                title={p.showdownData.nickname || p.showdownData.species}
              >
                <img
                  src={spriteCacheState.resolveSprite(
                    getPixelSpriteUrl(
                      p.pokedexNumber,
                      p.showdownData.species,
                      p.showdownData.gender || 'M',
                      p.showdownData.shiny,
                    ),
                  )}
                  alt={p.showdownData.species}
                  className="w-9 h-9 mx-auto object-contain [image-rendering:pixelated]"
                />
              </th>
            ))}
            <th className="py-1.5 px-2 text-zinc-300 font-medium whitespace-nowrap border border-zinc-700/60">
              {unfavorableLabel}
            </th>
            <th className="py-1.5 px-2 text-zinc-300 font-medium whitespace-nowrap border border-zinc-700/60">
              {favorableLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.type} className={i % 2 === 1 ? 'bg-zinc-900/30' : undefined}>
              <td className="py-1.5 px-2 border border-zinc-700/60">
                <TypeBadge type={row.type} />
              </td>
              {row.cells.map((cell, j) => (
                <CoverageCell key={j} multiplier={cell} favorableWhenAbove1={favorableWhenAbove1} />
              ))}
              <td className="text-center py-1.5 border border-zinc-700/60">
                <span className={unfavorableCountClasses(row.unfavorableCount)}>
                  {row.unfavorableCount}
                </span>
              </td>
              <td className="text-center py-1.5 border border-zinc-700/60">
                <span className={favorableCountClasses(row.favorableCount)}>
                  {row.favorableCount}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
