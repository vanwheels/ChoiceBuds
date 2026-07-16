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
 */

import type { Battle, BattleSide } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import { battlePokemonDisplayName } from '../../utils/battleLookup';

type OutcomeResult = 'crit' | 'miss' | 'no-effect' | 'blocked-ability';

interface MoveOutcomePromptProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
  move: string;
  moveCategory?: 'physical' | 'special' | 'status';
  actionId: string;
  targets: { side: BattleSide; pokemonId: string }[];
  onClose: () => void;
}

const OUTCOME_BUTTONS: { key: OutcomeResult; label: string; activeClass: string }[] = [
  { key: 'miss', label: 'Miss', activeClass: 'bg-gray-600 text-gray-200' },
  { key: 'crit', label: 'Crit', activeClass: 'bg-yellow-900/70 text-yellow-300' },
  { key: 'no-effect', label: 'No Effect', activeClass: 'bg-gray-600 text-gray-200' },
  { key: 'blocked-ability', label: 'Blocked', activeClass: 'bg-purple-900/70 text-purple-300' },
];

export default function MoveOutcomePrompt({ battle, battleLogActions, move, moveCategory, actionId, targets, onClose }: MoveOutcomePromptProps) {
  const action = battle.turns.flatMap(t => t.actions).find(a => a.id === actionId);
  const turnNumber = battle.turns.length;

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 rounded bg-yellow-500/10 border border-yellow-600 self-center">
      <span className="text-[11px] text-yellow-300 font-semibold">{move} - confirm outcome</span>
      <div className="flex flex-col gap-1">
        {targets.map(t => {
          const outcome = action?.outcomes?.find(o => o.pokemonId === t.pokemonId)?.result ?? null;
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
