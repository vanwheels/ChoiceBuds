import { describe, it, expect } from 'vitest';
import {
  getOverallRecord, getRecordByFormat, getRecordBySeason, getSeasonsWithBattles,
  getRecordByTeam, getSetRecord, getRecentForm,
  getMostUsedPokemon, getMostFacedOpponents, getTeamRosterUsage,
} from './battleStats';
import type { Battle, BroughtPokemonSnapshot, OpponentPokemonEntry } from '../types/pokemon';
import { SEASONS } from '../config/seasons';

function makeBattle(overrides: Partial<Battle> = {}): Battle {
  return {
    id: 'b1',
    date: SEASONS[0].start + 1000,
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

function makeBrought(overrides: Partial<BroughtPokemonSnapshot> = {}): BroughtPokemonSnapshot {
  return {
    id: 'p1', species: 'Gengar', moves: [], pokedexNumber: 94, types: ['ghost', 'poison'],
    spriteUrl: 'https://example.com/gengar.png', ...overrides,
  };
}

function makeOpponent(overrides: Partial<OpponentPokemonEntry> = {}): OpponentPokemonEntry {
  return {
    id: 'o1', species: 'Incineroar', pokedexNumber: 727, spriteUrl: 'https://example.com/incineroar.png',
    types: ['fire', 'dark'], moves: [], fainted: false, addedAt: 0, ...overrides,
  };
}

describe('getOverallRecord', () => {
  it('counts wins/losses and computes winRate, excluding in-progress battles', () => {
    const battles = [
      makeBattle({ result: 'win' }),
      makeBattle({ result: 'win' }),
      makeBattle({ result: 'loss' }),
      makeBattle({ result: 'in-progress' }),
    ];
    expect(getOverallRecord(battles)).toEqual({ wins: 2, losses: 1, total: 3, winRate: 2 / 3 });
  });

  it('reports 0 winRate with no completed battles', () => {
    expect(getOverallRecord([])).toEqual({ wins: 0, losses: 0, total: 0, winRate: 0 });
  });
});

describe('getRecordByFormat', () => {
  it('groups by format and sorts by total descending', () => {
    const battles = [
      makeBattle({ format: 'Reg M-A', result: 'win' }),
      makeBattle({ format: 'Reg M-B', result: 'win' }),
      makeBattle({ format: 'Reg M-B', result: 'loss' }),
    ];
    const result = getRecordByFormat(battles);
    expect(result[0]).toEqual({ label: 'Reg M-B', wins: 1, losses: 1, total: 2, winRate: 0.5 });
    expect(result[1]).toEqual({ label: 'Reg M-A', wins: 1, losses: 0, total: 1, winRate: 1 });
  });
});

describe('getRecordBySeason', () => {
  it('buckets a battle by its date into the matching season', () => {
    const battles = [makeBattle({ date: SEASONS[0].start + 1, result: 'win' })];
    const result = getRecordBySeason(battles);
    expect(result).toEqual([{ label: SEASONS[0].label, wins: 1, losses: 0, total: 1, winRate: 1 }]);
  });

  it('skips a battle whose date falls outside every known season', () => {
    const battles = [makeBattle({ date: -1, result: 'win' })];
    expect(getRecordBySeason(battles)).toEqual([]);
  });

  it('orders results chronologically by season, not by total', () => {
    const battles = [
      makeBattle({ date: SEASONS[1].start + 1, result: 'win' }),
      makeBattle({ date: SEASONS[0].start + 1, result: 'win' }),
    ];
    const result = getRecordBySeason(battles);
    expect(result.map(r => r.label)).toEqual([SEASONS[0].label, SEASONS[1].label]);
  });
});

describe('getSeasonsWithBattles', () => {
  it('includes only seasons that have at least one battle, including in-progress ones', () => {
    const battles = [makeBattle({ date: SEASONS[0].start + 1, result: 'in-progress' })];
    const result = getSeasonsWithBattles(battles);
    expect(result.map(s => s.id)).toEqual([SEASONS[0].id]);
  });

  it('returns no seasons for an empty battle list', () => {
    expect(getSeasonsWithBattles([])).toEqual([]);
  });
});

describe('getRecordByTeam', () => {
  it('groups by teamId and labels using teamName, sorted by total descending', () => {
    const battles = [
      makeBattle({ teamId: 't1', teamName: 'Alpha', result: 'win' }),
      makeBattle({ teamId: 't2', teamName: 'Beta', result: 'win' }),
      makeBattle({ teamId: 't2', teamName: 'Beta', result: 'win' }),
    ];
    const result = getRecordByTeam(battles);
    expect(result[0]).toEqual({ label: 'Beta', wins: 2, losses: 0, total: 2, winRate: 1 });
    expect(result[1]).toEqual({ label: 'Alpha', wins: 1, losses: 0, total: 1, winRate: 1 });
  });
});

describe('getSetRecord', () => {
  it('counts a decided set (2 wins) as one set win', () => {
    const battles = [
      makeBattle({ setId: 's1', result: 'win' }),
      makeBattle({ setId: 's1', result: 'win' }),
    ];
    expect(getSetRecord(battles)).toEqual({ wins: 1, losses: 0, total: 1, winRate: 1 });
  });

  it('does not count an undecided (1-1) set toward either side', () => {
    const battles = [
      makeBattle({ setId: 's1', result: 'win' }),
      makeBattle({ setId: 's1', result: 'loss' }),
    ];
    expect(getSetRecord(battles)).toEqual({ wins: 0, losses: 0, total: 0, winRate: 0 });
  });
});

describe('getRecentForm', () => {
  it('returns completed battles oldest-first, capped to the limit, keeping the most recent ones', () => {
    const battles = [
      makeBattle({ id: 'a', date: 1, result: 'win' }),
      makeBattle({ id: 'b', date: 2, result: 'loss' }),
      makeBattle({ id: 'c', date: 3, result: 'win' }),
    ];
    expect(getRecentForm(battles, 2)).toEqual([
      { id: 'b', result: 'loss' },
      { id: 'c', result: 'win' },
    ]);
  });

  it('excludes in-progress battles', () => {
    const battles = [makeBattle({ id: 'a', date: 1, result: 'in-progress' })];
    expect(getRecentForm(battles)).toEqual([]);
  });
});

describe('getMostUsedPokemon', () => {
  it('counts a species once per battle it was brought to, and computes its win rate', () => {
    const gengar = makeBrought({ id: 'p1', species: 'Gengar' });
    const battles = [
      makeBattle({ playerRoster: [gengar], broughtIds: ['p1'], result: 'win' }),
      makeBattle({ playerRoster: [gengar], broughtIds: ['p1'], result: 'loss' }),
    ];
    const result = getMostUsedPokemon(battles);
    expect(result).toEqual([{ species: 'Gengar', spriteUrl: gengar.spriteUrl, count: 2, winRate: 0.5 }]);
  });

  it('does not count a roster member that was not actually brought', () => {
    const gengar = makeBrought({ id: 'p1', species: 'Gengar' });
    const battles = [makeBattle({ playerRoster: [gengar], broughtIds: [], result: 'win' })];
    expect(getMostUsedPokemon(battles)).toEqual([]);
  });

  it('sorts by count descending and respects topN', () => {
    const a = makeBrought({ id: 'a', species: 'A' });
    const b = makeBrought({ id: 'b', species: 'B' });
    const battles = [
      makeBattle({ playerRoster: [a, b], broughtIds: ['a', 'b'], result: 'win' }),
      makeBattle({ playerRoster: [a], broughtIds: ['a'], result: 'win' }),
    ];
    const result = getMostUsedPokemon(battles, 1);
    expect(result).toEqual([{ species: 'A', spriteUrl: a.spriteUrl, count: 2, winRate: 1 }]);
  });
});

describe('getTeamRosterUsage', () => {
  it('tracks a never-brought roster member as a 0-rate row instead of omitting it', () => {
    const gengar = makeBrought({ id: 'p1', species: 'Gengar' });
    const incin = makeBrought({ id: 'p2', species: 'Incineroar' });
    const battles = [
      makeBattle({ teamId: 't1', teamName: 'Alpha', playerRoster: [gengar, incin], broughtIds: ['p1'], result: 'win' }),
    ];
    const result = getTeamRosterUsage(battles);
    expect(result).toEqual([{
      teamId: 't1',
      teamName: 'Alpha',
      totalTeamBattles: 1,
      pokemon: [
        { species: 'Gengar', spriteUrl: gengar.spriteUrl, broughtCount: 1, battleCount: 1, rate: 1 },
        { species: 'Incineroar', spriteUrl: incin.spriteUrl, broughtCount: 0, battleCount: 1, rate: 0 },
      ],
    }]);
  });

  it('pins a swapped-out species\' rate to its own battleCount instead of the team-wide total drifting it downward', () => {
    const salamence = makeBrought({ id: 'p1', species: 'Salamence' });
    const hydreigon = makeBrought({ id: 'p2', species: 'Hydreigon' });
    const rillaboom = makeBrought({ id: 'p3', species: 'Rillaboom' });
    const battles = [
      // Battles 1-12: Salamence on the roster and always brought, Rillaboom always brought too.
      ...Array.from({ length: 12 }, () => makeBattle({
        teamId: 't1', teamName: 'Alpha',
        playerRoster: [salamence, rillaboom], broughtIds: ['p1', 'p3'], result: 'win',
      })),
      // Battle 13+: Salamence swapped out for Hydreigon, which is brought once, Rillaboom still always brought.
      makeBattle({
        teamId: 't1', teamName: 'Alpha',
        playerRoster: [hydreigon, rillaboom], broughtIds: ['p2', 'p3'], result: 'win',
      }),
    ];
    const result = getTeamRosterUsage(battles);
    expect(result[0].totalTeamBattles).toBe(13);
    const bySpecies = Object.fromEntries(result[0].pokemon.map(p => [p.species, p]));
    expect(bySpecies['Salamence']).toEqual({ species: 'Salamence', spriteUrl: salamence.spriteUrl, broughtCount: 12, battleCount: 12, rate: 1 });
    expect(bySpecies['Hydreigon']).toEqual({ species: 'Hydreigon', spriteUrl: hydreigon.spriteUrl, broughtCount: 1, battleCount: 1, rate: 1 });
    expect(bySpecies['Rillaboom']).toEqual({ species: 'Rillaboom', spriteUrl: rillaboom.spriteUrl, broughtCount: 13, battleCount: 13, rate: 1 });
  });

  it('keeps teams and their species sorted independently: teams by battle count desc, species within a team by rate desc', () => {
    const gengar = makeBrought({ id: 'p1', species: 'Gengar' });
    const incin = makeBrought({ id: 'p2', species: 'Incineroar' });
    const battles = [
      // t1: 1 battle total
      makeBattle({ teamId: 't1', teamName: 'Alpha', playerRoster: [gengar], broughtIds: ['p1'], result: 'win' }),
      // t2: 2 battles total - Incineroar brought once (50%), Gengar never brought (0%)
      makeBattle({ teamId: 't2', teamName: 'Beta', playerRoster: [gengar, incin], broughtIds: ['p2'], result: 'win' }),
      makeBattle({ teamId: 't2', teamName: 'Beta', playerRoster: [gengar, incin], broughtIds: [], result: 'loss' }),
    ];
    const result = getTeamRosterUsage(battles);
    expect(result.map(t => t.teamId)).toEqual(['t2', 't1']);
    expect(result[0].pokemon.map(p => p.species)).toEqual(['Incineroar', 'Gengar']);
  });

  it('excludes in-progress battles from both the roster snapshot and the denominator', () => {
    const gengar = makeBrought({ id: 'p1', species: 'Gengar' });
    const battles = [makeBattle({ teamId: 't1', playerRoster: [gengar], broughtIds: ['p1'], result: 'in-progress' })];
    expect(getTeamRosterUsage(battles)).toEqual([]);
  });
});

describe('getMostFacedOpponents', () => {
  it('counts opponent species across all battles, including in-progress ones', () => {
    const incin = makeOpponent({ species: 'Incineroar' });
    const battles = [
      makeBattle({ opponentRoster: [incin], result: 'win' }),
      makeBattle({ opponentRoster: [incin], result: 'in-progress' }),
    ];
    expect(getMostFacedOpponents(battles)).toEqual([
      { species: 'Incineroar', spriteUrl: incin.spriteUrl, count: 2, wins: 1, losses: 0 },
    ]);
  });

  it('sorts by count descending and respects topN', () => {
    const a = makeOpponent({ species: 'A' });
    const b = makeOpponent({ species: 'B' });
    const battles = [
      makeBattle({ opponentRoster: [a, b] }),
      makeBattle({ opponentRoster: [a] }),
    ];
    const result = getMostFacedOpponents(battles, 1);
    expect(result).toEqual([{ species: 'A', spriteUrl: a.spriteUrl, count: 2, wins: 2, losses: 0 }]);
  });

  it('tallies wins and losses only from completed battles, separately from the all-battle count', () => {
    const incin = makeOpponent({ species: 'Incineroar' });
    const battles = [
      makeBattle({ opponentRoster: [incin], result: 'win' }),
      makeBattle({ opponentRoster: [incin], result: 'loss' }),
      makeBattle({ opponentRoster: [incin], result: 'loss' }),
      makeBattle({ opponentRoster: [incin], result: 'in-progress' }),
    ];
    expect(getMostFacedOpponents(battles)).toEqual([
      { species: 'Incineroar', spriteUrl: incin.spriteUrl, count: 4, wins: 1, losses: 2 },
    ]);
  });
});
