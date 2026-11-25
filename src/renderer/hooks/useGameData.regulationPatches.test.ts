/**
 * Regulation-scoped patches through useGameData's read boundary: a dated
 * entry applies to the regulation it's tagged with and every later one, and
 * is absent from earlier ones (docs/investigations/reg-m-d.md §7). The
 * patch tables are empty in production until Legs 6-8 fill them, so this
 * mocks them with test entries tagged REG-MC.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGameData } from './useGameData';
import type { GameDataCache } from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';

vi.mock('../config/championsRegulationPatches', () => ({
  CHAMPIONS_DATED_MOVE_PATCHES: {
    'shadow-ball': [{ since: 'REG-MC', change: { accuracy: 50, description: 'Patched.' } }],
  },
  CHAMPIONS_DATED_ABILITY_PATCHES: {
    'cursed-body': [{ since: 'REG-MC', change: { description: 'Patched ability.' } }],
  },
  CHAMPIONS_DATED_MOVEPOOL_ADDITIONS: {
    // tera-blast is stripped by the always-on patch removals, so seeing it
    // come back proves additions run after every removal.
    gengar: [{ since: 'REG-MC', change: ['psych-up', 'tera-blast'] }],
  },
}));

const NOW = Date.now();
const LATER = NOW + 100_000;

function makeCache(): GameDataCache {
  return {
    schemaVersion: 1,
    moves: {
      'shadow-ball': {
        name: 'shadow-ball',
        type: 'ghost',
        category: 'special',
        power: 80,
        pp: 15,
        accuracy: 100,
        description: 'Original.',
        flags: [],
        target: 'selected-pokemon',
        meta: { ailment: 'none', ailmentChance: 0, flinchChance: 0, critRate: 0 },
        cachedAt: NOW,
        expiresAt: LATER,
      },
    },
    items: {},
    abilities: {
      'cursed-body': {
        name: 'cursed-body',
        description: 'Original ability.',
        cachedAt: NOW,
        expiresAt: LATER,
      },
    },
    learnsets: {
      gengar: {
        species: 'gengar',
        abilities: ['cursed-body'],
        moves: ['shadow-ball', 'tera-blast'],
        hasChampionsMoveData: true,
        cachedAt: NOW,
        expiresAt: LATER,
      },
    },
    usage: {},
    lastCleaned: NOW,
    lastSyncedSpeciesNames: [],
  };
}

async function renderLoaded() {
  vi.mocked(window.electron.readGameDataCache).mockResolvedValueOnce(makeCache());
  const { result } = renderHook(() => useGameData());
  await waitFor(() => expect(result.current.isInitialized).toBe(true));
  return result;
}

const APPLIES: RegulationId[] = ['REG-MC', 'REG-MD'];

describe('useGameData regulation-scoped patches', () => {
  it('getCachedMove applies a dated move patch from its regulation onward only', async () => {
    const result = await renderLoaded();
    for (const reg of APPLIES) {
      const move = result.current.getCachedMove('Shadow Ball', reg);
      expect(move?.accuracy).toBe(50);
      expect(move?.description).toBe('Patched.');
    }
    const before = result.current.getCachedMove('Shadow Ball', 'REG-MB');
    expect(before?.accuracy).toBe(100);
    expect(before?.description).toBe('Original.');
  });

  it('getCachedAbility applies a dated ability patch from its regulation onward only', async () => {
    const result = await renderLoaded();
    for (const reg of APPLIES) {
      expect(result.current.getCachedAbility('Cursed Body', reg)?.description).toBe(
        'Patched ability.',
      );
    }
    expect(result.current.getCachedAbility('Cursed Body', 'REG-MB')?.description).toBe(
      'Original ability.',
    );
  });

  it('getCachedSpeciesLearnset adds dated moves after every removal, from its regulation onward only', async () => {
    const result = await renderLoaded();
    for (const reg of APPLIES) {
      expect(result.current.getCachedSpeciesLearnset('gengar', undefined, reg)?.moves).toEqual([
        'shadow-ball',
        'psych-up',
        'tera-blast',
      ]);
    }
    expect(result.current.getCachedSpeciesLearnset('gengar', undefined, 'REG-MB')?.moves).toEqual([
      'shadow-ball',
    ]);
  });

  it('getEnrichedSpeciesOptions resolves the learnset and its moves for the given regulation', async () => {
    const result = await renderLoaded();
    const md = await result.current.getEnrichedSpeciesOptions('gengar', undefined, 'REG-MD');
    expect(md.moves.find((m) => m.name === 'shadow-ball')?.accuracy).toBe(50);
    expect(md.abilities[0]?.description).toBe('Patched ability.');

    const mb = await result.current.getEnrichedSpeciesOptions('gengar', undefined, 'REG-MB');
    expect(mb.moves.map((m) => m.name)).toEqual(['shadow-ball']);
    expect(mb.moves[0]?.accuracy).toBe(100);
    expect(mb.abilities[0]?.description).toBe('Original ability.');
  });
});
