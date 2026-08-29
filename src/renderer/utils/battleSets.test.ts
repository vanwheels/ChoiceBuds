import { describe, it, expect } from 'vitest';
import { groupBattlesBySet, getSetOutcome } from './battleSets';
import type { Battle } from '../types/pokemon';

function makeBattle(overrides: Partial<Battle>): Battle {
  return {
    id: overrides.id ?? 'b1',
    date: 0,
    teamId: 'team-1',
    teamName: 'Test Team',
    format: 'Reg M-B',
    setId: 'set-1',
    playerRoster: [],
    broughtIds: [],
    playerActiveIds: [null, null],
    playerFaintedIds: [],
    opponentRoster: [],
    opponentActiveIds: [null, null],
    megaEvolvedIds: [],
    statStages: {},
    statusConditions: {},
    statusSetOnTurn: {},
    turns: [],
    fieldState: { playerSide: {}, opponentSide: {} },
    result: 'win',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('groupBattlesBySet', () => {
  it('groups battles sharing a setId into one group', () => {
    const battles = [
      makeBattle({ id: 'g1', setId: 'set-a', date: 1 }),
      makeBattle({ id: 'g2', setId: 'set-a', date: 2 }),
    ];
    const groups = groupBattlesBySet(battles);
    expect(groups).toHaveLength(1);
    expect(groups[0].battles.map(b => b.id)).toEqual(['g1', 'g2']);
  });

  it('sorts each group\'s battles oldest-first regardless of input order', () => {
    const battles = [
      makeBattle({ id: 'g2', setId: 'set-a', date: 2 }),
      makeBattle({ id: 'g1', setId: 'set-a', date: 1 }),
    ];
    const groups = groupBattlesBySet(battles);
    expect(groups[0].battles.map(b => b.id)).toEqual(['g1', 'g2']);
  });

  it('places each group at the position of its first-encountered member, preserving overall ordering', () => {
    const battles = [
      makeBattle({ id: 'x1', setId: 'set-x', date: 1 }),
      makeBattle({ id: 'y1', setId: 'set-y', date: 2 }),
      makeBattle({ id: 'x2', setId: 'set-x', date: 3 }),
    ];
    const groups = groupBattlesBySet(battles);
    expect(groups.map(g => g.setId)).toEqual(['set-x', 'set-y']);
  });

  it('uses Game 1\'s opponentName casing even if a later game differs only by case', () => {
    const battles = [
      makeBattle({ id: 'g1', setId: 'set-a', date: 1, opponentName: 'AshKetchum' }),
      makeBattle({ id: 'g2', setId: 'set-a', date: 2, opponentName: 'ashketchum' }),
    ];
    const groups = groupBattlesBySet(battles);
    expect(groups[0].opponentName).toBe('AshKetchum');
  });

  it('returns one group per battle when every battle has a distinct setId', () => {
    const battles = [
      makeBattle({ id: 'a', setId: 'set-a' }),
      makeBattle({ id: 'b', setId: 'set-b' }),
    ];
    expect(groupBattlesBySet(battles)).toHaveLength(2);
  });

  it('returns an empty array for no battles', () => {
    expect(groupBattlesBySet([])).toEqual([]);
  });
});

describe('getSetOutcome', () => {
  it('is undecided at 0-0', () => {
    expect(getSetOutcome([])).toEqual({ wins: 0, losses: 0, decided: false });
  });

  it('is undecided at 1-0', () => {
    const battles = [makeBattle({ result: 'win' })];
    expect(getSetOutcome(battles).decided).toBe(false);
  });

  it('is undecided at 1-1', () => {
    const battles = [makeBattle({ result: 'win' }), makeBattle({ result: 'loss' })];
    expect(getSetOutcome(battles)).toEqual({ wins: 1, losses: 1, decided: false });
  });

  it('is decided once wins reach 2', () => {
    const battles = [makeBattle({ result: 'win' }), makeBattle({ result: 'win' })];
    expect(getSetOutcome(battles)).toEqual({ wins: 2, losses: 0, decided: true });
  });

  it('is decided once losses reach 2', () => {
    const battles = [
      makeBattle({ result: 'loss' }),
      makeBattle({ result: 'win' }),
      makeBattle({ result: 'loss' }),
    ];
    expect(getSetOutcome(battles)).toEqual({ wins: 1, losses: 2, decided: true });
  });

  it('does not count an in-progress battle toward either wins or losses', () => {
    const battles = [makeBattle({ result: 'win' }), makeBattle({ result: 'in-progress' })];
    expect(getSetOutcome(battles)).toEqual({ wins: 1, losses: 0, decided: false });
  });
});
