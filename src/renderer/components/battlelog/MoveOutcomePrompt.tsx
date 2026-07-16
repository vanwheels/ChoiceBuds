/**
 * MoveOutcomePrompt.tsx - Inline Miss/Crit/No Effect/Blocked Confirmation
 * Shown immediately after a move with at least one target is logged (see
 * Battlefield.tsx's pendingOutcomes state) - these toggles previously lived
 * as persistent chips on each target's own BattlefieldSlot, which put the
 * confirmation gesture out of view from the move that was just logged and
 * easy to lose track of. Surfacing it inline, in the same beat as picking
 * targets, keeps the whole "log a move" gesture in one place. Multi-target
 * moves (Rock Slide/Earthquake/etc.) list every target with its own row of
 * toggles, since a spread move can crit one target and miss another
 * independently - `outcomes` is already keyed per-pokemonId on the action,
 * so this is just surfacing the existing data model, not changing it.
 *
 * Also surfaces an unrevealed-ability picker per opponent target, when the
 * move being logged could plausibly be blocked by one of that species'
 * legal abilities (config/moveBlockingAbilities.ts) but the real ability
 * isn't known yet - the same species-legal-ability list
 * OpponentRowFields.tsx's OpponentAbilityCell already fetches for its own
 * ability dropdown. Picking one reveals the ability AND sets this target's
 * outcome to Blocked in a single atomic action (useBattleLogActions.ts's
 * revealBlockingAbility) - since seeing the block *is* how the ability got
 * revealed in the first place, there's no real scenario where a user would
 * want one without the other, and firing two separate updateBattle calls
 * back-to-back off the same stale `battle` closure would race (see that
 * function's own header comment). Player targets never need this picker -
 * their own team's ability is already known from the roster snapshot,
 * never unrevealed.
 *
 * For a multi-hit move (config/multiHitMoves.ts), each target row also gets
 * a "Hits: N" picker spanning the move's real min-max hit range, since the
 * actual count is random (or, for `multiaccuracy` moves, independently
 * rolled per hit) and can't be inferred from the move name alone. Hidden
 * once that target's outcome is Miss/No Effect/Blocked - those already mean
 * 0 hits landed, so a hit count would be redundant (and setActionTargetOutcome
 * clears any stale one on those results).
 */

import { useEffect, useState } from 'react';
import type { Battle, BattleSide, OpponentPokemonEntry } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import { battlePokemonDisplayName } from '../../utils/battleLookup';
import { abilitiesThatCouldBlock } from '../../config/moveBlockingAbilities';
import { getMultiHitRange } from '../../config/multiHitMoves';
import { formatAbilityName } from './OpponentRowFields';

type OutcomeResult = 'crit' | 'miss' | 'no-effect' | 'blocked-ability';

interface MoveOutcomePromptProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
  gameDataState: UseGameDataReturn;
  move: string;
  moveCategory?: 'physical' | 'special' | 'status';
  actionId: string;
  targets: { side: BattleSide; pokemonId: string }[];
  onClose: () => void;
}

/** Own component so its ability-fetching effect follows Rules of Hooks inside the targets.map() below. */
function UnrevealedAbilityPicker({
  opponent, move, moveType, moveCategory, gameDataState, onPick,
}: {
  opponent: OpponentPokemonEntry;
  move: string;
  moveType?: string;
  moveCategory?: 'physical' | 'special' | 'status';
  gameDataState: UseGameDataReturn;
  onPick: (ability: string) => void;
}) {
  const [candidates, setCandidates] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    gameDataState.getEnrichedSpeciesOptions(opponent.species).then(({ abilities }) => {
      if (cancelled) return;
      const legal = abilities.map(a => formatAbilityName(a.name));
      setCandidates(abilitiesThatCouldBlock(legal, move, moveType, moveCategory));
    });
    return () => { cancelled = true; };
  }, [opponent.species, move, moveType, moveCategory, gameDataState]);

  if (candidates.length === 0) return null;

  return (
    <select
      value=""
      onChange={e => { if (e.target.value) onPick(e.target.value); }}
      title="Which ability blocked it?"
      className="text-[9px] px-1 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 outline-none cursor-pointer hover:text-gray-200"
    >
      <option value="">blocked by...?</option>
      {candidates.map(a => <option key={a} value={a}>{a}</option>)}
    </select>
  );
}

