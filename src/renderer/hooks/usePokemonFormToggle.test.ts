import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePokemonFormToggle, setPokemonActiveForm } from './usePokemonFormToggle';

// Module-level store, same caveat as useMegaSprite.test.ts - every test
// below uses its own never-reused pokemonId.

describe('usePokemonFormToggle', () => {
  it('starts at null (base form) for an id never toggled before', () => {
    const { result } = renderHook(() => usePokemonFormToggle('mon-test-1'));
    expect(result.current.activeForm).toBeNull();
  });

  it('setActiveForm sets then reverts to null', () => {
    const { result } = renderHook(() => usePokemonFormToggle('mon-test-2'));

    act(() => result.current.setActiveForm('charizard-mega-x'));
    expect(result.current.activeForm).toBe('charizard-mega-x');

    act(() => result.current.setActiveForm(null));
    expect(result.current.activeForm).toBeNull();
  });

  it('toggleActiveForm activates the given form, then reverts on a second call with the same form', () => {
    const { result } = renderHook(() => usePokemonFormToggle('mon-test-3'));

    act(() => result.current.toggleActiveForm('aegislash-blade'));
    expect(result.current.activeForm).toBe('aegislash-blade');

    act(() => result.current.toggleActiveForm('aegislash-blade'));
    expect(result.current.activeForm).toBeNull();
  });

  it('toggleActiveForm with a different form switches directly, without needing to revert first', () => {
    const { result } = renderHook(() => usePokemonFormToggle('mon-test-4'));

    act(() => result.current.toggleActiveForm('charizard-mega-x'));
    expect(result.current.activeForm).toBe('charizard-mega-x');

    act(() => result.current.toggleActiveForm('charizard-mega-y'));
    expect(result.current.activeForm).toBe('charizard-mega-y');
  });

  it('keeps state independent per pokemonId', () => {
    const { result: a } = renderHook(() => usePokemonFormToggle('mon-test-5a'));
    const { result: b } = renderHook(() => usePokemonFormToggle('mon-test-5b'));

    act(() => a.current.setActiveForm('gengar-mega'));
    expect(a.current.activeForm).toBe('gengar-mega');
    expect(b.current.activeForm).toBeNull();
  });

  it('shares state across independently mounted hook instances for the same id', () => {
    const { result: first } = renderHook(() => usePokemonFormToggle('mon-test-6'));
    const { result: second } = renderHook(() => usePokemonFormToggle('mon-test-6'));

    act(() => first.current.setActiveForm('aegislash-blade'));
    expect(second.current.activeForm).toBe('aegislash-blade');

    act(() => second.current.setActiveForm(null));
    expect(first.current.activeForm).toBeNull();
  });

  it('exposes setPokemonActiveForm for use outside of React, picked up by mounted hooks', () => {
    const { result } = renderHook(() => usePokemonFormToggle('mon-test-7'));

    act(() => setPokemonActiveForm('mon-test-7', 'aegislash-blade'));
    expect(result.current.activeForm).toBe('aegislash-blade');
  });

  it('is a no-op (no re-render) when set to the form that is already active', () => {
    const { result } = renderHook(() => usePokemonFormToggle('mon-test-8'));
    act(() => result.current.setActiveForm('gengar-mega'));
    const activeFormBefore = result.current.activeForm;

    act(() => result.current.setActiveForm('gengar-mega'));
    expect(result.current.activeForm).toBe(activeFormBefore);
  });
});
