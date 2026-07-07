/**
 * PlayerFieldPanel.tsx - My Brought-Four, Active/Fainted State
 * The brought-four snapshot itself never changes after battle start; only
 * playerActiveIds/playerFaintedIds move. Click a card to toggle it active
 * (capped at 2, doubles-appropriate); the skull button toggles fainted
 * independent of active state.
 */

import type { Battle } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';

interface PlayerFieldPanelProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
  resolveSprite: (remoteUrl: string) => string;
}

export default function PlayerFieldPanel({ battle, battleLogActions, resolveSprite }: PlayerFieldPanelProps) {
  const toggleActive = (id: string) => {
    const isActive = battle.playerActiveIds.includes(id);
    const next = isActive
      ? battle.playerActiveIds.filter(activeId => activeId !== id)
      : battle.playerActiveIds.length < 2 ? [...battle.playerActiveIds, id] : battle.playerActiveIds;
    battleLogActions.setActive(battle, 'player', next);
  };

  const toggleFainted = (id: string) => {
    battleLogActions.setFainted(battle, 'player', id, !battle.playerFaintedIds.includes(id));
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wide">My Team</h3>
      <div className="grid grid-cols-2 gap-2">
        {battle.broughtFour.map(p => {
          const isActive = battle.playerActiveIds.includes(p.id);
          const isFainted = battle.playerFaintedIds.includes(p.id);

          return (
            <div
              key={p.id}
              className={`relative flex items-center gap-2 p-2 rounded-lg border-2 transition-colors ${
                isFainted ? 'border-gray-800 bg-gray-900/40 opacity-40' : isActive ? 'border-blue-500 bg-blue-600/20' : 'border-gray-700 bg-gray-800'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleActive(p.id)}
                disabled={isFainted}
                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer disabled:cursor-not-allowed"
                title={isActive ? 'Active - click to bench' : 'Click to mark active'}
              >
                <img src={resolveSprite(p.spriteUrl)} alt={p.species} className="w-10 h-10 object-contain [image-rendering:pixelated] shrink-0" />
                <span className="text-xs text-gray-100 truncate">{p.nickname || p.species}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleFainted(p.id)}
                title={isFainted ? 'Fainted - click to revive' : 'Mark fainted'}
                className="text-sm shrink-0 opacity-70 hover:opacity-100 cursor-pointer"
              >
                💀
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
