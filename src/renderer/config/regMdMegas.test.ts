/**
 * Reg M-D's Megas (docs/investigations/reg-m-d.md section 3): Mega Heatran,
 * and Mega Tatsugiri in three forms off one stone. Tatsugiri's forms are
 * separate legality slugs, so each form must resolve to its own Mega, and
 * Showdown's bare "Tatsugiri" is the Curly form.
 */
import { describe, expect, it } from 'vitest';
import {
  CURATED_MEGA_FORM_SLUGS,
  getMegaApiSlug,
  normalizeMegaSpeciesOnImport,
  resolveOpponentMegaControl,
} from './megaEvolution';
import { getMegaAbility } from './megaAbilities';
import { getSwitchInEffect } from './onSwitchInAbilities';
import { VGC_MEGA_STONES } from './vgcData';

describe('Reg M-D Mega Stones', () => {
  it('resolves Heatranite on Heatran to heatran-mega', () => {
    expect(getMegaApiSlug('Heatranite', 'Heatran')).toBe('heatran-mega');
  });

  it.each([
    ['Tatsugiri', 'tatsugiri-curly-mega'],
    ['tatsugiri-curly', 'tatsugiri-curly-mega'],
    ['Tatsugiri-Droopy', 'tatsugiri-droopy-mega'],
    ['Tatsugiri-Stretchy', 'tatsugiri-stretchy-mega'],
  ])('resolves Tatsugirinite on %s to %s', (species, slug) => {
    expect(getMegaApiSlug('Tatsugirinite', species)).toBe(slug);
  });

  it("doesn't resolve either stone on the other species", () => {
    expect(getMegaApiSlug('Tatsugirinite', 'Heatran')).toBeNull();
    expect(getMegaApiSlug('Heatranite', 'Tatsugiri-Droopy')).toBeNull();
  });

  it('lists all four Megas for the Calc tab and the sprite prefetch', () => {
    for (const slug of [
      'heatran-mega',
      'tatsugiri-curly-mega',
      'tatsugiri-droopy-mega',
      'tatsugiri-stretchy-mega',
    ]) {
      expect(CURATED_MEGA_FORM_SLUGS.has(slug), slug).toBe(true);
    }
  });

  it('offers both stones as VGC items', () => {
    expect(VGC_MEGA_STONES).toContain('Heatranite');
    expect(VGC_MEGA_STONES).toContain('Tatsugirinite');
  });

  it('gives each Tatsugiri form a single Mega in the Battle Logger', () => {
    expect(resolveOpponentMegaControl('Tatsugiri', undefined)).toEqual({
      kind: 'single',
      slug: 'tatsugiri-curly-mega',
      revealItem: 'tatsugirinite',
    });
    expect(resolveOpponentMegaControl('Tatsugiri-Stretchy', 'Tatsugirinite')).toEqual({
      kind: 'single',
      slug: 'tatsugiri-stretchy-mega',
      revealItem: null,
    });
  });

  it('strips a -Mega species suffix on import when the matching stone is held', () => {
    expect(normalizeMegaSpeciesOnImport('Heatran-Mega', 'Heatranite')).toBe('Heatran');
    expect(normalizeMegaSpeciesOnImport('Tatsugiri-Droopy-Mega', 'Tatsugirinite')).toBe(
      'Tatsugiri-Droopy',
    );
  });
});

describe('Reg M-D Mega abilities', () => {
  it('gives Mega Heatran Water Compaction', () => {
    expect(getMegaAbility('heatran-mega')).toBe('Water Compaction');
  });

  it.each(['tatsugiri-curly-mega', 'tatsugiri-droopy-mega', 'tatsugiri-stretchy-mega'])(
    'gives %s Premium Grade',
    (slug) => {
      expect(getMegaAbility(slug)).toBe('Premium Grade');
    },
  );

  it('raises Sp. Atk by one stage on switch-in for Premium Grade', () => {
    expect(getSwitchInEffect('Premium Grade')).toEqual({
      kind: 'stat',
      stat: 'spa',
      stages: 1,
      target: 'self',
    });
  });
});
