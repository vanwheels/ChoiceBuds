/**
 * Reg M-D's Dec 2 movepool additions (docs/investigations/reg-m-d.md §5)
 * through useGameData's real learnset pipeline and real patch tables: they
 * reach species with and without PokeAPI champions-tagged data, from Reg M-D
 * onward only, and survive the gated removals table (Mr. Mime's psych-up).
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGameData } from './useGameData';
import type { GameDataCache, SpeciesLearnsetEntry } from '../types/pokemon';
import { fetchSpeciesLearnset } from '../services/pokeapiService';
import { normalizeSpeciesForAPI } from '../services/pokeapi';
import { CHAMPIONS_DATED_MOVEPOOL_ADDITIONS } from '../config/championsRegulationPatches';
import { getRuleset } from '../utils/pokemonRules';

vi.mock('../services/pokeapiService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/pokeapiService')>()),
  fetchSpeciesLearnset: vi.fn(),
}));

const NOW = Date.now();
const LATER = NOW + 100_000;

function tagged(species: string, moves: string[]): SpeciesLearnsetEntry {
  return {
    species,
    abilities: [],
    moves,
    hasChampionsMoveData: true,
    cachedAt: NOW,
    expiresAt: LATER,
  };
}

function makeCache(): GameDataCache {
  return {
    schemaVersion: 1,
    moves: {},
    items: {},
    abilities: {},
    learnsets: {
      alakazam: tagged('alakazam', ['psychic']),
      'rotom-wash': tagged('rotom-wash', ['hydro-pump']),
      umbreon: tagged('umbreon', ['foul-play']),
      gengar: tagged('gengar', ['shadow-ball']),
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

describe('Reg M-D movepool additions', () => {
  it('keys every row by a Reg M-D roster species in its learnset slug form', () => {
    // A misspelled key never matches a learnset and fails silently, so check
    // the whole table rather than only the rows the tests below exercise.
    const roster = new Set(getRuleset('REG-MD').allowedSpecies);
    for (const slug of Object.keys(CHAMPIONS_DATED_MOVEPOOL_ADDITIONS)) {
      expect(roster.has(slug), slug).toBe(true);
      expect(normalizeSpeciesForAPI(slug), slug).toBe(slug);
    }
  });

  it('adds the patch moves to tagged species under Reg M-D only', async () => {
    const result = await renderLoaded();
    const get = (species: string, reg: 'REG-MC' | 'REG-MD') =>
      result.current.getCachedSpeciesLearnset(species, undefined, reg)?.moves;

    expect(get('alakazam', 'REG-MD')).toEqual(['psychic', 'psych-up']);
    expect(get('alakazam', 'REG-MC')).toEqual(['psychic']);
    expect(get('rotom-wash', 'REG-MD')).toEqual(['hydro-pump', 'psych-up']);
    expect(get('rotom-wash', 'REG-MC')).toEqual(['hydro-pump']);
    expect(get('umbreon', 'REG-MD')).toEqual(['foul-play', 'wonder-room', 'play-rough']);
    expect(get('umbreon', 'REG-MC')).toEqual(['foul-play']);
    // A species outside the patch is unchanged either way.
    expect(get('gengar', 'REG-MD')).toEqual(['shadow-ball']);
  });

  it('re-grants Mr. Mime psych-up over the gated removal on an untagged learnset, Reg M-D only', async () => {
    // Untagged, so the gated CHAMPIONS_MOVEPOOL_REMOVALS row (which strips
    // psych-up from mr-mime) really runs before the dated addition.
    vi.mocked(fetchSpeciesLearnset).mockResolvedValue({
      ...tagged('mr-mime', ['psychic', 'psych-up']),
      hasChampionsMoveData: false,
    });
    const result = await renderLoaded();

    const md = await result.current.getSpeciesLearnset('Mr. Mime', undefined, 'REG-MD');
    expect(md?.moves).toEqual(['psychic', 'psych-up']);

    const mc = await result.current.getSpeciesLearnset('Mr. Mime', undefined, 'REG-MC');
    expect(mc?.moves).toEqual(['psychic']);
  });
});
