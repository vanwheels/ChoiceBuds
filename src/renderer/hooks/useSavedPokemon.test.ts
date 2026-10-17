import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSavedPokemon } from './useSavedPokemon';
import type {
  ImportedPokemonInfo,
  SavedPokemonDatabase,
  SavedPokemonEntry,
  ShowdownPokemon,
} from '../types/pokemon';

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
    baseStats: {
      hp: 60,
      attack: 65,
      defense: 60,
      specialAttack: 130,
      specialDefense: 75,
      speed: 110,
    },
    spriteUrl: 'https://example.com/gengar.png',
    importedAt: Date.now(),
    id: crypto.randomUUID(),
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
      schemaVersion: 1,
      savedPokemon: [
        { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 1, updatedAt: 1 },
      ],
      tombstones: [],
      lastModified: 1,
    };
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce(database);

    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.savedPokemon).toHaveLength(1);
  });

  it('self-heals a species stored as PokeAPI\'s raw "-Male"/"-Female" resource text on load', async () => {
    const database: SavedPokemonDatabase = {
      schemaVersion: 1,
      savedPokemon: [
        {
          id: 'a',
          label: 'Indeedee',
          pokemon: makePokemon({ species: 'Indeedee-Female' }),
          savedAt: 1,
          updatedAt: 1,
        },
        {
          id: 'b',
          label: 'Indeedee 2',
          pokemon: makePokemon({ species: 'Indeedee-Male' }),
          savedAt: 1,
          updatedAt: 1,
        },
      ],
      tombstones: [],
      lastModified: 1,
    };
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce(database);

    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.savedPokemon.map((e) => e.pokemon.showdownData.species)).toEqual([
      'Indeedee-F',
      'Indeedee',
    ]);

    // Also needs to persist for real, with a freshly bumped updatedAt (raw
    // entries were both 1), so a future sync push can actually win the
    // Worker's merge instead of losing to its own still-bad stored copy -
    // see TODO.md's Roster Picker leg.
    await waitFor(() => expect(window.electron.writeSavedPokemonDatabase).toHaveBeenCalled());
    const calls = vi.mocked(window.electron.writeSavedPokemonDatabase).mock.calls;
    const [persisted] = calls[calls.length - 1];
    expect(persisted.savedPokemon[0].updatedAt).toBeGreaterThan(1);
    expect(persisted.savedPokemon[1].updatedAt).toBeGreaterThan(1);
    expect(
      persisted.savedPokemon.map((e: SavedPokemonEntry) => e.pokemon.showdownData.species),
    ).toEqual(['Indeedee-F', 'Indeedee']);
  });

  it('backfills an empty tombstones list for a database persisted before tombstones existed', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [
        { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 1, updatedAt: 1 },
      ],
      lastModified: 1,
    });

    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tombstones).toEqual([]);
  });

  it('backfills schemaVersion for a database persisted before the field existed', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      savedPokemon: [
        { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 1, updatedAt: 1 },
      ],
      tombstones: [],
      lastModified: 1,
    });

    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.savedPokemon).toHaveLength(1);
  });

  it('reports an error when loading throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(window.electron.readSavedPokemonDatabase).mockRejectedValueOnce(
      new Error('disk error'),
    );

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

    const labels = result.current.savedPokemon.map((e) => e.label);
    expect(labels).toEqual(['Gengar', 'Gengar (2)']);
  });

  it('addSavedPokemonBatch dedupes against an existing label, not just others in the same batch', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [
        { id: 'existing', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 },
      ],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addSavedPokemonBatch([makePokemon({ species: 'Gengar' })]);
    });

    expect(result.current.savedPokemon.map((e) => e.label)).toContain('Gengar (2)');
    expect(result.current.savedPokemon).toHaveLength(2);
  });

  it('addSavedPokemonBatch prefers a supplied label over nickname/species, still deduping it', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [
        { id: 'existing', label: 'My Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 },
      ],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addSavedPokemonBatch(
        [makePokemon({ species: 'Gengar' })],
        ['My Gengar'],
      );
    });

    expect(result.current.savedPokemon.map((e) => e.label)).toContain('My Gengar (2)');
  });

  it('addSavedPokemonBatch uses a supplied id instead of generating one, so a caller can know it up front', async () => {
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addSavedPokemonBatch(
        [makePokemon({ species: 'Gengar' })],
        ['My Gengar'],
        ['known-id'],
      );
    });

    expect(result.current.savedPokemon.map((e) => e.id)).toEqual(['known-id']);
  });

  it('renameSavedPokemon updates the label of the matching entry only', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [
        { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 },
        {
          id: 'b',
          label: 'Rillaboom',
          pokemon: makePokemon({ species: 'Rillaboom' }),
          savedAt: 0,
          updatedAt: 0,
        },
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
    expect(result.current.savedPokemon.find((e) => e.id === 'a')?.label).toBe('My Special Gengar');
    expect(result.current.savedPokemon.find((e) => e.id === 'b')?.label).toBe('Rillaboom');
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

  it('toggleSavedPokemonFavorite flips only the matching entry', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [
        { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 },
        {
          id: 'b',
          label: 'Rillaboom',
          pokemon: makePokemon({ species: 'Rillaboom' }),
          savedAt: 0,
          updatedAt: 0,
        },
      ],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.toggleSavedPokemonFavorite('a');
    });

    expect(success).toBe(true);
    expect(result.current.savedPokemon.find((e) => e.id === 'a')?.favorite).toBe(true);
    expect(result.current.savedPokemon.find((e) => e.id === 'b')?.favorite).toBeUndefined();

    await act(async () => {
      success = await result.current.toggleSavedPokemonFavorite('a');
    });

    expect(result.current.savedPokemon.find((e) => e.id === 'a')?.favorite).toBe(false);
  });

  it('toggleSavedPokemonFavorite fails with an error for an unknown id', async () => {
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = true;
    await act(async () => {
      success = await result.current.toggleSavedPokemonFavorite('nope');
    });

    expect(success).toBe(false);
    expect(result.current.error).toContain('nope');
  });

  it('deleteSavedPokemon removes only the targeted entry and records a tombstone', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [
        { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 },
        {
          id: 'b',
          label: 'Rillaboom',
          pokemon: makePokemon({ species: 'Rillaboom' }),
          savedAt: 0,
          updatedAt: 0,
        },
      ],
      tombstones: [],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteSavedPokemon('a');
    });

    expect(result.current.savedPokemon.map((e) => e.id)).toEqual(['b']);
    expect(result.current.tombstones).toEqual([{ id: 'a', deletedAt: expect.any(Number) }]);
  });

  it('applySyncedState overwrites savedPokemon with the given records and clears pending tombstones', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [
        { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 },
      ],
      tombstones: [],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteSavedPokemon('a'); // leaves a pending tombstone behind
    });
    expect(result.current.tombstones).not.toEqual([]);

    const merged = {
      id: 'from-server',
      label: 'Zapdos',
      pokemon: makePokemon({ species: 'Zapdos' }),
      savedAt: 0,
      updatedAt: 0,
    };
    const pushedTombstones = result.current.tombstones; // simulates this push having included it
    await act(async () => {
      await result.current.applySyncedState([merged], pushedTombstones);
    });

    expect(result.current.savedPokemon).toEqual([merged]);
    expect(result.current.tombstones).toEqual([]);
    expect(window.electron.writeSavedPokemonDatabase).toHaveBeenLastCalledWith(
      expect.objectContaining({ savedPokemon: [merged], tombstones: [] }),
    );
  });

  it('applySyncedState keeps a local edit that lands first in the queue over a stale sync snapshot (mirrors the TeamCard Notes blur bug)', async () => {
    const existing = { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 1 };
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [existing],
      tombstones: [],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let renameCall: Promise<boolean>;
    let syncCall: Promise<boolean>;
    await act(async () => {
      renameCall = result.current.renameSavedPokemon('a', 'renamed locally');
      syncCall = result.current.applySyncedState([existing], []);
      await Promise.all([renameCall, syncCall]);
    });

    expect(result.current.savedPokemon[0].label).toBe('renamed locally');
  });

  it('applySyncedState keeps a locally-added entry the sync response does not know about yet, at its own list position', async () => {
    const existing = {
      id: 'existing-1',
      label: 'Gengar',
      pokemon: makePokemon(),
      savedAt: 0,
      updatedAt: 1,
    };
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [existing],
      tombstones: [],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addSavedPokemonBatch([makePokemon()], ['new local'], ['new-local']);
    });
    expect(result.current.savedPokemon.map((e) => e.id)).toEqual(['new-local', 'existing-1']);

    await act(async () => {
      await result.current.applySyncedState([existing], []);
    });

    expect(result.current.savedPokemon.map((e) => e.id)).toEqual(['new-local', 'existing-1']);
  });

  it('applySyncedState does not resurrect an entry deleted locally after the push snapshot was taken, and keeps its tombstone for the next push', async () => {
    const existing = { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 };
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [existing],
      tombstones: [],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let deleteCall: Promise<boolean>;
    let syncCall: Promise<boolean>;
    await act(async () => {
      deleteCall = result.current.deleteSavedPokemon('a');
      syncCall = result.current.applySyncedState([existing], []);
      await Promise.all([deleteCall, syncCall]);
    });

    expect(result.current.savedPokemon).toEqual([]);
    expect(result.current.tombstones).toEqual([{ id: 'a', deletedAt: expect.any(Number) }]);
  });

  it('refreshSavedPokemon reloads from disk', async () => {
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [
        { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 },
      ],
      lastModified: 0,
    });

    await act(async () => {
      await result.current.refreshSavedPokemon();
    });

    expect(result.current.savedPokemon).toHaveLength(1);
  });

  it("updateSavedPokemon merges into the entry's pokemon field and bumps updatedAt, leaving other entries untouched", async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [
        { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 },
        {
          id: 'b',
          label: 'Rillaboom',
          pokemon: makePokemon({ species: 'Rillaboom' }),
          savedAt: 0,
          updatedAt: 0,
        },
      ],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.updateSavedPokemon('a', {
        spriteUrl: 'https://example.com/new.png',
      });
    });

    expect(success).toBe(true);
    const updated = result.current.savedPokemon.find((e) => e.id === 'a');
    expect(updated?.pokemon.spriteUrl).toBe('https://example.com/new.png');
    expect(updated?.pokemon.showdownData.species).toBe('Gengar'); // other pokemon fields untouched
    expect(updated?.updatedAt).toBeGreaterThan(0);
    expect(result.current.savedPokemon.find((e) => e.id === 'b')?.pokemon.spriteUrl).not.toBe(
      'https://example.com/new.png',
    );
  });

  it('updateSavedPokemon serializes concurrent calls so a slower write landing later never drops an earlier one', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [
        { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 },
      ],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // First call's own write resolves *after* the second call's, same as a
    // real IndexedDB/Electron write landing out of issue-order - without
    // serializing+rebasing on the latest ref, the second call's stale base
    // (read before the first call's update applied) would overwrite it.
    vi.mocked(window.electron.writeSavedPokemonDatabase)
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(true), 20)))
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(true), 5)));

    await act(async () => {
      const firstCall = result.current.updateSavedPokemon('a', {
        spriteUrl: 'https://example.com/first.png',
      });
      const secondCall = result.current.updateSavedPokemon('a', { nationalDexNumber: 94 });
      await Promise.all([firstCall, secondCall]);
    });

    const updated = result.current.savedPokemon.find((e) => e.id === 'a');
    expect(updated?.pokemon.spriteUrl).toBe('https://example.com/first.png');
    expect(updated?.pokemon.nationalDexNumber).toBe(94);
  });

  it('updateSavedPokemon fails with an error for an unknown id', async () => {
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = true;
    await act(async () => {
      success = await result.current.updateSavedPokemon('nope', { spriteUrl: 'x' });
    });

    expect(success).toBe(false);
    expect(result.current.error).toContain('nope');
  });

  it('toggleCardExpansion adds and removes an id from expandedCardIds independently per id', async () => {
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.expandedCardIds).toEqual(new Set());

    act(() => result.current.toggleCardExpansion('a'));
    expect(result.current.expandedCardIds).toEqual(new Set(['a']));

    act(() => result.current.toggleCardExpansion('b'));
    expect(result.current.expandedCardIds).toEqual(new Set(['a', 'b']));

    act(() => result.current.toggleCardExpansion('a'));
    expect(result.current.expandedCardIds).toEqual(new Set(['b']));
  });

  it('setSavedPokemonOrder reorders to match the given ids, appending any leftover entries untouched', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [
        { id: 'a', label: 'Gengar', pokemon: makePokemon(), savedAt: 0, updatedAt: 0 },
        {
          id: 'b',
          label: 'Rillaboom',
          pokemon: makePokemon({ species: 'Rillaboom' }),
          savedAt: 0,
          updatedAt: 0,
        },
        {
          id: 'c',
          label: 'Zapdos',
          pokemon: makePokemon({ species: 'Zapdos' }),
          savedAt: 0,
          updatedAt: 0,
        },
      ],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setSavedPokemonOrder(['c', 'a']);
    });

    // 'b' wasn't named in orderedIds - kept, appended after the given ones.
    expect(result.current.savedPokemon.map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });

  it('getSavedSetsForSpecies matches case-insensitively against the stored species', async () => {
    vi.mocked(window.electron.readSavedPokemonDatabase).mockResolvedValueOnce({
      schemaVersion: 1,
      savedPokemon: [
        {
          id: 'a',
          label: 'Gengar',
          pokemon: makePokemon({ species: 'Gengar' }),
          savedAt: 0,
          updatedAt: 0,
        },
        {
          id: 'b',
          label: 'Rillaboom',
          pokemon: makePokemon({ species: 'Rillaboom' }),
          savedAt: 0,
          updatedAt: 0,
        },
      ],
      lastModified: 0,
    });
    const { result } = renderHook(() => useSavedPokemon());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getSavedSetsForSpecies('gengar').map((e) => e.id)).toEqual(['a']);
    expect(result.current.getSavedSetsForSpecies('Zapdos')).toEqual([]);
  });
});
