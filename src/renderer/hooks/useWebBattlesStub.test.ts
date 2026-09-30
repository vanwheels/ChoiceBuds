import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWebBattlesStub } from './useWebBattlesStub';
import type { Battle } from '../types/pokemon';

describe('useWebBattlesStub', () => {
  it('reports an always-empty, non-loading, error-free battles state', () => {
    const { result } = renderHook(() => useWebBattlesStub());

    expect(result.current.battles).toEqual([]);
    expect(result.current.tombstones).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('resolves every mutation as unsupported without throwing', async () => {
    const { result } = renderHook(() => useWebBattlesStub());

    await expect(result.current.addBattle({} as Battle)).resolves.toBe(false);
    await expect(result.current.updateBattle('battle-1', {})).resolves.toBe(false);
    await expect(result.current.deleteBattle('battle-1')).resolves.toBe(false);
  });

  it('getBattleById always misses and applySyncedState no-ops successfully', async () => {
    const { result } = renderHook(() => useWebBattlesStub());

    expect(result.current.getBattleById('battle-1')).toBeUndefined();
    await expect(result.current.applySyncedState([{ id: 'battle-1' } as Battle])).resolves.toBe(true);
  });
});
