import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileLayout } from './useProfileLayout';

const STORAGE_KEY = 'choicebuds:profileLayout';

describe('useProfileLayout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to grid with no stored preference', () => {
    const { result } = renderHook(() => useProfileLayout());
    expect(result.current.layout).toBe('grid');
  });

  it('reads a previously-persisted list preference on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'list');
    const { result } = renderHook(() => useProfileLayout());
    expect(result.current.layout).toBe('list');
  });

  it('setLayout updates state and persists it', () => {
    const { result } = renderHook(() => useProfileLayout());

    act(() => result.current.setLayout('list'));
    expect(result.current.layout).toBe('list');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('list');

    act(() => result.current.setLayout('grid'));
    expect(result.current.layout).toBe('grid');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('grid');
  });

  it('ignores an unrecognized stored value and defaults to grid', () => {
    localStorage.setItem(STORAGE_KEY, 'garbage');
    const { result } = renderHook(() => useProfileLayout());
    expect(result.current.layout).toBe('grid');
  });
});
