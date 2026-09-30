/**
 * AbilityCapsule.tsx - Held Ability Pill
 * Presentational only: renders the equipped ability name in a capsule.
 * Picking a new one floats AbilityPickerPanel over this component via
 * FloatingCardPanel (see EditOverlays.tsx) rather than this component
 * managing its own popover. Extracted from EditOverlays.tsx to keep it
 * under the project's 250-line component cap.
 *
 * Long-pressing is touch's analog to the mouse hover this component also
 * wires up - it shows the same tooltip without opening the picker a plain
 * tap does (Touch-Accessible Hover Content Leg 1, see TODO.md).
 */

import { useRef } from 'react';
import type { MouseEvent } from 'react';
import { useLongPress } from '../hooks/useLongPress';

interface AbilityCapsuleProps {
  selectedAbility: string;
  onHoverEnter: (triggerEl: HTMLElement) => void;
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
  const ref = useRef<HTMLDivElement>(null);
  const longPress = useLongPress(
    () => { if (ref.current) onHoverEnter(ref.current); },
    onHoverLeave
  );

  return (
    <div
      ref={ref}
      data-no-drag
      onMouseEnter={(e) => onHoverEnter(e.currentTarget)}
      onMouseLeave={onHoverLeave}
      onClick={onToggleMenu}
      {...longPress}
      className="px-4 py-1.5 rounded-full border border-zinc-600 bg-zinc-800 text-xs font-semibold text-white truncate w-[134px] text-center transition-colors cursor-pointer hover:border-accent-gold"
    >
      {selectedAbility || 'Select Ability'}
    </div>
  );
}
