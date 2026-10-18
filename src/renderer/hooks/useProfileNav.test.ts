import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileNav } from './useProfileNav';

describe('useProfileNav', () => {
  it('starts with no profile view open', () => {
    const { result } = renderHook(() => useProfileNav());
    expect(result.current.viewingUsername).toBeNull();
  });

  it('openProfile pushes a username onto the stack', () => {
    const { result } = renderHook(() => useProfileNav());
    act(() => result.current.openProfile('vanny'));
    expect(result.current.viewingUsername).toBe('vanny');
  });

  it('trims whitespace and ignores a blank/whitespace-only username', () => {
    const { result } = renderHook(() => useProfileNav());

    act(() => result.current.openProfile('  vanny  '));
    expect(result.current.viewingUsername).toBe('vanny');

    act(() => result.current.openProfile('   '));
    expect(result.current.viewingUsername).toBe('vanny');
  });

  it('openProfile from an already-open profile pushes a second stack entry, and goBack pops one level at a time', () => {
    const { result } = renderHook(() => useProfileNav());

    act(() => result.current.openProfile('vanny'));
    act(() => result.current.openProfile('someoneElse'));
    expect(result.current.viewingUsername).toBe('someoneElse');

    act(() => result.current.goBack());
    expect(result.current.viewingUsername).toBe('vanny');

    act(() => result.current.goBack());
    expect(result.current.viewingUsername).toBeNull();
  });

  it('goBack on an empty stack stays null rather than throwing', () => {
    const { result } = renderHook(() => useProfileNav());
    act(() => result.current.goBack());
    expect(result.current.viewingUsername).toBeNull();
  });

  it('closeProfile resets the whole stack regardless of depth', () => {
    const { result } = renderHook(() => useProfileNav());

    act(() => result.current.openProfile('vanny'));
    act(() => result.current.openProfile('someoneElse'));
    act(() => result.current.closeProfile());

    expect(result.current.viewingUsername).toBeNull();
  });
});
