import { describe, it, expect } from 'vitest';
import { sortTeams } from './teamSort';
import type { Team } from '../types/pokemon';

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'Test Team',
    format: 'Reg M-B',
    pokemon: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('sortTeams', () => {
  it('moves favorited teams to the top', () => {
    const teams = [
      makeTeam({ id: 'a' }),
      makeTeam({ id: 'b', favorite: true }),
      makeTeam({ id: 'c' }),
    ];

    expect(sortTeams(teams).map(t => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('preserves relative order within the favorited and unfavorited groups', () => {
    const teams = [
      makeTeam({ id: 'a' }),
      makeTeam({ id: 'b', favorite: true }),
      makeTeam({ id: 'c' }),
      makeTeam({ id: 'd', favorite: true }),
    ];

    expect(sortTeams(teams).map(t => t.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('does not mutate the input array', () => {
    const teams = [makeTeam({ id: 'a' }), makeTeam({ id: 'b', favorite: true })];
    const original = [...teams];

    sortTeams(teams);

    expect(teams).toEqual(original);
  });

  it('is a no-op when no teams are favorited and all share a regulation', () => {
    const teams = [makeTeam({ id: 'a' }), makeTeam({ id: 'b' })];

    expect(sortTeams(teams).map(t => t.id)).toEqual(['a', 'b']);
  });

  it('sorts unfavorited teams by regulation, newest first', () => {
    const teams = [
      makeTeam({ id: 'a', format: 'Reg M-A' }),
      makeTeam({ id: 'b', format: 'Reg M-C' }),
      makeTeam({ id: 'c', format: 'Reg M-B' }),
    ];

    expect(sortTeams(teams).map(t => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('preserves drag-order within a regulation group', () => {
    const teams = [
      makeTeam({ id: 'a', format: 'Reg M-C' }),
      makeTeam({ id: 'b', format: 'Reg M-A' }),
      makeTeam({ id: 'c', format: 'Reg M-C' }),
      makeTeam({ id: 'd', format: 'Reg M-A' }),
    ];

    expect(sortTeams(teams).map(t => t.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('puts favorited teams first regardless of regulation, ahead of all unfavorited teams', () => {
    const teams = [
      makeTeam({ id: 'a', format: 'Reg M-C' }),
      makeTeam({ id: 'b', format: 'Reg M-A', favorite: true }),
      makeTeam({ id: 'c', format: 'Reg M-B' }),
    ];

    expect(sortTeams(teams).map(t => t.id)).toEqual(['b', 'a', 'c']);
  });
});
