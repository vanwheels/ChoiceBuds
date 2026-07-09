/**
 * TurnLog.tsx - Read-Only Chronological Turn/Action Render
 * Renders battle.turns in phase order (sendIn/switch -> mega -> move, undefined
 * treated as move) regardless of the order actions were tapped in while
 * logging - real turns resolve switches, then Mega Evolutions, then moves.
 * See useBattleLogActions.ts for how actions get their phase.
 */

import type { Battle, BattleAction } from '../../types/pokemon';
import { battlePokemonDisplayName, isRepeatProtectUse, hasAppliedStatusEffect } from '../../utils/battleLookup';
import { isSwitchOutMove } from '../../config/switchOutMoves';
import { STATUS_LABELS } from '../../config/statusConditions';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';

interface TurnLogProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
}

const PHASE_ORDER: Record<NonNullable<BattleAction['phase']>, number> = { sendIn: 0, switch: 0, mega: 1, move: 2 };

function sortByPhase(actions: BattleAction[]): BattleAction[] {
  return [...actions].sort((a, b) => PHASE_ORDER[a.phase ?? 'move'] - PHASE_ORDER[b.phase ?? 'move']);
}

/** Only non-neutral matchups get a callout - a 1x hit shows nothing, matching the "only call out what's notable" pattern used elsewhere in this log. */
function effectivenessLabel(multiplier: number | undefined): { text: string; className: string } | null {
  if (multiplier == null || multiplier === 1) return null;
  if (multiplier === 0) return { text: 'No Effect', className: 'text-gray-500' };
  if (multiplier > 1) return { text: 'Super Effective!', className: 'text-green-400' };
  return { text: 'Not Very Effective', className: 'text-orange-400' };
}

export default function TurnLog({ battle, battleLogActions }: TurnLogProps) {
  return (
    <div className="flex flex-col gap-3">
      {battle.turns.map(turn => (
        <div key={turn.number} className="border-l-2 border-gray-700 pl-3">
          <div className="text-xs font-bold text-gray-400 mb-1">Turn {turn.number}</div>
          {turn.actions.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No actions logged yet</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {sortByPhase(turn.actions).map(action => {
                const showFailChip = isRepeatProtectUse(battle, turn.number, action)
                  || (action.phase === 'move' && isSwitchOutMove(action.move));
                const showOutcomeChips = action.phase === 'move' && !!action.move;
                const showStatusChip = !!action.statusAilment && !hasAppliedStatusEffect(battle, action);
                return (
                  <li key={action.id} className="text-sm flex items-center gap-1.5 flex-wrap">
                    <span className={action.side === 'player' ? 'text-blue-400' : 'text-red-400'}>
                      {battlePokemonDisplayName(battle, action.side, action.pokemonId)}
                    </span>
                    {action.move && <span className="text-gray-200"> used {action.move}</span>}
                    {action.target && action.target.length > 0 && (
                      <span className="text-gray-400">
                        {' '}on{' '}
                        {action.target.map((t, i) => {
                          const label = effectivenessLabel(action.effectiveness?.find(e => e.pokemonId === t.pokemonId)?.multiplier);
                          return (
                            <span key={`${t.side}-${t.pokemonId}`}>
                              {i > 0 && ' and '}
                              {battlePokemonDisplayName(battle, t.side, t.pokemonId)}
                              {label && <span className={`text-xs ${label.className}`}> ({label.text})</span>}
                            </span>
                          );
                        })}
                      </span>
                    )}
                    {action.note && <span className="text-gray-500 italic"> ({action.note})</span>}
                    {action.failed && <span className="text-red-400 text-xs italic">- failed</span>}
                    {action.crit && <span className="text-yellow-400 text-xs italic">- crit!</span>}
                    {action.missed && <span className="text-gray-400 text-xs italic">- missed</span>}
                    {showFailChip && !action.failed && (
                      <button
                        type="button"
                        onClick={() => battleLogActions.setActionFlag(battle, turn.number, action.id, 'failed', true)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 hover:text-red-300 hover:bg-red-900/40 cursor-pointer"
                      >
                        Failed?
                      </button>
                    )}
                    {showOutcomeChips && action.target && action.target.length > 0 && (
                      <button
                        type="button"
                        onClick={() => battleLogActions.setActionFlag(battle, turn.number, action.id, 'missed', !action.missed)}
                        className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                          action.missed ? 'bg-gray-600 text-gray-200' : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                        }`}
                      >
                        Miss
                      </button>
                    )}
                    {showOutcomeChips && action.moveCategory && action.moveCategory !== 'status' && (
                      <button
                        type="button"
                        onClick={() => battleLogActions.setActionFlag(battle, turn.number, action.id, 'crit', !action.crit)}
                        className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                          action.crit ? 'bg-yellow-900/70 text-yellow-300' : 'bg-gray-800 text-gray-400 hover:text-yellow-300 hover:bg-yellow-900/40'
                        }`}
                      >
                        Crit
                      </button>
                    )}
                    {showStatusChip && (
                      <button
                        type="button"
                        onClick={() => action.target?.forEach(t => battleLogActions.setStatusCondition(battle, t.side, t.pokemonId, action.statusAilment!))}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 hover:bg-purple-800 cursor-pointer"
                      >
                        Inflict {STATUS_LABELS[action.statusAilment!]}?
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
