import { describe, it, expect } from 'vitest';
import { sortTeamsByFavorite } from './teamSort';
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

describe('sortTeamsByFavorite', () => {
  it('moves favorited teams to the top', () => {
    const teams = [
      makeTeam({ id: 'a' }),
      makeTeam({ id: 'b', favorite: true }),
      makeTeam({ id: 'c' }),
    ];

    expect(sortTeamsByFavorite(teams).map(t => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('preserves relative order within the favorited and unfavorited groups', () => {
    const teams = [
      makeTeam({ id: 'a' }),
      makeTeam({ id: 'b', favorite: true }),
      makeTeam({ id: 'c' }),
      makeTeam({ id: 'd', favorite: true }),
    ];

    expect(sortTeamsByFavorite(teams).map(t => t.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('does not mutate the input array', () => {
    const teams = [makeTeam({ id: 'a' }), makeTeam({ id: 'b', favorite: true })];
    const original = [...teams];

    sortTeamsByFavorite(teams);

    expect(teams).toEqual(original);
  });

  it('is a no-op when no teams are favorited', () => {
    const teams = [makeTeam({ id: 'a' }), makeTeam({ id: 'b' })];

    expect(sortTeamsByFavorite(teams).map(t => t.id)).toEqual(['a', 'b']);
  });
});
