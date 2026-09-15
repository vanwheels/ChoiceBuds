/**
 * Test suite for vgcRealSets.ts's species-matching, bundling, and dedupe
 * logic, plus the full extractRealSetsForSpecies pipeline against stubbed
 * fetch responses (same stub-global-fetch convention as vgcPastes.test.ts,
 * since fetchPokepaste() calls fetch() directly).
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  matchesSpecies,
  filterRowsBySpecies,
  toRealSetBundle,
  mergeRealSetBundles,
  extractRealSetsForSpecies,
} from './vgcRealSets';
import type { ShowdownPokemon, VgcPasteTeamRow, VgcRealSetBundle } from '../types/pokemon';

function buildRow(overrides: Partial<VgcPasteTeamRow> = {}): VgcPasteTeamRow {
  return {
    id: 'MC001',
    description: '',
    owner: '',
    tournament: '',
    rank: '',
    date: '',
    pokepasteUrl: 'https://pokepast.es/abc123',
    species: ['Incineroar'],
    linkToSource: '',
    reportVideo: '',
    otherLinks: '',
    ...overrides,
  };
}

const ZERO_EVS = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

function buildPokemon(overrides: Partial<ShowdownPokemon> = {}): ShowdownPokemon {
  return {
    species: 'Incineroar',
    level: 50,
    shiny: false,
    gigantamax: false,
    happiness: 255,
    evs: ZERO_EVS,
    moves: ['Fake Out', 'Knock Off'],
    ...overrides,
  };
}

describe('matchesSpecies', () => {
  it('matches regardless of case', () => {
    expect(matchesSpecies(['incineroar'], 'Incineroar')).toBe(true);
  });

  it('does not strip Mega/regional-form suffixes', () => {
    expect(matchesSpecies(['Salamence-Mega'], 'Salamence')).toBe(false);
    expect(matchesSpecies(['Salamence-Mega'], 'Salamence-Mega')).toBe(true);
  });

  it('strips this app\'s own gender suffix on both sides', () => {
    expect(matchesSpecies(['Indeedee-F'], 'Indeedee')).toBe(true);
  });

  it('returns false when no token matches', () => {
    expect(matchesSpecies(['Rillaboom', 'Gholdengo'], 'Incineroar')).toBe(false);
  });
});

describe('filterRowsBySpecies', () => {
  it('keeps only rows mentioning the target species', () => {
    const rows = [
      buildRow({ id: 'MC001', species: ['Incineroar', 'Rillaboom'] }),
      buildRow({ id: 'MC002', species: ['Gholdengo', 'Sylveon'] }),
      buildRow({ id: 'MC003', species: ['incineroar'] }),
    ];
    expect(filterRowsBySpecies(rows, 'Incineroar').map(r => r.id)).toEqual(['MC001', 'MC003']);
  });
});

describe('toRealSetBundle', () => {
  it('sorts moves alphabetically and carries the other fields through as-is', () => {
    const bundle = toRealSetBundle(buildPokemon({
      item: 'Assault Vest',
      ability: 'Intimidate',
      nature: 'Careful',
      moves: ['Knock Off', 'Fake Out', 'Flare Blitz', 'Parting Shot'],
    }));
    expect(bundle).toEqual<VgcRealSetBundle>({
      item: 'Assault Vest',
      ability: 'Intimidate',
      nature: 'Careful',
      moves: ['Fake Out', 'Flare Blitz', 'Knock Off', 'Parting Shot'],
      evs: ZERO_EVS,
      occurrences: 1,
    });
  });
});

describe('mergeRealSetBundles', () => {
  it('collapses identical bundles into one with a summed occurrence count', () => {
    const bundle: VgcRealSetBundle = {
      item: 'Assault Vest', ability: 'Intimidate', nature: 'Careful',
      moves: ['Fake Out', 'Knock Off'], evs: ZERO_EVS, occurrences: 1,
    };
    const merged = mergeRealSetBundles([bundle, { ...bundle }, { ...bundle }]);
    expect(merged).toEqual([{ ...bundle, occurrences: 3 }]);
  });

  it('treats a move-order difference as the same bundle (moves pre-sorted by toRealSetBundle)', () => {
    const a = toRealSetBundle(buildPokemon({ moves: ['Fake Out', 'Knock Off'] }));
    const b = toRealSetBundle(buildPokemon({ moves: ['Knock Off', 'Fake Out'] }));
    expect(mergeRealSetBundles([a, b])).toEqual([{ ...a, occurrences: 2 }]);
  });

  it('treats item/ability/nature case differences as the same bundle', () => {
    const a = toRealSetBundle(buildPokemon({ item: 'Assault Vest', ability: 'Intimidate', nature: 'Careful' }));
    const b = toRealSetBundle(buildPokemon({ item: 'assault vest', ability: 'intimidate', nature: 'careful' }));
    expect(mergeRealSetBundles([a, b])).toHaveLength(1);
  });

  it('keeps distinct EV spreads as separate bundles', () => {
    const a = toRealSetBundle(buildPokemon({ evs: { ...ZERO_EVS, hp: 252 } }));
    const b = toRealSetBundle(buildPokemon({ evs: { ...ZERO_EVS, speed: 252 } }));
    expect(mergeRealSetBundles([a, b])).toHaveLength(2);
  });

  it('sorts most-occurred bundle first', () => {
    const common = toRealSetBundle(buildPokemon({ item: 'Assault Vest' }));
    const rare = toRealSetBundle(buildPokemon({ item: 'Leftovers' }));
    const merged = mergeRealSetBundles([rare, common, common]);
    expect(merged.map(b => b.item)).toEqual(['Assault Vest', 'Leftovers']);
  });
});

const INCINEROAR_PASTE = `Incineroar @ Assault Vest
Ability: Intimidate
Level: 50
Tera Type: Ghost
EVs: 252 HP / 4 Def / 252 SpD
Careful Nature
- Fake Out
- Knock Off
- Parting Shot
- Flare Blitz`;

const RILLABOOM_ONLY_PASTE = `Rillaboom @ Assault Vest
Ability: Grassy Surge
Level: 50
Tera Type: Grass
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Fake Out
- Wood Hammer
- U-turn
- Grassy Glide`;

describe('extractRealSetsForSpecies', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(byUrl: Record<string, { paste: string }>) {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      const id = url.match(/pokepast\.es\/([a-f0-9]+)\/json/)?.[1];
      const body = id ? byUrl[id] : undefined;
      if (!body) return Promise.resolve({ ok: false, status: 404 });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    }));
  }

  it('fetches only matching rows and dedupes identical sets into one bundle with occurrences: 2', async () => {
    stubFetch({
      abc123: { paste: INCINEROAR_PASTE },
      def456: { paste: INCINEROAR_PASTE },
    });
    const rows = [
      buildRow({ id: 'MC001', pokepasteUrl: 'https://pokepast.es/abc123' }),
      buildRow({ id: 'MC002', pokepasteUrl: 'https://pokepast.es/def456' }),
    ];

    const entry = await extractRealSetsForSpecies('Incineroar', rows);

    expect(entry.species).toBe('incineroar');
    expect(entry.sampledTeamCount).toBe(2);
    expect(entry.bundles).toHaveLength(1);
    expect(entry.bundles[0].occurrences).toBe(2);
    expect(entry.bundles[0].item).toBe('Assault Vest');
  });

  it('skips a row whose paste does not actually contain the target species', async () => {
    stubFetch({ ghi789: { paste: RILLABOOM_ONLY_PASTE } });
    const rows = [buildRow({ id: 'MC003', pokepasteUrl: 'https://pokepast.es/ghi789' })];

    const entry = await extractRealSetsForSpecies('Incineroar', rows);

    expect(entry.sampledTeamCount).toBe(0);
    expect(entry.bundles).toHaveLength(0);
  });

  it('skips a row whose fetch fails without throwing, and still processes the rest', async () => {
    stubFetch({ abc123: { paste: INCINEROAR_PASTE } });
    const rows = [
      buildRow({ id: 'MC004', pokepasteUrl: 'https://pokepast.es/missing' }),
      buildRow({ id: 'MC005', pokepasteUrl: 'https://pokepast.es/abc123' }),
    ];

    const entry = await extractRealSetsForSpecies('Incineroar', rows);

    expect(entry.sampledTeamCount).toBe(1);
    expect(entry.bundles).toHaveLength(1);
  });

  it('skips a row with a malformed pokepaste URL', async () => {
    stubFetch({});
    const rows = [buildRow({ id: 'MC006', pokepasteUrl: 'not-a-url' })];

    const entry = await extractRealSetsForSpecies('Incineroar', rows);

    expect(entry.sampledTeamCount).toBe(0);
    expect(entry.bundles).toHaveLength(0);
  });
});
