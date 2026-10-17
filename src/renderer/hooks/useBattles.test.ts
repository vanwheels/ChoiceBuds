import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBattles } from './useBattles';
import type { Battle, BattlesDatabase } from '../types/pokemon';

function makeBattle(overrides: Partial<Battle> = {}): Battle {
  return {
    id: 'battle-1',
    date: 0,
    teamId: 'team-1',
    teamName: 'Test Team',
    format: 'Reg M-B',
    setId: 'battle-1',
    playerRoster: [],
    broughtIds: [],
    playerActiveIds: [null, null],
    playerFaintedIds: [],
    opponentRoster: [],
    opponentActiveIds: [null, null],
    megaEvolvedIds: [],
    statStages: {},
    statusConditions: {},
    statusSetOnTurn: {},
    turns: [],
    fieldState: { playerSide: {}, opponentSide: {} },
    result: 'in-progress',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('useBattles', () => {
  it('starts loading and settles on an empty list when no database exists', async () => {
    const { result } = renderHook(() => useBattles());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.battles).toEqual([]);
  });

  it('loads and normalizes persisted battles on mount', async () => {
    const database: BattlesDatabase = {
      schemaVersion: 1,
      battles: [makeBattle()],
      tombstones: [],
      lastModified: 0,
    };
    vi.mocked(window.electron.readBattlesDatabase).mockResolvedValueOnce(database);

    const { result } = renderHook(() => useBattles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.battles).toEqual([makeBattle()]);
  });

  it('backfills an empty tombstones list for a database persisted before tombstones existed', async () => {
    vi.mocked(window.electron.readBattlesDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      battles: [makeBattle()],
      lastModified: 0,
    });

    const { result } = renderHook(() => useBattles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tombstones).toEqual([]);
  });

  it('backfills schemaVersion for a database persisted before the field existed', async () => {
    vi.mocked(window.electron.readBattlesDatabase).mockResolvedValueOnce({
      battles: [makeBattle()],
      tombstones: [],
      lastModified: 0,
    });

    const { result } = renderHook(() => useBattles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.battles).toEqual([makeBattle()]);
  });

  it('reports an error when loading throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(window.electron.readBattlesDatabase).mockRejectedValueOnce(new Error('disk error'));

    const { result } = renderHook(() => useBattles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('disk error');
    consoleErrorSpy.mockRestore();
  });

  it('addBattle prepends the new battle and persists the full database', async () => {
    const { result } = renderHook(() => useBattles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addBattle(makeBattle({ id: 'new-battle' }));
    });

    expect(result.current.battles[0].id).toBe('new-battle');
    expect(window.electron.writeBattlesDatabase).toHaveBeenCalledWith(
      expect.objectContaining({ battles: [expect.objectContaining({ id: 'new-battle' })] }),
    );
  });

  it('addBattle leaves state untouched and sets an error when the write fails', async () => {
    const { result } = renderHook(() => useBattles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    vi.mocked(window.electron.writeBattlesDatabase).mockResolvedValueOnce(false);

    let success = true;
    await act(async () => {
      success = await result.current.addBattle(makeBattle());
    });

    expect(success).toBe(false);
    expect(result.current.battles).toEqual([]);
    expect(result.current.error).toBe('Failed to write battles database');
  });

  it('updateBattle merges updates into the matching battle and bumps updatedAt', async () => {
    vi.mocked(window.electron.readBattlesDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      battles: [makeBattle({ updatedAt: 1 })],
      lastModified: 0,
    });
    const { result } = renderHook(() => useBattles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateBattle('battle-1', { result: 'win' });
    });

    expect(result.current.battles[0].result).toBe('win');
    expect(result.current.battles[0].updatedAt).toBeGreaterThan(1);
  });

  it('updateBattle serializes concurrent calls so a slower write landing later never drops an earlier one', async () => {
    vi.mocked(window.electron.readBattlesDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      battles: [makeBattle()],
      lastModified: 0,
    });
    const { result } = renderHook(() => useBattles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // First call's own write resolves *after* the second call's, same as a
    // real IndexedDB/Electron write landing out of issue-order - without
    // serializing+rebasing on the latest ref, the second call's stale base
    // (read before the first call's update applied) would overwrite it.
    vi.mocked(window.electron.writeBattlesDatabase)
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(true), 20)))
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(true), 5)));

    await act(async () => {
      const firstCall = result.current.updateBattle('battle-1', { result: 'win' });
      const secondCall = result.current.updateBattle('battle-1', { teamName: 'Second Edit' });
      await Promise.all([firstCall, secondCall]);
    });

    expect(result.current.battles[0].result).toBe('win');
    expect(result.current.battles[0].teamName).toBe('Second Edit');
  });

  it('updateBattle fails with an error for an unknown battle id', async () => {
    const { result } = renderHook(() => useBattles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = true;
    await act(async () => {
      success = await result.current.updateBattle('missing', { result: 'win' });
    });

    expect(success).toBe(false);
    expect(result.current.error).toContain('missing');
  });

  it('deleteBattle removes the battle and records a tombstone', async () => {
    vi.mocked(window.electron.readBattlesDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      battles: [makeBattle()],
      tombstones: [],
      lastModified: 0,
    });
    const { result } = renderHook(() => useBattles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteBattle('battle-1');
    });

    expect(result.current.battles).toEqual([]);
    expect(result.current.tombstones).toEqual([{ id: 'battle-1', deletedAt: expect.any(Number) }]);
  });

  it('applySyncedState overwrites battles with the given records and clears pending tombstones', async () => {
    vi.mocked(window.electron.readBattlesDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      battles: [makeBattle()],
      tombstones: [],
      lastModified: 0,
    });
    const { result } = renderHook(() => useBattles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteBattle('battle-1'); // leaves a pending tombstone behind
    });
    expect(result.current.tombstones).not.toEqual([]);

    const mergedBattle = makeBattle({ id: 'from-server' });
    await act(async () => {
      await result.current.applySyncedState([mergedBattle]);
    });

    expect(result.current.battles).toEqual([mergedBattle]);
    expect(result.current.tombstones).toEqual([]);
  });

  it('refreshBattles reloads from disk and getBattleById looks up by id', async () => {
    const { result } = renderHook(() => useBattles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(window.electron.readBattlesDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      battles: [makeBattle({ id: 'refreshed' })],
      lastModified: 0,
    });

    await act(async () => {
      await result.current.refreshBattles();
    });

    expect(result.current.getBattleById('refreshed')?.id).toBe('refreshed');
    expect(result.current.getBattleById('nope')).toBeUndefined();
  });
});
