/**
 * RegulationBadge.tsx - Editable Team Regulation Indicator
 * Renders next to the Validate button as a clickable badge; opening it shows
 * a dropdown of every known regulation. Selecting one commits immediately via
 * onChange (TeamCard wires this to updateTeam), switching the legality
 * ruleset the whole card (validation + species picker) uses right away.
 */

import { useState } from 'react';
import type { Team } from '../types/pokemon';
import { ALL_REGULATION_IDS, getRegulationLabel, toRegulationId } from '../utils/pokemonRules';
import { useDismissable } from '../hooks/useDismissable';

interface RegulationBadgeProps {
  team: Team;
  onChange: (format: Team['format']) => void;
}

export default function RegulationBadge({ team, onChange }: RegulationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useDismissable<HTMLDivElement>(() => setIsOpen(false));
  const currentId = toRegulationId(team.format);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Change Regulation"
        className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
      >
        {team.format || 'Reg M-A'}
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-24 rounded-lg border border-zinc-700 bg-slate-900 shadow-xl overflow-hidden">
          {ALL_REGULATION_IDS.map(id => (
            <button
              key={id}
              onClick={() => {
                onChange(getRegulationLabel(id) as Team['format']);
                setIsOpen(false);
              }}
              className={`w-full text-left px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                id === currentId ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {getRegulationLabel(id)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
