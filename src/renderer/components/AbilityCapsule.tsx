/**
 * AbilityCapsule.tsx - Held Ability Pill
 * Presentational only: renders the equipped ability name in a capsule and
 * its ShowdownPopover selector. Extracted from EditOverlays.tsx to keep it
 * under the project's 250-line component cap.
 */

import type { MouseEvent } from 'react';
import type { AbilityData } from '../types/pokemon';
import { ShowdownPopover } from './ShowdownPopover';

interface AbilityCapsuleProps {
  selectedAbility: string;
  legalAbilities: AbilityData[];
  activeMenu: string | null;
  isEditing: boolean;
  onHoverEnter: (e: MouseEvent<HTMLDivElement>) => void;
  onHoverLeave: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onAbilitySelect: (ability: AbilityData) => void;
}

export default function AbilityCapsule({
  selectedAbility,
  legalAbilities,
  activeMenu,
  isEditing,
  onHoverEnter,
  onHoverLeave,
  onToggleMenu,
  onCloseMenu,
  onAbilitySelect,
}: AbilityCapsuleProps) {
  return (
    <div className="relative">
      <div
        onMouseEnter={onHoverEnter}
        onMouseLeave={onHoverLeave}
        onClick={isEditing ? onToggleMenu : undefined}
        className={`px-4 py-1.5 rounded-full border bg-gray-800 text-xs font-semibold text-white truncate max-w-[180px] transition-colors ${isEditing ? 'cursor-pointer hover:border-blue-500' : ''}`}
        style={{ borderColor: activeMenu === 'ability' ? '#3b82f6' : '#4b5563' }}
      >
        {selectedAbility || 'Select Ability'}
      </div>
      {activeMenu === 'ability' && (
        <ShowdownPopover mode="ability" data={legalAbilities} onSelect={onAbilitySelect} onClose={onCloseMenu} />
      )}
    </div>
  );
}
