/**
 * CalcLauncherButton - Floating Calc Launcher (Desktop/Tablet)
 * Shared between App.tsx and AppWeb.tsx (previously identical inlined
 * buttons in both). Corner-snap drag, not freeform placement - on
 * pointer-up the final pointer position is compared against the viewport
 * midpoints to pick the nearest of the 4 corners, and the button's position
 * classes switch to that corner. Storing a corner (not absolute coords)
 * means `position: fixed` + corner-edge classes re-anchor correctly on
 * resize for free, with no resize-listener/clamping code needed.
 *
 * Desktop/tablet only (`hidden md:flex`) - Sidebar.tsx's mobile top bar has
 * its own compact, non-floating Calc entry for phone-sized viewports.
 */

import { useCallback, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { CalcIcon } from './icons/SidebarIcons';
import { useCalcButtonCorner, type CalcButtonCorner } from '../hooks/useCalcButtonCorner';

interface CalcLauncherButtonProps {
  onOpen: () => void;
}

const CORNER_CLASSES: Record<CalcButtonCorner, string> = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'top-right': 'top-6 right-6',
  'top-left': 'top-6 left-6',
};

/** Pointer movement under this stays a click; past it, it's a drag. */
const DRAG_THRESHOLD_PX = 5;

function nearestCorner(clientX: number, clientY: number): CalcButtonCorner {
  const isRight = clientX >= window.innerWidth / 2;
  const isBottom = clientY >= window.innerHeight / 2;
  if (isBottom) return isRight ? 'bottom-right' : 'bottom-left';
  return isRight ? 'top-right' : 'top-left';
}

export function CalcLauncherButton({ onOpen }: CalcLauncherButtonProps) {
  const { corner, setCorner } = useCalcButtonCorner();
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const start = pointerStart.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!isDragging.current && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      isDragging.current = true;
    }
    if (isDragging.current) {
      setDragOffset({ x: dx, y: dy });
    }
  }, []);

  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    if (isDragging.current) {
      setCorner(nearestCorner(e.clientX, e.clientY));
    }
    pointerStart.current = null;
    setDragOffset(null);
  }, [setCorner]);

  const handleClick = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }
    onOpen();
  }, [onOpen]);

  const style: CSSProperties | undefined = dragOffset
    ? { transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`, transition: 'none', touchAction: 'none' }
    : { touchAction: 'none' };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      aria-label="Open Calc"
      style={style}
      className={`hidden md:flex fixed ${CORNER_CLASSES[corner]} z-40 items-center gap-2 rounded-full bg-accent-gold px-4 py-3 font-bold text-zinc-900 shadow-lg transition-[top,bottom,left,right,transform] duration-200 ease-out cursor-pointer hover:scale-105`}
    >
      <CalcIcon />
      Calc
    </button>
  );
}
