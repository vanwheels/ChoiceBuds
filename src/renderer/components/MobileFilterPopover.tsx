/**
 * MobileFilterPopover.tsx - Generic Anchored Popover for Mobile Top-Bar Icons
 * Mobile Compact Top Bar: Teams & Box Leg 1 (see TODO.md) - TeamsPage's
 * format filter and BoxPage's search/sort-mode controls move behind icon
 * triggers in Sidebar.tsx's mobile top bar rather than staying inline in the
 * page's own header (hidden entirely below `md` by this same leg).
 * Positioning/dismiss behavior (portaled, anchored off the trigger's own
 * rect, viewport-clamped, closes on outside click/Escape/scroll/resize) is a
 * straight port of TeamOverflowMenu.tsx's, generalized to take arbitrary
 * panel content instead of a fixed MenuRow list.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface MobileFilterPopoverProps {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  /** Shows a small dot on the trigger when a non-default filter/search is active. */
  isActive?: boolean;
}

interface PopoverPos {
  top?: number;
  bottom?: number;
  right: number;
  maxHeight: number;
}

const VIEWPORT_MARGIN = 8;
const MIN_PANEL_HEIGHT = 100;

export default function MobileFilterPopover({ label, icon, children, isActive }: MobileFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;
    const placeAbove = spaceBelow < MIN_PANEL_HEIGHT && spaceAbove > spaceBelow;
    setPos({
      top: placeAbove ? undefined : rect.bottom + VIEWPORT_MARGIN,
      bottom: placeAbove ? window.innerHeight - rect.top + VIEWPORT_MARGIN : undefined,
      right: window.innerWidth - rect.right,
      maxHeight: Math.max(MIN_PANEL_HEIGHT, placeAbove ? spaceAbove : spaceBelow),
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleScrollOrResize = (e: Event) => {
      if (e.target instanceof Node && panelRef.current?.contains(e.target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={label}
        className={`relative flex items-center justify-center rounded-lg p-2 text-zinc-300 transition-colors cursor-pointer hover:bg-zinc-700 ${
          isOpen ? 'bg-zinc-700 text-zinc-100' : ''
        }`}
      >
        {icon}
        {isActive && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-accent-gold" />}
      </button>

      {isOpen && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-50 w-64 rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl p-2 overflow-y-auto"
          style={{ top: pos.top, bottom: pos.bottom, right: pos.right, maxHeight: pos.maxHeight }}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}