const OUTCOME_BUTTONS: { key: OutcomeResult; label: string; activeClass: string }[] = [
  { key: 'miss', label: 'Miss', activeClass: 'bg-gray-600 text-gray-200' },
  { key: 'crit', label: 'Crit', activeClass: 'bg-yellow-900/70 text-yellow-300' },
  { key: 'no-effect', label: 'No Effect', activeClass: 'bg-gray-600 text-gray-200' },
  { key: 'blocked-ability', label: 'Blocked', activeClass: 'bg-purple-900/70 text-purple-300' },
];

export default function MoveOutcomePrompt({ battle, battleLogActions, gameDataState, move, moveCategory, actionId, targets, onClose }: MoveOutcomePromptProps) {
  const action = battle.turns.flatMap(t => t.actions).find(a => a.id === actionId);
  const turnNumber = battle.turns.length;
  const hitRange = getMultiHitRange(move);

  const revealAndBlock = (opponent: OpponentPokemonEntry, ability: string) => {
    battleLogActions.revealBlockingAbility(battle, opponent.id, ability, turnNumber, actionId);
  };

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 rounded bg-yellow-500/10 border border-yellow-600 self-center">
      <span className="text-[11px] text-yellow-300 font-semibold">{move} - confirm outcome</span>
      <div className="flex flex-col gap-1">
        {targets.map(t => {
          const outcome = action?.outcomes?.find(o => o.pokemonId === t.pokemonId)?.result ?? null;
          const opponent = t.side === 'opponent' ? battle.opponentRoster.find(o => o.id === t.pokemonId) : undefined;
          const hits = action?.hitsLanded?.find(h => h.pokemonId === t.pokemonId)?.hits ?? null;
          const showHitPicker = hitRange && outcome !== 'miss' && outcome !== 'no-effect' && outcome !== 'blocked-ability';
          return (
            <div key={`${t.side}-${t.pokemonId}`} className="flex items-center gap-1.5">
              <span className={`text-[11px] w-24 truncate ${t.side === 'player' ? 'text-blue-300' : 'text-red-300'}`}>
                {battlePokemonDisplayName(battle, t.side, t.pokemonId)}
              </span>
              {OUTCOME_BUTTONS.filter(b => b.key !== 'crit' || moveCategory !== 'status').map(b => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => battleLogActions.setActionTargetOutcome(battle, turnNumber, actionId, t.pokemonId, outcome === b.key ? null : b.key)}
                  className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    outcome === b.key ? b.activeClass : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  {b.label}
                </button>
              ))}
              {showHitPicker && (
                <div className="flex items-center gap-0.5">
                  <span className="text-[9px] text-gray-500">Hits:</span>
                  {Array.from({ length: hitRange.max - hitRange.min + 1 }, (_, i) => hitRange.min + i).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => battleLogActions.setActionHitsLanded(battle, turnNumber, actionId, t.pokemonId, hits === n ? null : n)}
                      className={`text-[9px] w-4 h-4 rounded cursor-pointer transition-colors ${
                        hits === n ? 'bg-blue-900/70 text-blue-300' : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
              {opponent && !opponent.ability && (
                <UnrevealedAbilityPicker
                  opponent={opponent}
                  move={move}
                  moveType={action?.moveType}
                  moveCategory={moveCategory}
                  gameDataState={gameDataState}
                  onPick={ability => revealAndBlock(opponent, ability)}
                />
              )}
            </div>
          );
        })}
      </div>
      <button type="button" onClick={onClose} className="self-end text-[10px] text-yellow-400 hover:text-yellow-200 cursor-pointer">
        Done
      </button>
    </div>
  );
}
