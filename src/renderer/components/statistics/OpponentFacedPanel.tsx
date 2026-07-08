/**
 * OpponentFacedPanel.tsx - Most-Faced Opponent Ranking
 * Ranked list of opposing Pokemon species seen across all battles. Only
 * reflects opponents the user manually tagged during logging (see
 * OpponentPokemonEntry in types/pokemon.ts) - not a guaranteed full
 * picture of every team actually faced.
 */

import type { OpponentFacedStat } from '../../utils/battleStats';

interface OpponentFacedPanelProps {
  stats: OpponentFacedStat[];
  resolveSprite: (remoteUrl: string) => string;
}

export default function OpponentFacedPanel({ stats, resolveSprite }: OpponentFacedPanelProps) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg bg-gray-800 border border-gray-700">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Most-Faced Opponents</h3>
      {stats.length === 0 ? (
        <p className="text-sm text-gray-500">No opponent Pokemon logged yet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {stats.map(stat => (
              <div key={stat.species} className="flex items-center gap-2">
                <img src={resolveSprite(stat.spriteUrl)} alt={stat.species} className="w-8 h-8" />
                <span className="flex-1 text-sm text-gray-200 truncate">{stat.species}</span>
                <span className="text-xs text-gray-400">{stat.count} time{stat.count === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 italic">
            Based only on opponents tagged while logging - may undercount teams that weren't fully revealed.
          </p>
        </>
      )}
    </div>
  );
}
