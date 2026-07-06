/**
 * AbilityCapsule.tsx - Held Ability Pill
 * Presentational only: renders the equipped ability name in a capsule.
 * Picking a new one swaps in AbilityPickerPanel in this component's place
 * (see EditOverlays.tsx) rather than this component managing its own
 * popover. Extracted from EditOverlays.tsx to keep it under the project's
 * 250-line component cap.
 */

import type { MouseEvent } from 'react';

interface AbilityCapsuleProps {
  selectedAbility: string;
  isEditing: boolean;
  onHoverEnter: (e: MouseEvent<HTMLDivElement>) => void;
  onHoverLeave: () => void;
  onToggleMenu: (e: MouseEvent<HTMLDivElement>) => void;
}

export default function AbilityCapsule({
  selectedAbility,
  isEditing,
  onHoverEnter,
  onHoverLeave,
  onToggleMenu,
}: AbilityCapsuleProps) {
  return (
    <div
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      onClick={isEditing ? onToggleMenu : undefined}
      className={`px-4 py-1.5 rounded-full border border-gray-600 bg-gray-800 text-xs font-semibold text-white truncate w-[134px] text-center transition-colors ${isEditing ? 'cursor-pointer hover:border-blue-500' : ''}`}
    >
      {selectedAbility || 'Select Ability'}
    </div>
  );
}
