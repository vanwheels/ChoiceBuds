import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTeams } from './useTeams';
import type { ImportedPokemonInfo, Team, TeamsDatabase } from '../types/pokemon';

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'Test Team',
    format: 'Reg M-B',
    pokemon: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function makePokemon(overrides: Partial<ImportedPokemonInfo> = {}): ImportedPokemonInfo {
  return {
    showdownData: { species: 'Pikachu', level: 50, shiny: false, gigantamax: false, happiness: 255, evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }, moves: [] },
    pokedexNumber: 25,
    types: ['electric'],
    baseStats: { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
    spriteUrl: '',
    importedAt: 0,
    id: 'mon-1',
    ...overrides,
  };
}

describe('useTeams', () => {
  it('starts loading and settles on an empty list when no database exists', async () => {
    const { result } = renderHook(() => useTeams());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.teams).toEqual([]);
    expect(result.current.expandedCardIds).toEqual(new Set());
  });

  it('loads persisted teams on mount', async () => {
    const database: TeamsDatabase = { version: 1, teams: [makeTeam()], tombstones: [], lastModified: 0 };
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce(database);

    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.teams).toEqual([makeTeam()]);
  });

  it('backfills an empty tombstones list for a database persisted before tombstones existed', async () => {
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce({ version: 1, teams: [makeTeam()], lastModified: 0 });

    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tombstones).toEqual([]);
  });

  it('strips a stale "Reg M-A/B/C " prefix from a team name on load', async () => {
    const database: TeamsDatabase = {
      version: 1,
      teams: [
        makeTeam({ id: 'a', name: 'Reg M-A Rain Team' }),
        makeTeam({ id: 'b', name: 'Reg M-B Sun Team' }),
        makeTeam({ id: 'c', name: 'Reg M-C Sand Team' }),
        makeTeam({ id: 'd', name: 'Reg M-D Trick Room' }),
        makeTeam({ id: 'e', name: 'My Reg M-A Team' }),
      ],
      tombstones: [],
      lastModified: 0,
    };
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce(database);

    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.teams.map(t => t.name)).toEqual([
      'Rain Team',
      'Sun Team',
      'Sand Team',
      'Reg M-D Trick Room',
      'My Reg M-A Team',
    ]);
  });

  it('self-heals a species stored as PokeAPI\'s raw "-Male"/"-Female" resource text on load', async () => {
    const database: TeamsDatabase = {
      version: 1,
      teams: [
        makeTeam({
          id: 'a',
          pokemon: [
            makePokemon({ id: 'p1', showdownData: { ...makePokemon().showdownData, species: 'Indeedee-Female' } }),
            makePokemon({ id: 'p2', showdownData: { ...makePokemon().showdownData, species: 'Indeedee-Male' } }),
            makePokemon({ id: 'p3', showdownData: { ...makePokemon().showdownData, species: 'Pikachu' } }),
          ],
        }),
      ],
      tombstones: [],
      lastModified: 0,
    };
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce(database);

    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.teams[0].pokemon.map(p => p.showdownData.species)).toEqual([
      'Indeedee-F', 'Indeedee', 'Pikachu',
    ]);
  });

  it('reports an error when loading throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(window.electron.readTeamsDatabase).mockRejectedValueOnce(new Error('disk error'));

    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('disk error');
    consoleErrorSpy.mockRestore();
  });

  it('addTeam prepends the new team and persists the full database', async () => {
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addTeam(makeTeam({ id: 'new-team' }));
    });

    expect(result.current.teams[0].id).toBe('new-team');
    expect(window.electron.writeTeamsDatabase).toHaveBeenCalledWith(
      expect.objectContaining({ teams: [expect.objectContaining({ id: 'new-team' })] })
    );
  });

  it('addTeam leaves state untouched and sets an error when the write fails', async () => {
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    vi.mocked(window.electron.writeTeamsDatabase).mockResolvedValueOnce(false);

    let success = true;
    await act(async () => {
      success = await result.current.addTeam(makeTeam());
    });

    expect(success).toBe(false);
    expect(result.current.teams).toEqual([]);
    expect(result.current.error).toBe('Failed to write teams database');
  });

  it('updateTeam merges updates into the matching team and bumps updatedAt', async () => {
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce({
      version: 1,
      teams: [makeTeam({ updatedAt: 1 })],
      lastModified: 0,
    });
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateTeam('team-1', { name: 'Renamed' });
    });

    expect(result.current.teams[0].name).toBe('Renamed');
    expect(result.current.teams[0].updatedAt).toBeGreaterThan(1);
  });

  it('updateTeam serializes concurrent calls so a slower write landing later never drops an earlier one (TODO.md Team Edit Needs Double Action)', async () => {
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce({
      version: 1,
      teams: [makeTeam({ pokemon: [] })],
      lastModified: 0,
    });
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // First call's own write resolves *after* the second call's, same as a
    // real IndexedDB/Electron write landing out of issue-order - without
    // serializing+rebasing on the latest ref, the second call's stale base
    // (read before the first call's update applied) would overwrite it.
    vi.mocked(window.electron.writeTeamsDatabase)
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(true), 20)))
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(true), 5)));

    let firstCall: Promise<boolean>;
    let secondCall: Promise<boolean>;
    await act(async () => {
      firstCall = result.current.updateTeam('team-1', { name: 'First Edit' });
      secondCall = result.current.updateTeam('team-1', { author: 'Second Edit' });
      await Promise.all([firstCall, secondCall]);
    });

    expect(result.current.teams[0].name).toBe('First Edit');
    expect(result.current.teams[0].author).toBe('Second Edit');
  });

  it('updateTeam fails with an error for an unknown team id', async () => {
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = true;
    await act(async () => {
      success = await result.current.updateTeam('missing', { name: 'X' });
    });

    expect(success).toBe(false);
    expect(result.current.error).toContain('missing');
  });

  it('deleteTeam removes the team, clears its expansion state, and records a tombstone', async () => {
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce({
      version: 1,
      teams: [makeTeam()],
      tombstones: [],
      lastModified: 0,
    });
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.expandCard('team-1'));
    expect(result.current.expandedCardIds.has('team-1')).toBe(true);

    await act(async () => {
      await result.current.deleteTeam('team-1');
    });

    expect(result.current.teams).toEqual([]);
    expect(result.current.expandedCardIds.has('team-1')).toBe(false);
    expect(result.current.tombstones).toEqual([{ id: 'team-1', deletedAt: expect.any(Number) }]);
    expect(window.electron.writeTeamsDatabase).toHaveBeenLastCalledWith(
      expect.objectContaining({ teams: [], tombstones: [{ id: 'team-1', deletedAt: expect.any(Number) }] })
    );
  });

  it('applySyncedState overwrites teams with the given records and clears pending tombstones', async () => {
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce({
      version: 1,
      teams: [makeTeam()],
      tombstones: [],
      lastModified: 0,
    });
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteTeam('team-1'); // leaves a pending tombstone behind
    });
    expect(result.current.tombstones).not.toEqual([]);

    const mergedTeam = makeTeam({ id: 'from-server' });
    await act(async () => {
      await result.current.applySyncedState([mergedTeam]);
    });

    expect(result.current.teams).toEqual([mergedTeam]);
    expect(result.current.tombstones).toEqual([]);
    expect(window.electron.writeTeamsDatabase).toHaveBeenLastCalledWith(
      expect.objectContaining({ teams: [mergedTeam], tombstones: [] })
    );
  });

  it('setTeamOrder reorders to match the given ids, appending any leftover teams untouched', async () => {
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce({
      version: 1,
      teams: [makeTeam({ id: 'a' }), makeTeam({ id: 'b' }), makeTeam({ id: 'c' })],
      lastModified: 0,
    });
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setTeamOrder(['c', 'a']);
    });

    // 'b' wasn't named in orderedIds - kept, appended after the given ones.
    expect(result.current.teams.map(t => t.id)).toEqual(['c', 'a', 'b']);
  });

  it('setTeamOrder stamps an ascending sortOrder and a fresh updatedAt on every team', async () => {
    // sortOrder/updatedAt need to be stamped on every reorder (not derived
    // from array position alone) so the reorder survives the sync Worker's
    // per-record last-write-wins merge, which has no concept of list
    // position - see Team.sortOrder's doc comment and Web Bug Sweep Leg 7
    // in COMPLETED.md.
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce({
      version: 1,
      teams: [makeTeam({ id: 'a', updatedAt: 1 }), makeTeam({ id: 'b', updatedAt: 1 }), makeTeam({ id: 'c', updatedAt: 1 })],
      lastModified: 0,
    });
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const before = Date.now();
    await act(async () => {
      await result.current.setTeamOrder(['c', 'a']);
    });

    const [c, a, b] = result.current.teams;
    expect([c.sortOrder, a.sortOrder, b.sortOrder]).toEqual([0, 1, 2]);
    expect(c.updatedAt).toBeGreaterThanOrEqual(before);
    expect(a.updatedAt).toBeGreaterThanOrEqual(before);
    expect(b.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('toggleCardExpansion, collapseCard and collapseAllCards manage the expansion set', async () => {
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.toggleCardExpansion('x'));
    expect(result.current.expandedCardIds.has('x')).toBe(true);

    act(() => result.current.toggleCardExpansion('x'));
    expect(result.current.expandedCardIds.has('x')).toBe(false);

    act(() => {
      result.current.expandCard('y');
      result.current.expandCard('z');
    });
    expect(result.current.expandedCardIds).toEqual(new Set(['y', 'z']));

    act(() => result.current.collapseCard('y'));
    expect(result.current.expandedCardIds).toEqual(new Set(['z']));

    act(() => result.current.collapseAllCards());
    expect(result.current.expandedCardIds).toEqual(new Set());
  });

  it('refreshTeams reloads from disk and getTeamById looks up by id', async () => {
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce({
      version: 1,
      teams: [makeTeam({ id: 'refreshed' })],
      lastModified: 0,
    });

    await act(async () => {
      await result.current.refreshTeams();
    });

    expect(result.current.getTeamById('refreshed')?.id).toBe('refreshed');
    expect(result.current.getTeamById('nope')).toBeUndefined();
  });
});
