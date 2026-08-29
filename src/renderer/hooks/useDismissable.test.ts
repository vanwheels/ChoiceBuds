import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDismissable } from './useDismissable';

function fireEscape() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

function fireMouseDown(target: EventTarget) {
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
}

describe('useDismissable', () => {
  it('calls onDismiss on an Escape keydown', () => {
    const onDismiss = vi.fn();
    renderHook(() => useDismissable(onDismiss));
    act(() => fireEscape());
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('ignores keys other than Escape', () => {
    const onDismiss = vi.fn();
    renderHook(() => useDismissable(onDismiss));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss when clicking outside the attached element', () => {
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useDismissable<HTMLDivElement>(onDismiss));
    const inside = document.createElement('div');
    document.body.appendChild(inside);
    result.current.current = inside;

    const outside = document.createElement('div');
    document.body.appendChild(outside);
    act(() => fireMouseDown(outside));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not call onDismiss when clicking inside the attached element', () => {
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useDismissable<HTMLDivElement>(onDismiss));
    const inside = document.createElement('div');
    document.body.appendChild(inside);
    result.current.current = inside;

    act(() => fireMouseDown(inside));

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does not call onDismiss for a click before the ref is attached to anything', () => {
    const onDismiss = vi.fn();
    renderHook(() => useDismissable<HTMLDivElement>(onDismiss));
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    act(() => fireMouseDown(outside));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('removes its listeners on unmount', () => {
    const onDismiss = vi.fn();
    const { unmount } = renderHook(() => useDismissable(onDismiss));
    unmount();
    act(() => fireEscape());
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('re-subscribes to the latest onDismiss when its identity changes', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useDismissable(cb), { initialProps: { cb: first } });
    rerender({ cb: second });
    act(() => fireEscape());
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
