/**
 * useTeams Hook - Team CRUD Operations Manager
 * Coordinates all macro CRUD actions for active team configurations data array
 * Handles insertion, updates, deletion via preload bridge, and UI expansion state
 */

import { useState, useCallback, useEffect } from 'react';
import type { Team, TeamsDatabase } from '../types/pokemon';

export interface UseTeamsReturn {
  teams: Team[];
  isLoading: boolean;
  error: string | null;
  expandedCardIds: Set<string>;
  
  // CRUD operations
  addTeam: (team: Team) => Promise<boolean>;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<boolean>;
  deleteTeam: (teamId: string) => Promise<boolean>;
  
  // UI state management
  toggleCardExpansion: (teamId: string) => void;
  expandCard: (teamId: string) => void;
  collapseCard: (teamId: string) => void;
  collapseAllCards: () => void;
  
  // Utility
  refreshTeams: () => Promise<void>;
  getTeamById: (teamId: string) => Team | undefined;
}

/**
 * Custom hook for managing team configurations with persistent storage
 * All state changes flow through this hook - never mixed directly in UI markup
 */
export function useTeams(): UseTeamsReturn {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

  /**
   * Load teams from disk on mount
   */
  useEffect(() => {
    loadTeamsFromDisk();
  }, []);

  /**
   * Internal: Load teams database from disk via preload bridge
   */
  const loadTeamsFromDisk = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const database = await window.electronAPI.readTeamsDatabase();
      
      if (database) {
        setTeams(database.teams);
      } else {
        // Initialize empty database if none exists
        setTeams([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load teams';
      setError(errorMessage);
      console.error('Error loading teams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Internal: Persist current teams state to disk
   */
  const persistTeamsToDisk = async (updatedTeams: Team[]): Promise<boolean> => {
    try {
      const database: TeamsDatabase = {
        version: 1,
        teams: updatedTeams,
        lastModified: Date.now(),
      };
      
      const success = await window.electronAPI.writeTeamsDatabase(database);
      
      if (!success) {
        throw new Error('Failed to write teams database');
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save teams';
      setError(errorMessage);
      console.error('Error persisting teams:', err);
      return false;
    }
  };

  /**
   * Add a newly parsed team block to the database
   */
  const addTeam = useCallback(async (team: Team): Promise<boolean> => {
    const updatedTeams = [...teams, team];
    const success = await persistTeamsToDisk(updatedTeams);
    
    if (success) {
      setTeams(updatedTeams);
      setError(null);
    }
    
    return success;
  }, [teams]);

  /**
   * Update an existing team configuration
   */
  const updateTeam = useCallback(async (
    teamId: string,
    updates: Partial<Team>
  ): Promise<boolean> => {
    const teamIndex = teams.findIndex(t => t.id === teamId);
    
    if (teamIndex === -1) {
      setError(`Team with ID ${teamId} not found`);
      return false;
    }
    
    const updatedTeams = [...teams];
    updatedTeams[teamIndex] = {
      ...updatedTeams[teamIndex],
      ...updates,
      updatedAt: Date.now(),
    };
    
    const success = await persistTeamsToDisk(updatedTeams);
    
    if (success) {
      setTeams(updatedTeams);
      setError(null);
    }
    
    return success;
  }, [teams]);

  /**
   * Delete a targeted team configuration from disk storage
   */
  const deleteTeam = useCallback(async (teamId: string): Promise<boolean> => {
    const updatedTeams = teams.filter(t => t.id !== teamId);
    const success = await persistTeamsToDisk(updatedTeams);
    
    if (success) {
      setTeams(updatedTeams);
      setError(null);
      
      // Clean up expansion state for deleted team
      setExpandedCardIds(prev => {
        const next = new Set(prev);
        next.delete(teamId);
        return next;
      });
    }
    
    return success;
  }, [teams]);

  /**
   * Toggle expansion state for a specific team card
   */
  const toggleCardExpansion = useCallback((teamId: string): void => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }, []);

  /**
   * Expand a specific team card
   */
  const expandCard = useCallback((teamId: string): void => {
    setExpandedCardIds(prev => new Set(prev).add(teamId));
  }, []);

  /**
   * Collapse a specific team card
   */
  const collapseCard = useCallback((teamId: string): void => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      next.delete(teamId);
      return next;
    });
  }, []);

  /**
   * Collapse all team cards
   */
  const collapseAllCards = useCallback((): void => {
    setExpandedCardIds(new Set());
  }, []);

  /**
   * Manually refresh teams from disk
   */
  const refreshTeams = useCallback(async (): Promise<void> => {
    await loadTeamsFromDisk();
  }, []);

  /**
   * Get a specific team by ID
   */
  const getTeamById = useCallback((teamId: string): Team | undefined => {
    return teams.find(t => t.id === teamId);
  }, [teams]);

  return {
    teams,
    isLoading,
    error,
    expandedCardIds,
    addTeam,
    updateTeam,
    deleteTeam,
    toggleCardExpansion,
    expandCard,
    collapseCard,
    collapseAllCards,
    refreshTeams,
    getTeamById,
  };
}
