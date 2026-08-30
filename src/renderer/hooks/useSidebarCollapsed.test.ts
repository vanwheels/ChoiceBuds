import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSidebarCollapsed } from './useSidebarCollapsed';

const STORAGE_KEY = 'choicebuds:sidebarCollapsed';

describe('useSidebarCollapsed', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to expanded (not collapsed) with no stored preference', () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current.collapsed).toBe(false);
  });

  it('reads a previously-persisted collapsed state on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current.collapsed).toBe(true);
  });

  it('toggleCollapsed flips state and persists it', () => {
    const { result } = renderHook(() => useSidebarCollapsed());

    act(() => result.current.toggleCollapsed());
    expect(result.current.collapsed).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');

    act(() => result.current.toggleCollapsed());
    expect(result.current.collapsed).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
  });

  it('ignores an unrecognized stored value and defaults to expanded', () => {
    localStorage.setItem(STORAGE_KEY, 'garbage');
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current.collapsed).toBe(false);
  });
});
