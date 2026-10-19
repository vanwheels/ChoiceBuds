/**
 * TeamVisibilityBadge.tsx - Editable Team Profile-Visibility Indicator
 * Teams Page Profile-Visibility Indicator (see TODO.md) - lets the Teams tab
 * itself show/change a team's public-profile visibility tier instead of
 * that only being reachable from the profile page's own
 * ProfileEditControls.tsx. Same clickable-badge-with-dropdown shape as
 * RegulationBadge.tsx right next to it; selecting an option commits
 * immediately via onChange (TeamCard wires this to updateTeam).
 */

import { useState } from 'react';
import type { Team, TeamVisibility } from '../types/pokemon';
import { getTeamVisibilityTheme } from '../config/pokemonTheme';
import { useDismissable } from '../hooks/useDismissable';

interface TeamVisibilityBadgeProps {
  team: Team;
  onChange: (visibility: TeamVisibility) => void;
}

const VISIBILITY_OPTIONS: { id: TeamVisibility; label: string }[] = [
  { id: 'private', label: 'Private' },
  { id: 'closed', label: 'Closed' },
  { id: 'open', label: 'Open' },
];

export default function TeamVisibilityBadge({ team, onChange }: TeamVisibilityBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useDismissable<HTMLDivElement>(() => setIsOpen(false));
  const currentVisibility: TeamVisibility = team.visibility ?? 'private';
  const currentOption =
    VISIBILITY_OPTIONS.find((option) => option.id === currentVisibility) ?? VISIBILITY_OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Change profile visibility"
        className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded text-white transition-colors cursor-pointer ${getTeamVisibilityTheme(currentVisibility).badgeBg}`}
      >
        {currentOption.label}
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-24 rounded-lg border border-zinc-700 bg-slate-900 shadow-xl overflow-hidden">
          {VISIBILITY_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onChange(option.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                option.id === currentVisibility
                  ? 'bg-accent-gold text-zinc-900'
                  : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
