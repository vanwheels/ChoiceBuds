/**
 * TurnLog.tsx - Read-Only Chronological Turn/Action Render
 * Renders battle.turns in phase order (sendIn/switch -> mega -> move, undefined
 * treated as move) regardless of the order actions were tapped in while
 * logging - real turns resolve switches, then Mega Evolutions, then moves.
 * See useBattleLogActions.ts for how actions get their phase.
 */

import type { Battle, BattleAction } from '../../types/pokemon';
import { battlePokemonDisplayName, isRepeatProtectUse } from '../../utils/battleLookup';
import { isSwitchOutMove } from '../../config/switchOutMoves';
import { FIELD_EVENT_ID } from '../../config/fieldConditions';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import { buildCalcReviewPayload, type CalcReviewPayload } from '../../utils/battleCalcReview';

interface TurnLogProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
  onReviewInCalc: (payload: CalcReviewPayload) => void;
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

/** Per-target crit/miss label - the interactive toggle chips for these now live on the target's own BattlefieldSlot (see BattlefieldSlot.tsx), this is just the read-only historical record. */
function outcomeLabel(result: 'crit' | 'miss' | undefined): { text: string; className: string } | null {
  if (result === 'crit') return { text: 'crit!', className: 'text-yellow-400' };
  if (result === 'miss') return { text: 'missed', className: 'text-gray-400' };
  return null;
}

export default function TurnLog({ battle, battleLogActions, onReviewInCalc }: TurnLogProps) {
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
                return (
                  <li key={action.id} className="text-sm flex items-center gap-1.5 flex-wrap">
                    {action.pokemonId === FIELD_EVENT_ID ? (
                      <span className="text-gray-400 font-semibold">Field</span>
                    ) : (
                      <span className={action.side === 'player' ? 'text-blue-400' : 'text-red-400'}>
                        {battlePokemonDisplayName(battle, action.side, action.pokemonId)}
                      </span>
                    )}
                    {action.move && <span className="text-gray-200"> used {action.move}</span>}
                    {action.target && action.target.length > 0 && (
                      <span className="text-gray-400">
                        {' '}on{' '}
                        {action.target.map((t, i) => {
                          const effLabel = effectivenessLabel(action.effectiveness?.find(e => e.pokemonId === t.pokemonId)?.multiplier);
                          const outLabel = outcomeLabel(action.outcomes?.find(o => o.pokemonId === t.pokemonId)?.result);
                          return (
                            <span key={`${t.side}-${t.pokemonId}`}>
                              {i > 0 && ' and '}
                              {battlePokemonDisplayName(battle, t.side, t.pokemonId)}
                              {effLabel && <span className={`text-xs ${effLabel.className}`}> ({effLabel.text})</span>}
                              {outLabel && <span className={`text-xs ${outLabel.className}`}> ({outLabel.text})</span>}
                            </span>
                          );
                        })}
                      </span>
                    )}
                    {action.note && <span className="text-gray-500 italic"> ({action.note})</span>}
                    {action.failed && <span className="text-red-400 text-xs italic">- failed</span>}
                    {showFailChip && !action.failed && (
                      <button
                        type="button"
                        onClick={() => battleLogActions.setActionFailed(battle, turn.number, action.id, true)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 hover:text-red-300 hover:bg-red-900/40 cursor-pointer"
                      >
                        Failed?
                      </button>
                    )}
                    {!action.failed && (action.moveCategory === 'physical' || action.moveCategory === 'special') && action.target && action.target.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onReviewInCalc(buildCalcReviewPayload(battle, turn.number, action, action.target![0].pokemonId))}
                        title="Open this matchup in the Calc tab, reconstructed as it was on this turn"
                        className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 hover:text-blue-300 hover:bg-blue-900/40 cursor-pointer"
                      >
                        Show Calc
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
