import { describe, it, expect } from 'vitest';
import { computeMovesetCoverageGaps, type MovesetGapCandidate } from './usageCoverageGaps';
import { USAGE_THREAT_RANK_CUTOFF } from './usageThreats';
import type { DefendingSlot } from './typeCoverage';

function makeCandidate(overrides: Partial<MovesetGapCandidate> = {}): MovesetGapCandidate {
  return {
    species: 'Gengar',
    spriteUrl: 'https://example.com/sprite.png',
    columnPosition: 1,
    topAbility: undefined,
    topMoves: [{ name: 'Shadow Ball', type: 'ghost' }],
    ...overrides,
  };
}

function slot(types: string[], ability?: string): DefendingSlot {
  return { types, ability };
}

describe('computeMovesetCoverageGaps', () => {
  it('excludes a candidate past the usage rank cutoff', () => {
    const overCutoff = makeCandidate({
      topMoves: [{ name: 'Thunderbolt', type: 'electric' }],
      columnPosition: USAGE_THREAT_RANK_CUTOFF + 1,
    });
    expect(computeMovesetCoverageGaps([slot(['water'])], [overCutoff])).toEqual([]);
  });

  it('excludes a candidate with no cached move data at all', () => {
    const noMoves = makeCandidate({ topMoves: [] });
    expect(computeMovesetCoverageGaps([slot(['water'])], [noMoves])).toEqual([]);
  });

  it('excludes a candidate whose move type is resisted by a team slot', () => {
    // Water move resisted by a Water-type slot
    const waterMove = makeCandidate({ topMoves: [{ name: 'Surf', type: 'water' }] });
    expect(computeMovesetCoverageGaps([slot(['water'])], [waterMove])).toEqual([]);
  });

  it('includes a candidate whose move type lands neutral or better on every slot', () => {
    const groundMove = makeCandidate({ topMoves: [{ name: 'Earthquake', type: 'ground' }] });
    expect(computeMovesetCoverageGaps([slot(['water'])], [groundMove])).toEqual([
      { species: 'Gengar', types: ['ground'], columnPosition: 1, spriteUrl: 'https://example.com/sprite.png' },
    ]);
  });

  it('surfaces a gap a raw-species-type check would miss: species typing says immune, but its move type is not resisted', () => {
    // A Ground-type species is immune to a Flying slot on paper, but its top move is Ice - super-effective vs Flying, not resisted at all.
    const iceCoverage = makeCandidate({
      species: 'Ground Mon',
      topMoves: [{ name: 'Ice Beam', type: 'ice' }],
    });
    expect(computeMovesetCoverageGaps([slot(['flying'])], [iceCoverage])).toEqual([
      { species: 'Ground Mon', types: ['ice'], columnPosition: 1, spriteUrl: 'https://example.com/sprite.png' },
    ]);
  });

  it('resolves a move\'s effective type through the threat\'s own top-ranked ability', () => {
    // Pixilate retypes a Normal move to Fairy - Fairy is unresisted by a Steel slot's own typing but this checks the move, not the species.
    const pixilateUser = makeCandidate({
      topAbility: 'Pixilate',
      topMoves: [{ name: 'Hyper Voice', type: 'normal' }],
    });
    expect(computeMovesetCoverageGaps([slot(['normal'])], [pixilateUser])).toEqual([
      { species: 'Gengar', types: ['fairy'], columnPosition: 1, spriteUrl: 'https://example.com/sprite.png' },
    ]);
  });

  it('excludes a candidate whose ability-immunized move is fully no-sold by a team slot', () => {
    // Motor Drive fully no-sells Electric
    const electricMove = makeCandidate({ topMoves: [{ name: 'Thunderbolt', type: 'electric' }] });
    expect(computeMovesetCoverageGaps([slot(['flying'], 'Motor Drive')], [electricMove])).toEqual([]);
  });

  it('dedupes repeated effective types across considered moves', () => {
    const dualGhost = makeCandidate({
      topMoves: [
        { name: 'Shadow Ball', type: 'ghost' },
        { name: 'Shadow Claw', type: 'ghost' },
      ],
    });
    const result = computeMovesetCoverageGaps([slot(['fire'])], [dualGhost]);
    expect(result).toHaveLength(1);
    expect(result[0].types).toEqual(['ghost']);
  });

  it('sorts surviving candidates by columnPosition ascending', () => {
    const third = makeCandidate({ species: 'C', columnPosition: 30 });
    const first = makeCandidate({ species: 'A', columnPosition: 5 });
    const second = makeCandidate({ species: 'B', columnPosition: 15 });
    expect(
      computeMovesetCoverageGaps([slot(['fire'])], [third, first, second]).map(t => t.species)
    ).toEqual(['A', 'B', 'C']);
  });

  it('returns an empty list for empty candidates', () => {
    expect(computeMovesetCoverageGaps([slot(['water'])], [])).toEqual([]);
  });
});
