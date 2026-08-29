import { describe, it, expect } from 'vitest';
import {
  normalizeSlug,
  validateSpeciesLegality,
  validateMoveLegality,
  validateItemLegality,
  getRegulationLabel,
  toRegulationId,
  getRuleset,
  ALL_REGULATION_IDS,
} from './pokemonRules';

describe('normalizeSlug', () => {
  it('lowercases and trims', () => {
    expect(normalizeSlug('  Pikachu  ')).toBe('pikachu');
  });

  it('replaces internal whitespace with hyphens', () => {
    expect(normalizeSlug('Mr Rime')).toBe('mr-rime');
  });

  it('strips apostrophes', () => {
    expect(normalizeSlug("Farfetch'd")).toBe('farfetchd');
  });

  it('strips periods', () => {
    expect(normalizeSlug('Mime Jr.')).toBe('mime-jr');
  });
});

describe('validateSpeciesLegality', () => {
  it('accepts a Reg M-A species under REG-MA', () => {
    expect(validateSpeciesLegality('gengar', 'REG-MA')).toBe(true);
  });

  it('rejects a Reg M-B-only species under REG-MA', () => {
    expect(validateSpeciesLegality('gholdengo', 'REG-MA')).toBe(false);
  });

  it('accepts a Reg M-B-only species under REG-MB (superset of M-A)', () => {
    expect(validateSpeciesLegality('gholdengo', 'REG-MB')).toBe(true);
  });

  it('still accepts a Reg M-A species under REG-MB', () => {
    expect(validateSpeciesLegality('gengar', 'REG-MB')).toBe(true);
  });

  it('rejects a species on neither list (e.g. an unreleased Legendary)', () => {
    expect(validateSpeciesLegality('mewtwo', 'REG-MB')).toBe(false);
  });

  it('is case/whitespace-insensitive via normalizeSlug', () => {
    expect(validateSpeciesLegality('  Gengar  ', 'REG-MA')).toBe(true);
  });

  it('canonicalizes bare "meowstic" to meowstic-male', () => {
    expect(validateSpeciesLegality('meowstic', 'REG-MA')).toBe(true);
  });

  it('canonicalizes "meowstic-f" to meowstic-female', () => {
    expect(validateSpeciesLegality('meowstic-f', 'REG-MA')).toBe(true);
  });

  it('canonicalizes "meowstic-m" to meowstic-male', () => {
    expect(validateSpeciesLegality('meowstic-m', 'REG-MA')).toBe(true);
  });

  it('canonicalizes "basculegion-f" to basculegion-female', () => {
    expect(validateSpeciesLegality('basculegion-f', 'REG-MA')).toBe(true);
  });

  it('accepts the "-breed" spelling of the Paldean Tauros forms', () => {
    expect(validateSpeciesLegality('tauros-paldea-combat-breed', 'REG-MA')).toBe(true);
  });

  it('accepts the non-"-breed" @smogon/calc spelling of the Paldean Tauros forms too', () => {
    expect(validateSpeciesLegality('tauros-paldea-combat', 'REG-MA')).toBe(true);
  });
});

describe('validateMoveLegality', () => {
  it('accepts a well-formed move slug (no ban list in this format)', () => {
    expect(validateMoveLegality('thunderbolt', 'REG-MB')).toBe(true);
  });

  it('accepts a hyphenated move slug', () => {
    expect(validateMoveLegality('sucker-punch', 'REG-MB')).toBe(true);
  });

  it('rejects an empty move name', () => {
    expect(validateMoveLegality('', 'REG-MB')).toBe(false);
  });

  it('rejects a move name with characters outside [a-z0-9-]', () => {
    expect(validateMoveLegality('thunderbolt!', 'REG-MB')).toBe(false);
  });
});

describe('validateItemLegality', () => {
  it('accepts a well-formed item slug', () => {
    expect(validateItemLegality('choice-scarf', 'REG-MB')).toBe(true);
  });

  it('rejects an empty item name', () => {
    expect(validateItemLegality('', 'REG-MB')).toBe(false);
  });

  it('rejects a malformed item name', () => {
    expect(validateItemLegality('choice_scarf!', 'REG-MB')).toBe(false);
  });
});

describe('getRegulationLabel / toRegulationId', () => {
  it('labels REG-MA as "Reg M-A"', () => {
    expect(getRegulationLabel('REG-MA')).toBe('Reg M-A');
  });

  it('labels REG-MB as "Reg M-B"', () => {
    expect(getRegulationLabel('REG-MB')).toBe('Reg M-B');
  });

  it('round-trips Team.format -> RegulationId -> label', () => {
    expect(getRegulationLabel(toRegulationId('Reg M-B'))).toBe('Reg M-B');
  });
});

describe('getRuleset', () => {
  it('REG-MB ruleset is a superset of REG-MA (every M-A species included)', () => {
    const ma = getRuleset('REG-MA');
    const mb = getRuleset('REG-MB');
    expect(ma.allowedSpecies.every(s => mb.allowedSpecies.includes(s))).toBe(true);
  });

  it('ALL_REGULATION_IDS lists both regulations in display order', () => {
    expect(ALL_REGULATION_IDS).toEqual(['REG-MA', 'REG-MB']);
  });
});
