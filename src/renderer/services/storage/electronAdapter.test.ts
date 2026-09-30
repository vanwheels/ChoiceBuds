import { describe, it, expect, vi } from 'vitest';
import { ElectronStorageAdapter } from './electronAdapter';

describe('ElectronStorageAdapter', () => {
  it('reads teams-database through window.electron.readTeamsDatabase', async () => {
    const database = { version: 1, teams: [], tombstones: [], lastModified: 0 };
    vi.mocked(window.electron.readTeamsDatabase).mockResolvedValueOnce(database);

    const result = await new ElectronStorageAdapter().read('teams-database');
    expect(result).toEqual(database);
  });

  it('writes teams-database through window.electron.writeTeamsDatabase', async () => {
    const database = { version: 1, teams: [], tombstones: [], lastModified: 0 };

    const result = await new ElectronStorageAdapter().write('teams-database', database);
    expect(result).toBe(true);
    expect(window.electron.writeTeamsDatabase).toHaveBeenCalledWith(database);
  });

  it('reads pokeapi-cache through window.electron.readPokeAPICache', async () => {
    const cache = { version: 1, entries: {}, lastCleaned: 0 };
    vi.mocked(window.electron.readPokeAPICache).mockResolvedValueOnce(cache);

    const result = await new ElectronStorageAdapter().read('pokeapi-cache');
    expect(result).toEqual(cache);
  });

  it('writes pokeapi-cache through window.electron.writePokeAPICache', async () => {
    const cache = { version: 1, entries: {}, lastCleaned: 0 };

    const result = await new ElectronStorageAdapter().write('pokeapi-cache', cache);
    expect(result).toBe(true);
    expect(window.electron.writePokeAPICache).toHaveBeenCalledWith(cache);
  });
});
