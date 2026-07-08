/**
 * SideConditionsRow.tsx - One Side's Screens/Tailwind/Hazards
 * Shared by PlayerFieldPanel and OpponentFieldPanel (parameterized by
 * `side`), same reuse pattern as OpponentInfoTags inside OpponentFieldPanel.
 * Turn-tracked conditions show a countdown and toggle on/off; stackable
 * hazards (Spikes/Toxic Spikes) cycle 0..max..0 on click since there's no
 * room here for separate +/- controls.
 */

import type { Battle, BattleSide } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import {
  TURN_TRACKED_CONDITIONS, SIDE_CONDITION_LABELS, getSideConditionRemaining,
  BOOLEAN_HAZARDS, STACKABLE_HAZARDS, STACKABLE_HAZARD_MAX, HAZARD_LABELS,
  SIDE_CONDITION_EXTENDED_FIELD,
} from '../../config/fieldConditions';

interface SideConditionsRowProps {
  battle: Battle;
  side: BattleSide;
  battleLogActions: UseBattleLogActionsReturn;
}

export default function SideConditionsRow({ battle, side, battleLogActions }: SideConditionsRowProps) {
  const currentTurn = battle.turns.length;
  const conditions = side === 'player' ? battle.fieldState.playerSide : battle.fieldState.opponentSide;
  const activeColor = side === 'player' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white';

  return (
    <div className="flex flex-wrap gap-1">
      {TURN_TRACKED_CONDITIONS.map(key => {
        const remaining = getSideConditionRemaining(conditions, key, currentTurn);
        const isActive = remaining != null;
        const extendedField = SIDE_CONDITION_EXTENDED_FIELD[key];
        const isExtended = extendedField ? !!conditions[extendedField] : false;
        return (
          <span key={key} className="inline-flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => battleLogActions.toggleTurnCondition(battle, side, key)}
              className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-sm cursor-pointer transition-colors ${
                isActive ? activeColor : 'bg-gray-900 text-gray-600 hover:text-gray-400'
              }`}
            >
              {SIDE_CONDITION_LABELS[key]}{isActive ? ` (${remaining})` : ''}
            </button>
            {isActive && extendedField && (
              <button
                type="button"
                onClick={() => battleLogActions.toggleScreenExtended(battle, side, key)}
                title="Toggle whether this was set by a Pokemon holding Light Clay (8-turn duration instead of 5)"
                className={`px-1 py-0.5 text-[8px] font-semibold rounded-sm cursor-pointer transition-colors ${
                  isExtended ? 'bg-yellow-600 text-white' : 'bg-gray-900 text-gray-600 hover:text-gray-400'
                }`}
              >
                Clay
              </button>
            )}
          </span>
        );
      })}

      {BOOLEAN_HAZARDS.map(key => {
        const isActive = !!conditions[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => battleLogActions.toggleBooleanHazard(battle, side, key)}
            className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-sm cursor-pointer transition-colors ${
              isActive ? activeColor : 'bg-gray-900 text-gray-600 hover:text-gray-400'
            }`}
          >
            {HAZARD_LABELS[key]}
          </button>
        );
      })}

      {STACKABLE_HAZARDS.map(key => {
        const layers = conditions[key] ?? 0;
        const max = STACKABLE_HAZARD_MAX[key];
        const isActive = layers > 0;
        return (
          <button
            key={key}
            type="button"
            onClick={() => battleLogActions.setStackableHazard(battle, side, key, (layers + 1) % (max + 1))}
            title={`Click to cycle 0-${max}`}
            className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-sm cursor-pointer transition-colors ${
              isActive ? activeColor : 'bg-gray-900 text-gray-600 hover:text-gray-400'
            }`}
          >
            {HAZARD_LABELS[key]}{isActive ? ` (${layers})` : ''}
          </button>
        );
      })}
    </div>
  );
}
