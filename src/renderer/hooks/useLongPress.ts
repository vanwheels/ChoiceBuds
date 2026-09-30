/**
 * useLongPress Hook - Touch's Analog to Mouse Hover
 * Holding a touch point for LONG_PRESS_MS calls onLongPressStart (same
 * trigger a mouse hover-enter would fire); releasing calls onLongPressEnd
 * (hover-leave). Cancels itself if the touch moves past
 * MOVE_CANCEL_THRESHOLD_PX before the delay elapses, so a scroll/drag is
 * never mistaken for a long-press.
 *
 * preventDefault on a successful long-press's touchend blocks the browser's
 * synthetic click that would otherwise follow and fire whatever onClick the
 * same element also carries (e.g. opening a picker panel) - a plain tap
 * (released before the delay) is left untouched so that click still fires
 * normally. touchend isn't one of the events React marks passive by default
 * (only touchstart/touchmove/wheel are), so preventDefault here works
 * without a runtime warning.
 */

import { useCallback, useRef } from 'react';
import type { TouchEvent } from 'react';

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_THRESHOLD_PX = 10;

export interface LongPressHandlers {
  onTouchStart: (e: TouchEvent<HTMLElement>) => void;
  onTouchMove: (e: TouchEvent<HTMLElement>) => void;
  onTouchEnd: (e: TouchEvent<HTMLElement>) => void;
  onTouchCancel: (e: TouchEvent<HTMLElement>) => void;
}

export function useLongPress(onLongPressStart: () => void, onLongPressEnd: () => void): LongPressHandlers {
  const timerRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const activeRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const end = useCallback(() => {
    clearTimer();
    if (activeRef.current) {
      activeRef.current = false;
      onLongPressEnd();
    }
  }, [clearTimer, onLongPressEnd]);

  const onTouchStart = useCallback((e: TouchEvent<HTMLElement>) => {
    const touch = e.touches[0];
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      activeRef.current = true;
      onLongPressStart();
    }, LONG_PRESS_MS);
  }, [clearTimer, onLongPressStart]);

  const onTouchMove = useCallback((e: TouchEvent<HTMLElement>) => {
    if (!startPosRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startPosRef.current.x;
    const dy = touch.clientY - startPosRef.current.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_THRESHOLD_PX) end();
  }, [end]);

  const onTouchEnd = useCallback((e: TouchEvent<HTMLElement>) => {
    if (activeRef.current) e.preventDefault();
    end();
  }, [end]);

  const onTouchCancel = useCallback(() => end(), [end]);

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
}
