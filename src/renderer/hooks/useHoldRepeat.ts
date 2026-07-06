/**
 * useHoldRepeat Hook - Press-and-Hold Button Repeat
 * Returns mouse handlers for a button that should fire once immediately on
 * press, then keep firing on an interval while held, stopping on release
 * or if the pointer leaves the button.
 */

import { useCallback, useRef } from 'react';

const INITIAL_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 80;

export function useHoldRepeat(onTick: () => void) {
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    onTick();
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(onTick, REPEAT_INTERVAL_MS);
    }, INITIAL_DELAY_MS);
  }, [onTick]);

  return { onMouseDown: start, onMouseUp: stop, onMouseLeave: stop };
}
