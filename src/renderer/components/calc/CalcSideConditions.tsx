/**
 * CalcSideConditions.tsx - One Pokémon's Field-Side Toggles
 * Reused for both Pokémon in CalcFieldPanel - each side's screens/hazards/
 * Helping Hand apply depending on which direction is being calculated (see
 * useDamageCalc's computeSideResults, which swaps attacker/defender side
 * per direction using these same two objects). Buttons, not checkboxes,
 * matching this app's other toggle styling (Teams regulation/format
 * filters, the Singles/Doubles and Reg M-A/M-B toggles elsewhere in Calc).
 *
 * Each condition is its own full-width stacked row (not a wrapped chip
 * cluster) - matches the Platinum Kaizo calc fork's field-panel style (see
 * TODO.md), which is what a real Showdown-style calc's Field column looks
 * like: one legible row per condition instead of a dense tag cloud.
 */

import type { CalcSideConditions as CalcSideConditionsState } from '../../hooks/useDamageCalc';

interface CalcSideConditionsProps {
  title: string;
  side: CalcSideConditionsState;
  onChange: (updates: Partial<CalcSideConditionsState>) => void;
}

const TOGGLES: Array<[keyof CalcSideConditionsState, string]> = [
  ['isReflect', 'Reflect'],
  ['isLightScreen', 'Light Screen'],
  ['isAuroraVeil', 'Aurora Veil'],
  ['isFriendGuard', 'Friend Guard'],
  ['isHelpingHand', 'Helping Hand'],
  ['isSR', 'Stealth Rock'],
  ['isTailwind', 'Tailwind'],
  ['isProtected', 'Protect'],
  ['isSeeded', 'Leech Seed'],
  ['isSaltCured', 'Salt Cure'],
  ['isFlowerGift', 'Flower Gift'],
  ['isBattery', 'Battery'],
  ['isPowerSpot', 'Power Spot'],
  ['isSteelySpirit', 'Steely Spirit'],
];

const SPIKES_OPTIONS = [0, 1, 2, 3];

function ToggleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-2 py-1 text-left text-xs font-bold rounded transition-colors cursor-pointer ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

export default function CalcSideConditions({ title, side, onChange }: CalcSideConditionsProps) {
  return (
    <div className="flex-1 flex flex-col gap-1 min-w-0">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{title}</p>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-400 uppercase tracking-wide">Spikes</label>
        <div className="flex gap-1">
          {SPIKES_OPTIONS.map(count => (
            <button
              key={count}
              type="button"
              onClick={() => onChange({ spikes: count })}
              className={`flex-1 px-1 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                side.spikes === count ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {count === 0 ? 'None' : count}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {TOGGLES.map(([key, label]) => (
          <ToggleButton
            key={key}
            active={side[key] as boolean}
            label={label}
            onClick={() => onChange({ [key]: !side[key] } as Partial<CalcSideConditionsState>)}
          />
        ))}
      </div>
    </div>
  );
}
