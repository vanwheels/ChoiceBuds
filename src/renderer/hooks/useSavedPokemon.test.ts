import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSavedPokemon } from './useSavedPokemon';
import type { ImportedPokemonInfo, SavedPokemonDatabase, ShowdownPokemon } from '../types/pokemon';

const ZERO_EVS = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

function makeShowdownPokemon(overrides: Partial<ShowdownPokemon> = {}): ShowdownPokemon {
  return {
    species: 'Gengar',
    level: 50,
    shiny: false,
    gigantamax: false,
    happiness: 255,
    evs: { ...ZERO_EVS },
    moves: ['Shadow Ball'],
    ...overrides,
  };
}

function makePokemon(overrides: Partial<ShowdownPokemon> = {}): ImportedPokemonInfo {
  return {
    showdownData: makeShowdownPokemon(overrides),
    pokedexNumber: 94,
    types: ['ghost', 'poison'],
    baseStats: { hp: 60, attack: 65, defense: 60, specialAttack: 130, specialDefense: 75, speed: 110 },
    spriteUrl: 'https://example.com/gengar.png',
    importedAt: Date.now(),
  };
}

describe('useSavedPokemon', () => {
  it('starts loading and settles on an empty list when no database exists', async () => {
    const { result } = renderHook(() => useSavedPokemon());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.savedPokemon).toEqual([]);
  });

  it('loads the persisted saved-Pokemon list on mount', async () => {
    const database: SavedPokemonDatabase = {
      version: 1,
      savedPokemon: [{ id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 1, updatedAt: 1 }],
      lastModified: 1,
    };
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce(database);

    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.savedPokemon).toHaveLength(1);
  });

  it('reports an error when loading throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(window.electron.readSavedPokemonDatabase).mockRejectedValueOnce(new Error('disk error'));

    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('disk error');
    consoleErrorSpy.mockRestore();
  });

  it('addSavedPokemonBatch labels each entry from nickname/species, deduping within the same batch', async () => {
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addSavedPokemonBatch([
        makePokemon({ species: 'Gengar' }),
        makePokemon({ species: 'Gengar' }),
      ]);
    });

    const labels = result.current.savedPokemon.map(e => e.label);
    expect(labels).toEqual(['Gengar', 'Gengar (2)']);
  });

  it('addSavedPokemonBatch dedupes against an existing label, not just others in the same batch', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      version: 1,
      savedPokemon: [{ id: 'existing', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 }],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addSavedPokemonBatch([makePokemon({ species: 'Gengar' })]);
    });

    expect(result.current.savedPokemon.map(e => e.label)).toContain('Gengar (2)');
    expect(result.current.savedPokemon).toHaveLength(2);
  });

  it('renameSavedPokemon updates the label of the matching entry only', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      version: 1,
      savedPokemon: [
        { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 },
        { id: 'b', label: 'Rillaboom', pokemon: makePokemon({ species: 'Rillaboom' }), savedAt: 0, updatedAt: 0 },
      ],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.renameSavedPokemon('a', 'My Special Gengar');
    });

    expect(success).toBe(true);
    expect(result.current.savedPokemon.find(e => e.id === 'a')?.label).toBe('My Special Gengar');
    expect(result.current.savedPokemon.find(e => e.id === 'b')?.label).toBe('Rillaboom');
  });

  it('renameSavedPokemon fails with an error for an unknown id', async () => {
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = true;
    await act(async () => {
      success = await result.current.renameSavedPokemon('nope', 'X');
    });

    expect(success).toBe(false);
    expect(result.current.error).toContain('nope');
  });

  it('deleteSavedPokemon removes only the targeted entry', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      version: 1,
      savedPokemon: [
        { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 },
        { id: 'b', label: 'Rillaboom', pokemon: makePokemon({ species: 'Rillaboom' }), savedAt: 0, updatedAt: 0 },
      ],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteSavedPokemon('a');
    });

    expect(result.current.savedPokemon.map(e => e.id)).toEqual(['b']);
  });

  it('refreshSavedPokemon reloads from disk', async () => {
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      version: 1,
      savedPokemon: [{ id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 }],
      lastModified: 0,
    });

    await act(async () => {
      await result.current.refreshSavedPokemon();
    });

    expect(result.current.savedPokemon).toHaveLength(1);
  });

  it('getSavedSetsForSpecies matches case-insensitively against the stored species', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      version: 1,
      savedPokemon: [
        { id: 'a', label: 'Gengar', pokemon: makePokemon({ species: 'Gengar' }), savedAt: 0, updatedAt: 0 },
        { id: 'b', label: 'Rillaboom', pokemon: makePokemon({ species: 'Rillaboom' }), savedAt: 0, updatedAt: 0 },
      ],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getSavedSetsForSpecies('gengar').map(e => e.id)).toEqual(['a']);
    expect(result.current.getSavedSetsForSpecies('Zapdos')).toEqual([]);
  });
});
