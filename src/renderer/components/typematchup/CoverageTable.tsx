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
    <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
      <h2 className="text-sm font-bold text-gray-100 mb-3">{title}</h2>
      <table className="text-xs border-separate border-spacing-0 w-full">
        <thead>
          <tr>
            <th className="w-16" />
            {pokemon.map((p, i) => (
              <th key={i} className="pb-2 px-1" title={p.showdownData.nickname || p.showdownData.species}>
                <img
                  src={spriteCacheState.resolveSprite(
                    getPixelSpriteUrl(p.pokedexNumber, p.showdownData.species, p.showdownData.gender || 'M', p.showdownData.shiny)
                  )}
                  alt={p.showdownData.species}
                  className="w-9 h-9 mx-auto object-contain [image-rendering:pixelated]"
                />
              </th>
            ))}
            <th className="pb-2 px-2 text-gray-300 font-medium whitespace-nowrap">{unfavorableLabel}</th>
            <th className="pb-2 px-2 text-gray-300 font-medium whitespace-nowrap">{favorableLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.type} className="border-t border-gray-700">
              <td className="py-1.5 pr-2">
                <TypeBadge type={row.type} />
              </td>
              {row.cells.map((cell, i) => (
                <CoverageCell key={i} multiplier={cell} favorableWhenAbove1={favorableWhenAbove1} />
              ))}
              <td className="text-center py-1.5">
                <span className="inline-block w-6 rounded bg-orange-900/50 text-orange-300 py-0.5 font-semibold">
                  {row.unfavorableCount}
                </span>
              </td>
              <td className="text-center py-1.5">
                <span className="inline-block w-6 rounded bg-green-900/50 text-green-300 py-0.5 font-semibold">
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
