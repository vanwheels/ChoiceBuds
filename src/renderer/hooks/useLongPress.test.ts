import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { TouchEvent } from 'react';
import { useLongPress } from './useLongPress';

// Mirrors the hook's own private constants - not exported, so re-declared
// here rather than testing against magic numbers.
const LONG_PRESS_MS = 500;

function touchEvent(x: number, y: number): TouchEvent<HTMLElement> {
  return {
    touches: [{ clientX: x, clientY: y }],
    preventDefault: vi.fn(),
  } as unknown as TouchEvent<HTMLElement>;
}

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fire before the delay elapses', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const { result } = renderHook(() => useLongPress(onStart, onEnd));
    act(() => result.current.onTouchStart(touchEvent(0, 0)));
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS - 1));
    expect(onStart).not.toHaveBeenCalled();
  });

  it('fires onLongPressStart once the delay elapses', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const { result } = renderHook(() => useLongPress(onStart, onEnd));
    act(() => result.current.onTouchStart(touchEvent(0, 0)));
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('fires onLongPressEnd and preventDefaults the trailing click on release after a successful long press', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const { result } = renderHook(() => useLongPress(onStart, onEnd));
    act(() => result.current.onTouchStart(touchEvent(0, 0)));
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    const endEvent = touchEvent(0, 0);
    act(() => result.current.onTouchEnd(endEvent));
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(endEvent.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending timer and never fires onLongPressEnd on a plain tap released before the delay', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const { result } = renderHook(() => useLongPress(onStart, onEnd));
    act(() => result.current.onTouchStart(touchEvent(0, 0)));
    const endEvent = touchEvent(0, 0);
    act(() => result.current.onTouchEnd(endEvent));
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(onStart).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
    expect(endEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('cancels the pending timer if the touch moves past the threshold before the delay elapses', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const { result } = renderHook(() => useLongPress(onStart, onEnd));
    act(() => result.current.onTouchStart(touchEvent(0, 0)));
    act(() => result.current.onTouchMove(touchEvent(50, 0)));
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(onStart).not.toHaveBeenCalled();
  });

  it('fires onLongPressEnd if the touch moves past the threshold after a successful long press', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const { result } = renderHook(() => useLongPress(onStart, onEnd));
    act(() => result.current.onTouchStart(touchEvent(0, 0)));
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    act(() => result.current.onTouchMove(touchEvent(50, 0)));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('fires onLongPressEnd on touch cancel after a successful long press', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const { result } = renderHook(() => useLongPress(onStart, onEnd));
    act(() => result.current.onTouchStart(touchEvent(0, 0)));
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    act(() => result.current.onTouchCancel(touchEvent(0, 0)));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
