import { describe, it, expect } from 'vitest';
import { spToEv, spsToEvs, resolveCalcSpecies, MAX_IVS } from './championsStats';

describe('spToEv', () => {
  it('multiplies Stat Points by 8 so each SP is worth 2 traditional effort points (floor(ev/4))', () => {
    expect(spToEv(32)).toBe(256);
  });

  it('maps 0 SP to 0 EV', () => {
    expect(spToEv(0)).toBe(0);
  });
});

describe('spsToEvs', () => {
  it('converts every stat in the table independently', () => {
    const sps = { hp: 32, atk: 0, def: 4, spa: 20, spd: 6, spe: 4 };
    expect(spsToEvs(sps)).toEqual({ hp: 256, atk: 0, def: 32, spa: 160, spd: 48, spe: 32 });
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
