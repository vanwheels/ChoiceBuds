import { describe, it, expect } from 'vitest';
import { spToEv, spsToEvs, resolveCalcSpecies, MAX_IVS } from './championsStats';

describe('spToEv', () => {
  it('multiplies Stat Points by 4 to get the equivalent traditional EV', () => {
    expect(spToEv(32)).toBe(128);
  });

  it('maps 0 SP to 0 EV', () => {
    expect(spToEv(0)).toBe(0);
  });
});

describe('spsToEvs', () => {
  it('converts every stat in the table independently', () => {
    const sps = { hp: 32, atk: 0, def: 4, spa: 20, spd: 6, spe: 4 };
    expect(spsToEvs(sps)).toEqual({ hp: 128, atk: 0, def: 16, spa: 80, spd: 24, spe: 16 });
  });
});

describe('MAX_IVS', () => {
  it('maxes every stat at 31, matching the always-Hyper-Trained convention', () => {
    expect(MAX_IVS).toEqual({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 });
  });
});

describe('resolveCalcSpecies', () => {
  it('resolves bare "Aegislash" to its default Shield forme', () => {
    expect(resolveCalcSpecies('Aegislash')).toBe('Aegislash-Shield');
  });

  it('is case-insensitive when detecting bare Aegislash', () => {
    expect(resolveCalcSpecies('aegislash')).toBe('Aegislash-Shield');
  });

  it('leaves an already-formed Aegislash-Blade untouched', () => {
    expect(resolveCalcSpecies('Aegislash-Blade')).toBe('Aegislash-Blade');
  });

  it('leaves an unrelated species untouched', () => {
    expect(resolveCalcSpecies('Gengar')).toBe('Gengar');
  });
});
