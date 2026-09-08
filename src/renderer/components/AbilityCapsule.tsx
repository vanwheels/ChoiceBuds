/**
 * AbilityCapsule.tsx - Held Ability Pill
 * Presentational only: renders the equipped ability name in a capsule.
 * Picking a new one floats AbilityPickerPanel over this component via
 * FloatingCardPanel (see EditOverlays.tsx) rather than this component
 * managing its own popover. Extracted from EditOverlays.tsx to keep it
 * under the project's 250-line component cap.
 */

import type { MouseEvent } from 'react';

interface AbilityCapsuleProps {
  selectedAbility: string;
  onHoverEnter: (e: MouseEvent<HTMLDivElement>) => void;
  onHoverLeave: () => void;
  onToggleMenu: (e: MouseEvent<HTMLDivElement>) => void;
}

// Permanently editable (Always-On Editing Leg 1, see TODO.md) - no more
// isEditing gate; clicking always opens the ability picker.
export default function AbilityCapsule({
  selectedAbility,
  onHoverEnter,
  onHoverLeave,
  onToggleMenu,
}: AbilityCapsuleProps) {
  return (
    <div
      data-no-drag
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      onClick={onToggleMenu}
      className="px-4 py-1.5 rounded-full border border-zinc-600 bg-zinc-800 text-xs font-semibold text-white truncate w-[134px] text-center transition-colors cursor-pointer hover:border-accent-gold"
    >
      {selectedAbility || 'Select Ability'}
    </div>
  );
}
