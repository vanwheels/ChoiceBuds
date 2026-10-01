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
 * Snap animation: a CSS transition can't interpolate `top`/`left` swapping
 * with `bottom`/`right` (whichever pair isn't set falls back to `auto`,
 * and transitioning to/from `auto` isn't animatable), so going from e.g.
 * bottom-right to top-left always jumped even with a transition on those
 * properties. Instead, the drop computes the target corner's resting
 * pixel position itself, applies an inline `transform` that holds the
 * button exactly where it was released, switches the corner class
 * underneath it (invisible - the transform cancels it out), then animates
 * that transform back to zero next frame: a plain translate, which the
 * browser can always interpolate regardless of which edges changed.
 *
 * Desktop/tablet only (`hidden md:flex`) - Sidebar.tsx's mobile top bar has
 * its own compact, non-floating Calc entry for phone-sized viewports.
 */

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
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
/** Tailwind's `-6` spacing token (1.5rem @ the default 16px root font
 * size) - the same value CORNER_CLASSES' `bottom-6`/`right-6`/etc. resolve
 * to, needed here to compute a target corner's resting position without
 * waiting for a render. */
const CORNER_OFFSET_PX = 24;
const SNAP_TRANSITION = 'transform 200ms ease-out';

function nearestCorner(clientX: number, clientY: number): CalcButtonCorner {
  const isRight = clientX >= window.innerWidth / 2;
  const isBottom = clientY >= window.innerHeight / 2;
  if (isBottom) return isRight ? 'bottom-right' : 'bottom-left';
  return isRight ? 'top-right' : 'top-left';
}

function restingPosition(corner: CalcButtonCorner, width: number, height: number) {
  return {
    left: corner.endsWith('right') ? window.innerWidth - width - CORNER_OFFSET_PX : CORNER_OFFSET_PX,
    top: corner.startsWith('bottom') ? window.innerHeight - height - CORNER_OFFSET_PX : CORNER_OFFSET_PX,
  };
}

export function CalcLauncherButton({ onOpen }: CalcLauncherButtonProps) {
  const { corner, setCorner } = useCalcButtonCorner();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const start = pointerStart.current;
    const btn = buttonRef.current;
    if (!start || !btn) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!isDragging.current && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      isDragging.current = true;
      btn.style.transition = 'none';
    }
    if (isDragging.current) {
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }, []);

  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const btn = buttonRef.current;
    if (isDragging.current && btn) {
      const dropRect = btn.getBoundingClientRect();
      const target = nearestCorner(e.clientX, e.clientY);
      const rest = restingPosition(target, dropRect.width, dropRect.height);
      // Cancel out the corner-class switch with an equal-and-opposite
      // transform, so the button stays visually put at the drop point.
      btn.style.transform = `translate(${dropRect.left - rest.left}px, ${dropRect.top - rest.top}px)`;
      setCorner(target);
      // Next frame, animate that transform back to 0 - sliding the button
      // from the drop point into its real resting spot.
      requestAnimationFrame(() => {
        btn.style.transition = SNAP_TRANSITION;
        btn.style.transform = '';
        const clearTransition = () => {
          btn.style.transition = '';
          btn.removeEventListener('transitionend', clearTransition);
        };
        btn.addEventListener('transitionend', clearTransition);
      });
    }
    pointerStart.current = null;
  }, [setCorner]);

  const handleClick = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }
    onOpen();
  }, [onOpen]);

  return (
    <button
      ref={buttonRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      aria-label="Open Calc"
      style={{ touchAction: 'none' }}
      className={`hidden md:flex fixed ${CORNER_CLASSES[corner]} z-40 items-center gap-2 rounded-full bg-accent-gold px-4 py-3 font-bold text-zinc-900 shadow-lg transition-transform cursor-pointer hover:scale-105`}
    >
      <CalcIcon />
      Calc
    </button>
  );
}
