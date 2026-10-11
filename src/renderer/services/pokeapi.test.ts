import { describe, expect, it, vi, beforeEach } from 'vitest';
import { normalizeSpeciesForAPI, fetchPokemonData } from './pokeapi';

function mockFetchOnce(json: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(json) }));
}

const INDEEDEE_FEMALE_RESPONSE = {
  id: 10186, // PokeAPI's own per-form resource id - NOT Indeedee's real dex number
  name: 'indeedee-female',
  species: { name: 'indeedee', url: 'https://pokeapi.co/api/v2/pokemon-species/876/' },
  types: [{ slot: 1, type: { name: 'psychic' } }],
  stats: [],
  sprites: { front_default: null },
  abilities: [],
};

// Regression test for the "dex number completely thrown off" report
// (TODO.md's Pokedex Number Wrong For Forms leg): transformAPIResponse's
// pokedexNumber must stay the form resource's own id (utils/spriteUrl.ts's
// getPixelSpriteUrl needs it verbatim to build a non-default form's correct
// sprite URL) - the real National Dex number goes in the separate
// nationalDexNumber field instead, parsed from the species url. An earlier
// version of this fix overwrote pokedexNumber directly and would have
// broken every non-default form's sprite; these two fields are checked
// separately specifically to guard against that regression recurring.
describe('fetchPokemonData', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps pokedexNumber as the form resource's own sprite-id", async () => {
    mockFetchOnce(INDEEDEE_FEMALE_RESPONSE);
    const entry = await fetchPokemonData('Indeedee', 'F');
    expect(entry.pokedexNumber).toBe(10186);
  });

  it('derives nationalDexNumber from the species url', async () => {
    mockFetchOnce(INDEEDEE_FEMALE_RESPONSE);
    const entry = await fetchPokemonData('Indeedee', 'F');
    expect(entry.nationalDexNumber).toBe(876);
  });

  it('leaves nationalDexNumber undefined if the species url is ever missing', async () => {
    mockFetchOnce({ ...INDEEDEE_FEMALE_RESPONSE, species: undefined });
    const entry = await fetchPokemonData('Indeedee', 'F');
    expect(entry.nationalDexNumber).toBeUndefined();
    expect(entry.pokedexNumber).toBe(10186);
  });
});

// Previously untested despite backing every enrichment fetch - written while
// fixing the Toxtricity gap this table was missing (found via VGCPastes
// catalog sprite-matching diagnosis, see docs/investigations/
// vgcpastes-catalog-sprite-matching.md), to lock in the existing
// gender-divergent/no-bare-slug special cases alongside the new one.
describe('normalizeSpeciesForAPI', () => {
  it('passes an ordinary species through as lowercase', () => {
    expect(normalizeSpeciesForAPI('Landorus-Therian')).toBe('landorus-therian');
  });

  it('defaults each gender-divergent species to its male slug with no gender given', () => {
    expect(normalizeSpeciesForAPI('Basculegion')).toBe('basculegion-male');
    expect(normalizeSpeciesForAPI('Indeedee')).toBe('indeedee-male');
    expect(normalizeSpeciesForAPI('Oinkologne')).toBe('oinkologne-male');
    expect(normalizeSpeciesForAPI('Meowstic')).toBe('meowstic-male');
  });

  it('resolves a gender-divergent species to its female slug when gender is F', () => {
    expect(normalizeSpeciesForAPI('Basculegion', 'F')).toBe('basculegion-female');
  });

  it('resolves an explicit "-F"/"-M" suffix regardless of the gender argument', () => {
    expect(normalizeSpeciesForAPI('Indeedee-F')).toBe('indeedee-female');
    expect(normalizeSpeciesForAPI('Indeedee-M', 'F')).toBe('indeedee-male');
  });

  it('maps species with no bare-named PokeAPI resource to their default forme', () => {
    expect(normalizeSpeciesForAPI('Aegislash')).toBe('aegislash-shield');
    expect(normalizeSpeciesForAPI('Palafin')).toBe('palafin-zero');
    expect(normalizeSpeciesForAPI('Gourgeist')).toBe('gourgeist-average');
    expect(normalizeSpeciesForAPI('Lycanroc')).toBe('lycanroc-midday');
    expect(normalizeSpeciesForAPI('Maushold')).toBe('maushold-family-of-four');
    expect(normalizeSpeciesForAPI('Mimikyu')).toBe('mimikyu-disguised');
    expect(normalizeSpeciesForAPI('Morpeko')).toBe('morpeko-full-belly');
    expect(normalizeSpeciesForAPI('Pyroar')).toBe('pyroar-male');
    expect(normalizeSpeciesForAPI('Toxtricity')).toBe('toxtricity-amped');
  });

  it('appends "-breed" to Paldean Tauros forms, matching PokeAPI\'s real slugs', () => {
    expect(normalizeSpeciesForAPI('Tauros-Paldea-Combat')).toBe('tauros-paldea-combat-breed');
    expect(normalizeSpeciesForAPI('Tauros-Paldea-Blaze')).toBe('tauros-paldea-blaze-breed');
    expect(normalizeSpeciesForAPI('Tauros-Paldea-Aqua')).toBe('tauros-paldea-aqua-breed');
  });

  it('strips apostrophes and periods, and turns spaces into hyphens', () => {
    expect(normalizeSpeciesForAPI("Sirfetch'd")).toBe('sirfetchd');
    expect(normalizeSpeciesForAPI('Mr. Mime')).toBe('mr-mime');
  });
});
