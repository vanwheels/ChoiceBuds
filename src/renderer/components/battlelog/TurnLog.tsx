/**
 * TurnLog.tsx - Read-Only Chronological Turn/Action Render
 * Renders battle.turns exactly as logged, in order - no reordering or
 * priority computation (see useBattleLogActions.ts's logAction).
 */

import type { Battle } from '../../types/pokemon';
import { battlePokemonDisplayName } from '../../utils/battleLookup';

interface TurnLogProps {
  battle: Battle;
}

export default function TurnLog({ battle }: TurnLogProps) {
  return (
    <div className="flex flex-col gap-3">
      {battle.turns.map(turn => (
        <div key={turn.number} className="border-l-2 border-gray-700 pl-3">
          <div className="text-xs font-bold text-gray-400 mb-1">Turn {turn.number}</div>
          {turn.actions.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No actions logged yet</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {turn.actions.map(action => (
                <li key={action.id} className="text-sm">
                  <span className={action.side === 'player' ? 'text-blue-400' : 'text-red-400'}>
                    {battlePokemonDisplayName(battle, action.side, action.pokemonId)}
                  </span>
                  {action.move && <span className="text-gray-200"> used {action.move}</span>}
                  {action.target && (
                    <span className="text-gray-400">
                      {' '}on {battlePokemonDisplayName(battle, action.target.side, action.target.pokemonId)}
                    </span>
                  )}
                  {action.note && <span className="text-gray-500 italic"> ({action.note})</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
