/**
 * FormeToggle.tsx - Forme-Family Toggle Row
 * Shared button-row toggle for a stat-forme or Mega-forme group (see
 * utils/calcFormes.ts's FormeFamily) - one button per name in the group,
 * highlighting whichever matches the panel's current species. Used by both
 * CalcPokemonPanel (attacker/Calc tab, which layers its own Mega-ability
 * side effect on top via onSelect) and LiveCalcDefenderPanel (species-only,
 * no ability tracked yet - see TODO.md's Live Calc Known-Ability Lock leg).
 */

import { formeDisplayLabel } from '../../utils/calcFormes';

interface FormeToggleProps {
  group: string[];
  current: string;
  onSelect: (name: string) => void;
}

export default function FormeToggle({ group, current, onSelect }: FormeToggleProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {group.map(name => (
        <button
          key={name}
          type="button"
          onClick={() => onSelect(name)}
          className={`px-2 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
            current === name ? 'bg-accent-gold text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          {formeDisplayLabel(group, name)}
        </button>
      ))}
    </div>
  );
}
