/**
 * TeamRosterUsagePanel.tsx - Per-Team Roster Brought-Rate
 * One self-contained card per team, listing every roster Pokemon that's
 * shown up in a completed battle's Team Preview for that team, with a bar
 * showing how often it was actually brought vs. sitting unused. Separate
 * from PokemonUsagePanel (global, brought-only) - this one has a real
 * denominator per team, so an unused roster member still shows up as a 0%
 * row instead of being invisible.
 */

import type { TeamRosterUsage } from '../../utils/battleStats';

interface TeamRosterUsagePanelProps {
  usage: TeamRosterUsage[];
  resolveSprite: (remoteUrl: string) => string;
}

export default function TeamRosterUsagePanel({ usage, resolveSprite }: TeamRosterUsagePanelProps) {
  if (usage.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-4 rounded-lg bg-zinc-800 border border-zinc-700">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wide">Roster Usage by Team</h3>
        <p className="text-sm text-zinc-500">No completed battles yet.</p>
      </div>
    );
  }

  return (
    <>
      {usage.map(team => (
        <div key={team.teamId} className="flex flex-col gap-3 p-4 rounded-lg bg-zinc-800 border border-zinc-700">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wide">{team.teamName} - Roster Usage</h3>
          <div className="flex flex-col gap-2">
            {team.pokemon.map(stat => (
              <div key={stat.species} className="flex items-center gap-2">
                <img src={resolveSprite(stat.spriteUrl)} alt={stat.species} className="w-8 h-8" />
                <span className="flex-1 text-sm text-zinc-200 truncate">{stat.species}</span>
                <div className="w-24 h-2 rounded-full bg-zinc-700/50 overflow-hidden">
                  <div className="h-full bg-accent-gold" style={{ width: `${stat.rate * 100}%` }} />
                </div>
                <span className="w-28 text-right text-xs text-zinc-400">
                  {stat.broughtCount}/{stat.battleCount} ({Math.round(stat.rate * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
