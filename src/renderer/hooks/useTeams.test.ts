import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTeams } from './useTeams';
import type { Team, TeamsDatabase } from '../types/pokemon';

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

describe('useTeams', () => {
  it('starts loading and settles on an empty list when no database exists', async () => {
    const { result } = renderHook(() => useTeams());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.teams).toEqual([]);
    expect(result.current.expandedCardIds).toEqual(new Set());
  });

  it('loads persisted teams on mount', async () => {
    const database: TeamsDatabase = { version: 1, teams: [makeTeam()], lastModified: 0 };
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce(database);

    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.teams).toEqual([makeTeam()]);
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

  it('deleteTeam removes the team and clears its expansion state', async () => {
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce({
      version: 1,
      teams: [makeTeam()],
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
  });

  it('reorderTeam is a no-op for identical ids or an unknown target', async () => {
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce({
      version: 1,
      teams: [makeTeam({ id: 'a' }), makeTeam({ id: 'b' })],
      lastModified: 0,
    });
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(await result.current.reorderTeam('a', 'a')).toBe(false);
    expect(await result.current.reorderTeam('a', 'missing-target')).toBe(false);
    expect(window.electron.writeTeamsDatabase).not.toHaveBeenCalled();
  });

  it('reorderTeam inserts the dragged team immediately before the target', async () => {
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce({
      version: 1,
      teams: [makeTeam({ id: 'a' }), makeTeam({ id: 'b' }), makeTeam({ id: 'c' })],
      lastModified: 0,
    });
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.reorderTeam('a', 'c');
    });

    expect(result.current.teams.map(t => t.id)).toEqual(['b', 'a', 'c']);
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
