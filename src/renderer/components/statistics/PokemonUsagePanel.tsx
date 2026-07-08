/**
 * PokemonUsagePanel.tsx - Most-Used Pokemon Ranking
 * Ranked list of the player's own Pokemon by how often they were
 * brought to a battle, with their win rate when brought.
 */

import type { PokemonUsageStat } from '../../utils/battleStats';

interface PokemonUsagePanelProps {
  stats: PokemonUsageStat[];
  resolveSprite: (remoteUrl: string) => string;
}

export default function PokemonUsagePanel({ stats, resolveSprite }: PokemonUsagePanelProps) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg bg-gray-800 border border-gray-700">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Most-Used Pokemon</h3>
      {stats.length === 0 ? (
        <p className="text-sm text-gray-500">No completed battles yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {stats.map(stat => (
            <div key={stat.species} className="flex items-center gap-2">
              <img src={resolveSprite(stat.spriteUrl)} alt={stat.species} className="w-8 h-8" />
              <span className="flex-1 text-sm text-gray-200 truncate">{stat.species}</span>
              <span className="text-xs text-gray-400">
                {stat.count} battle{stat.count === 1 ? '' : 's'} - {Math.round(stat.winRate * 100)}% win
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
