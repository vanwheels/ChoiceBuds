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
 *
 * `align` mirrors the two columns left/right (text alignment + Spikes
 * button order reversed on the right side) matching the real
 * calc.pokemonshowdown.com reference screenshot, instead of both columns
 * looking identical like the old Stage 4 symmetric layout.
 */

import type { CalcSideConditions as CalcSideConditionsState } from '../../hooks/useDamageCalc';

interface CalcSideConditionsProps {
  title: string;
  side: CalcSideConditionsState;
  align: 'left' | 'right';
  /** This side's own Pokémon's ability - gates the aura toggles below, which only make sense if that Pokémon actually has the matching ability. */
  ownAbility: string;
  onChange: (updates: Partial<CalcSideConditionsState>) => void;
}

const ALWAYS_TOGGLES: Array<[keyof CalcSideConditionsState, string]> = [
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
];

/**
 * Aura abilities (Flower Gift/Battery/Power Spot/Steely Spirit) only ever
 * matter when the Pokémon on this side actually has that ability - the
 * real calc doesn't clutter the default view with them either. Shown only
 * when `ownAbility` matches, rather than removed outright, so the toggle
 * is still reachable the moment it becomes relevant.
 */
const CONDITIONAL_TOGGLES: Array<[keyof CalcSideConditionsState, string, string]> = [
  ['isFlowerGift', 'Flower Gift', 'Flower Gift'],
  ['isBattery', 'Battery', 'Battery'],
  ['isPowerSpot', 'Power Spot', 'Power Spot'],
  ['isSteelySpirit', 'Steely Spirit', 'Steely Spirit'],
];

const SPIKES_OPTIONS = [0, 1, 2, 3];

function ToggleButton({ active, label, align, onClick }: { active: boolean; label: string; align: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-2 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${align === 'right' ? 'text-right' : 'text-left'} ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

export default function CalcSideConditions({ title, side, align, ownAbility, onChange }: CalcSideConditionsProps) {
  const spikesOptions = align === 'right' ? [...SPIKES_OPTIONS].reverse() : SPIKES_OPTIONS;
  const alignClass = align === 'right' ? 'text-right' : 'text-left';
  const visibleConditionalToggles = CONDITIONAL_TOGGLES.filter(
    ([, , requiredAbility]) => ownAbility.toLowerCase() === requiredAbility.toLowerCase()
  );

  return (
    <div className="flex-1 flex flex-col gap-1 min-w-0">
      <p className={`text-[10px] text-gray-400 uppercase tracking-wide ${alignClass}`}>{title}</p>

      <div className="flex flex-col gap-1">
        <label className={`text-[10px] text-gray-400 uppercase tracking-wide ${alignClass}`}>Spikes</label>
        <div className="flex gap-1">
          {spikesOptions.map(count => (
            <button
              key={count}
              type="button"
              onClick={() => onChange({ spikes: count })}
              className={`flex-1 px-1 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                side.spikes === count ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {ALWAYS_TOGGLES.map(([key, label]) => (
          <ToggleButton
            key={key}
            active={side[key] as boolean}
            label={label}
            align={align}
            onClick={() => onChange({ [key]: !side[key] } as Partial<CalcSideConditionsState>)}
          />
        ))}
        {visibleConditionalToggles.map(([key, label]) => (
          <ToggleButton
            key={key}
            active={side[key] as boolean}
            label={label}
            align={align}
            onClick={() => onChange({ [key]: !side[key] } as Partial<CalcSideConditionsState>)}
          />
        ))}
      </div>
    </div>
  );
}
