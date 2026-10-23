import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  usePokemonFormToggle,
  setPokemonActiveForm,
  useActiveFormsForIds,
} from './usePokemonFormToggle';

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

describe('useActiveFormsForIds', () => {
  it('starts every given id at null (base form)', () => {
    const { result } = renderHook(() => useActiveFormsForIds(['multi-test-1a', 'multi-test-1b']));
    expect(result.current).toEqual({ 'multi-test-1a': null, 'multi-test-1b': null });
  });

  it('picks up a toggle set externally (e.g. from a mounted Team Builder card)', () => {
    const { result } = renderHook(() => useActiveFormsForIds(['multi-test-2a', 'multi-test-2b']));

    act(() => setPokemonActiveForm('multi-test-2a', 'gengar-mega'));
    expect(result.current).toEqual({ 'multi-test-2a': 'gengar-mega', 'multi-test-2b': null });
  });

  it('returns a stable object reference across re-renders when nothing changed', () => {
    const { result, rerender } = renderHook(() => useActiveFormsForIds(['multi-test-3']));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('stops reacting to an id once it drops out of the given list', () => {
    const { result, rerender } = renderHook(({ ids }) => useActiveFormsForIds(ids), {
      initialProps: { ids: ['multi-test-4a', 'multi-test-4b'] },
    });
    rerender({ ids: ['multi-test-4a'] });

    act(() => setPokemonActiveForm('multi-test-4b', 'aegislash-blade'));
    expect(result.current).toEqual({ 'multi-test-4a': null });
  });
});
