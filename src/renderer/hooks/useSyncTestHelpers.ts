import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSync } from './useSync';
import type { UseSettingsReturn } from './useSettings';
import type { UseTeamsReturn } from './useTeams';
import type { UseBattlesReturn } from './useBattles';
import type { UseSavedPokemonReturn } from './useSavedPokemon';
import type { AppSettings, SavedPokemonEntry, SyncPayload, Team } from '../types/pokemon';

// Shared fixtures/setup for useSync.test.ts's split files (status/signUp/
// logIn/logOut, syncNow, auto-sync triggers) - kept here rather than
// duplicated so all three stay in sync with useSync's real state shapes.

export const PLAYER_PROFILE = {
  playerName: '',
  ageDivision: '' as const,
  trainerNameInGame: '',
  playerId: '',
  dateOfBirth: '',
  supportId: '',
  switchProfileName: '',
  updatedAt: 0,
};

export const FAVORITE_POKEMON = {
  species: '',
  spriteUrl: '',
  shinySpriteUrl: '',
  shiny: false,
  isPublic: false,
  updatedAt: 0,
};

export function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    schemaVersion: 1,
    defaultRegulation: 'Reg M-A',
    teamsFilter: 'All',
    syncUsername: null,
    syncToken: null,
    lastSyncedAt: null,
    showAnimatedSprites: false,
    boxSortMode: 'alphabetical',
    boxCustomOrderSeeded: false,
    lastSeenReleaseNotesVersion: null,
    playerProfile: PLAYER_PROFILE,
    favoritePokemon: FAVORITE_POKEMON,
    lastModified: Date.now(),
    ...overrides,
  };
}

export function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'Test Team',
    format: 'Reg M-B',
    pokemon: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function makePokemon(species: string): Team['pokemon'][number] {
  return {
    showdownData: {
      species,
      level: 50,
      shiny: false,
      gigantamax: false,
      happiness: 255,
      evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      moves: [],
    },
    pokedexNumber: 0,
    types: [],
    baseStats: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    spriteUrl: '',
    importedAt: 0,
    id: 'mon-1',
  };
}

export function emptyMergedPayload(overrides: Partial<SyncPayload> = {}): SyncPayload {
  return {
    teams: [],
    teamTombstones: [],
    battles: [],
    battleTombstones: [],
    savedPokemon: [],
    savedPokemonTombstones: [],
    savedAt: Date.now(),
    ...overrides,
  };
}

export function setup(settingsOverrides: Partial<AppSettings> = {}) {
  const settings = makeSettings(settingsOverrides);
  const updateSettings = vi.fn().mockResolvedValue(true);
  const settingsState: UseSettingsReturn = {
    settings,
    isLoading: false,
    error: null,
    setDefaultRegulation: vi.fn().mockResolvedValue(true),
    updateSettings,
  };

  const teamsState: UseTeamsReturn = {
    teams: [makeTeam()],
    isLoading: false,
    error: null,
    expandedCardIds: new Set(),
    tombstones: [],
    addTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
    setTeamOrder: vi.fn(),
    toggleCardExpansion: vi.fn(),
    expandCard: vi.fn(),
    collapseCard: vi.fn(),
    collapseAllCards: vi.fn(),
    refreshTeams: vi.fn().mockResolvedValue(undefined),
    getTeamById: vi.fn(),
    // Mirrors the real useTeams.ts::applySyncedState, which unconditionally
    // overwrites `teams` with the server's (always-fresh-reference) result -
    // that reference change is exactly what the skip-next-mutation-sync
    // mechanism under test exists to not mistake for a local edit.
    applySyncedState: vi.fn(async (records: Team[]) => {
      teamsState.teams = records;
      return true;
    }),
  };

  const battlesState: UseBattlesReturn = {
    battles: [],
    isLoading: false,
    error: null,
    tombstones: [],
    addBattle: vi.fn(),
    updateBattle: vi.fn(),
    deleteBattle: vi.fn(),
    refreshBattles: vi.fn().mockResolvedValue(undefined),
    getBattleById: vi.fn(),
    applySyncedState: vi.fn(async (records) => {
      battlesState.battles = records;
      return true;
    }),
  };

  const savedPokemonState: UseSavedPokemonReturn = {
    savedPokemon: [] as SavedPokemonEntry[],
    isLoading: false,
    error: null,
    expandedCardIds: new Set(),
    toggleCardExpansion: vi.fn(),
    addSavedPokemonBatch: vi.fn(),
    renameSavedPokemon: vi.fn(),
    toggleSavedPokemonFavorite: vi.fn(),
    duplicateSavedPokemon: vi.fn(),
    setSavedPokemonOrder: vi.fn(),
    updateSavedPokemon: vi.fn(),
    applyPokedexNumberFixes: vi.fn(),
    deleteSavedPokemon: vi.fn(),
    refreshSavedPokemon: vi.fn().mockResolvedValue(undefined),
    getSavedSetsForSpecies: vi.fn().mockReturnValue([]),
    tombstones: [],
    applySyncedState: vi.fn(async (records) => {
      savedPokemonState.savedPokemon = records;
      return true;
    }),
  };

  const { result, rerender } = renderHook(() =>
    useSync(settingsState, teamsState, battlesState, savedPokemonState),
  );
  return { result, rerender, updateSettings, teamsState, battlesState, savedPokemonState };
}
