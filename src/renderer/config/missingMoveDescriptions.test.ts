/**
 * Test suite for the missing-move-description fallback table - specifically
 * that it only overrides PokeAPI's generic placeholder, never a real
 * description PokeAPI (or a Champions override) already supplied.
 */

import { describe, expect, it } from 'vitest';
import {
  applyMissingMoveDescriptionFallback,
  MISSING_MOVE_DESCRIPTIONS,
} from './missingMoveDescriptions';

function makeMove(overrides: Partial<{ name: string; description: string }> = {}) {
  return {
    name: 'tackle',
    description: 'No description available',
    ...overrides,
  };
}

describe('applyMissingMoveDescriptionFallback', () => {
  it('fills in the curated description when PokeAPI gave the generic placeholder', () => {
    const move = makeMove({ name: 'upper-hand' });
    const result = applyMissingMoveDescriptionFallback(move);
    expect(result.description).toBe(MISSING_MOVE_DESCRIPTIONS['upper-hand']);
  });

  it('leaves a real PokeAPI description untouched even for a move in the table', () => {
    const move = makeMove({ name: 'upper-hand', description: 'A real effect from PokeAPI.' });
    const result = applyMissingMoveDescriptionFallback(move);
    expect(result.description).toBe('A real effect from PokeAPI.');
  });

  it('leaves the placeholder untouched for a move not in the table', () => {
    const move = makeMove({ name: 'tackle' });
    const result = applyMissingMoveDescriptionFallback(move);
    expect(result.description).toBe('No description available');
  });

  it('normalizes the move name before checking the table', () => {
    const move = makeMove({ name: 'Upper Hand' });
    const result = applyMissingMoveDescriptionFallback(move);
    expect(result.description).toBe(MISSING_MOVE_DESCRIPTIONS['upper-hand']);
  });

  it('has an entry for every move in the Leg 2 audit gap list', () => {
    const gapList = [
      'alluring-voice',
      'aqua-cutter',
      'aqua-step',
      'armor-cannon',
      'axe-kick',
      'barb-barrage',
      'bitter-blade',
      'bitter-malice',
      'ceaseless-edge',
      'chilling-water',
      'chilly-reception',
      'comeuppance',
      'double-shock',
      'electro-shot',
      'fickle-beam',
      'flower-trick',
      'gigaton-hammer',
      'glaive-rush',
      'hard-press',
      'headlong-rush',
      'ice-spinner',
      'infernal-parade',
      'jet-punch',
      'kowtow-cleave',
      'last-respects',
      'lumina-crash',
      'matcha-gotcha',
      'mortal-spin',
      'mountain-gale',
      'population-bomb',
      'pounce',
      'psychic-noise',
      'psyshield-bash',
      'raging-bull',
      'raging-fury',
      'revival-blessing',
      'shed-tail',
      'shelter',
      'snowscape',
      'spicy-extract',
      'stone-axe',
      'supercell-slam',
      'syrup-bomb',
      'temper-flare',
      'tera-blast',
      'tidy-up',
      'torch-song',
      'trailblaze',
      'triple-arrows',
      'twin-beam',
      'upper-hand',
      'wave-crash',
    ];
    expect(gapList).toHaveLength(52);
    for (const slug of gapList) {
      expect(MISSING_MOVE_DESCRIPTIONS[slug]).toBeTruthy();
    }
  });
});
