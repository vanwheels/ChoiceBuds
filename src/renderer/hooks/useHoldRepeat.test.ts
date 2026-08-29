import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHoldRepeat } from './useHoldRepeat';

// Mirrors the hook's own private constants - not exported, so re-declared
// here rather than testing against magic numbers.
const INITIAL_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 80;

describe('useHoldRepeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires once immediately on mouse down', () => {
    const onTick = vi.fn();
    const { result } = renderHook(() => useHoldRepeat(onTick));
    act(() => result.current.onMouseDown());
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('does not repeat before the initial delay elapses', () => {
    const onTick = vi.fn();
    const { result } = renderHook(() => useHoldRepeat(onTick));
    act(() => result.current.onMouseDown());
    act(() => vi.advanceTimersByTime(INITIAL_DELAY_MS - 1));
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('starts repeating on the interval once the initial delay elapses', () => {
    const onTick = vi.fn();
    const { result } = renderHook(() => useHoldRepeat(onTick));
    act(() => result.current.onMouseDown());
    act(() => vi.advanceTimersByTime(INITIAL_DELAY_MS));
    expect(onTick).toHaveBeenCalledTimes(1); // interval just armed, no tick yet
    act(() => vi.advanceTimersByTime(REPEAT_INTERVAL_MS));
    expect(onTick).toHaveBeenCalledTimes(2);
    act(() => vi.advanceTimersByTime(REPEAT_INTERVAL_MS));
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it('stops repeating once onMouseUp is called', () => {
    const onTick = vi.fn();
    const { result } = renderHook(() => useHoldRepeat(onTick));
    act(() => result.current.onMouseDown());
    act(() => vi.advanceTimersByTime(INITIAL_DELAY_MS + REPEAT_INTERVAL_MS * 2));
    expect(onTick).toHaveBeenCalledTimes(3);

    act(() => result.current.onMouseUp());
    act(() => vi.advanceTimersByTime(1000));
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it('stops repeating once onMouseLeave is called', () => {
    const onTick = vi.fn();
    const { result } = renderHook(() => useHoldRepeat(onTick));
    act(() => result.current.onMouseDown());
    act(() => vi.advanceTimersByTime(INITIAL_DELAY_MS + REPEAT_INTERVAL_MS));
    expect(onTick).toHaveBeenCalledTimes(2);

    act(() => result.current.onMouseLeave());
    act(() => vi.advanceTimersByTime(1000));
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it('cancels the pending initial-delay timer if released before it fires', () => {
    const onTick = vi.fn();
    const { result } = renderHook(() => useHoldRepeat(onTick));
    act(() => result.current.onMouseDown());
    act(() => result.current.onMouseUp());
    act(() => vi.advanceTimersByTime(INITIAL_DELAY_MS + REPEAT_INTERVAL_MS * 5));
    expect(onTick).toHaveBeenCalledTimes(1); // only the initial immediate call
  });
});
