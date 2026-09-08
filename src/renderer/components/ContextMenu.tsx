/**
 * ContextMenu.tsx - Generic Right-Click Context Menu
 * Card Action Button Placement Leg 1 (see TODO.md): first context-menu
 * component in the codebase - PokemonCard.tsx's right-click "Export" entry
 * is the first consumer, extracted as a small reusable shell (position +
 * items) rather than one-off inline JSX, in case a future call site needs
 * the same "custom-positioned at click, outside-click/Escape dismiss"
 * behavior for its own item set. Positioned at literal click coordinates
 * (not off a trigger element's own rect, unlike TeamOverflowMenu.tsx's
 * dropdown) and clamped to stay inside the viewport since a right-click can
 * land anywhere, including near an edge. Portaled to document.body for the
 * same reason TeamOverflowMenu.tsx's dropdown is - a fixed-positioned
 * descendant of a scrolling container gets clipped by it.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: y, left: x });

  // Clamped against the menu's own real rendered size (not an estimated
  // width) since item label length varies - runs before paint so the menu
  // never flashes at an off-screen spot first.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    const top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
    setPos({ top, left });
  }, [x, y]);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleScrollOrResize = () => onClose();
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    // capture: true so this also catches scroll on a nested scrolling
    // container (e.g. TeamsPage.tsx's teams-list div), not just
    // window/document itself scrolling - scroll doesn't bubble, but a
    // capturing listener still sees it on the way down.
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl p-1.5"
      style={{ top: pos.top, left: pos.left }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => { item.onClick(); onClose(); }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors cursor-pointer ${
            item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          {item.icon && (
            <span className={`shrink-0 flex ${item.danger ? 'text-red-400' : 'text-zinc-500'}`}>{item.icon}</span>
          )}
          <span>{item.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
}
