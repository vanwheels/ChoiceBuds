/**
 * pokepaste.test.ts - covers createPokepaste(), the export-direction half of
 * services/pokepaste.ts. The import-direction helpers (extractPokepasteId,
 * detectRegulationFromNotes) predate this test file and aren't covered here -
 * pre-existing gap, not in scope for this change.
 */
import { describe, it, expect, vi } from 'vitest';
import { createPokepaste } from './pokepaste';
import type { ShowdownPokemon } from '../types/pokemon';

const testMon: ShowdownPokemon = {
  species: 'Flutter Mane',
  ability: 'Protosynthesis',
  level: 50,
  shiny: false,
  gigantamax: false,
  happiness: 255,
  nature: 'Timid',
  evs: { hp: 4, attack: 0, defense: 0, specialAttack: 252, specialDefense: 0, speed: 252 },
  moves: ['Moonblast', 'Shadow Ball', 'Protect', 'Taunt'],
};

describe('createPokepaste', () => {
  it('posts the formatted Showdown text plus title/author/notes through the IPC bridge', async () => {
    window.electron.createPokepaste = vi.fn().mockResolvedValue('https://pokepast.es/abc123');

    const url = await createPokepaste([testMon], 'My Team', 'Ethan', 'Reg M-B');

    expect(url).toBe('https://pokepast.es/abc123');
    expect(window.electron.createPokepaste).toHaveBeenCalledWith({
      paste: expect.stringContaining('Flutter Mane'),
      title: 'My Team',
      author: 'Ethan',
      notes: 'Reg M-B',
    });
  });

  it('returns null when the main process reports failure', async () => {
    window.electron.createPokepaste = vi.fn().mockResolvedValue(null);

    const url = await createPokepaste([testMon]);

    expect(url).toBeNull();
  });
});
