/**
 * Battlefield.tsx - Center Battlefield: the 4 Currently-Active Combatants
 * Opponent's 2 active on top, player's 2 active on bottom - mirrors how a
 * real doubles field reads from the player's own point of view. Stage 1 is
 * display-only (sprite + name); Stage 2 adds click-to-log-a-move on top of
 * this same component.
 */

import type { Battle } from '../../types/pokemon';
import { getPixelSpriteUrl } from '../../utils/spriteUrl';

interface BattlefieldProps {
  battle: Battle;
  resolveSprite: (remoteUrl: string) => string;
}

function EmptySlot() {
  return (
    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-800 flex items-center justify-center text-gray-700 text-xs">
      —
    </div>
  );
}

export default function Battlefield({ battle, resolveSprite }: BattlefieldProps) {
  const opponentActive = battle.opponentActiveIds
    .map(id => battle.opponentRoster.find(o => o.id === id))
    .filter((o): o is NonNullable<typeof o> => !!o);
  const playerActive = battle.playerActiveIds
    .map(id => battle.playerRoster.find(p => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <div className="flex flex-col items-center gap-4 py-4 px-6 rounded-lg bg-gray-900/60 border border-gray-800 flex-1">
      <div className="flex gap-6">
        {[0, 1].map(slot => {
          const o = opponentActive[slot];
          return o ? (
            <div key={o.id} className="flex flex-col items-center gap-1">
              <img
                src={resolveSprite(getPixelSpriteUrl(o.pokedexNumber, o.species, 'M', false))}
                alt={o.species}
                className="w-20 h-20 object-contain [image-rendering:pixelated]"
              />
              <span className="text-xs text-red-300">{o.species}</span>
            </div>
          ) : <EmptySlot key={`opp-empty-${slot}`} />;
        })}
      </div>

      <div className="w-full border-t border-dashed border-gray-800" />

      <div className="flex gap-6">
        {[0, 1].map(slot => {
          const p = playerActive[slot];
          return p ? (
            <div key={p.id} className="flex flex-col items-center gap-1">
              <img
                src={resolveSprite(getPixelSpriteUrl(p.pokedexNumber, p.species, p.gender || 'M', false))}
                alt={p.species}
                className="w-20 h-20 object-contain [image-rendering:pixelated]"
              />
              <span className="text-xs text-blue-300">{p.nickname || p.species}</span>
            </div>
          ) : <EmptySlot key={`player-empty-${slot}`} />;
        })}
      </div>
    </div>
  );
}
