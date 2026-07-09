/**
 * useSettings Hook - Persisted User Preferences Manager
 * Mirrors useTeams.ts's load-on-mount / persist-on-write shape for settings.json
 */

import { useState, useCallback, useEffect } from 'react';
import type { AppSettings } from '../types/pokemon';

const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  defaultRegulation: 'Reg M-A',
  lastModified: Date.now(),
};

export interface UseSettingsReturn {
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  setDefaultRegulation: (format: 'Reg M-A' | 'Reg M-B') => Promise<boolean>;
}

/**
 * Custom hook for managing persisted user preferences
 * All state changes flow through this hook - never mixed directly in UI markup
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load settings from disk on mount
   */
  useEffect(() => {
    loadSettingsFromDisk();
  }, []);

  /**
   * Internal: Load settings from disk via preload bridge
   */
  const loadSettingsFromDisk = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const database = await window.electron.readSettings();
      setSettings(database ?? DEFAULT_SETTINGS);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
      console.error('Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Internal: Persist updated settings to disk
   */
  const persistSettingsToDisk = async (updated: AppSettings): Promise<boolean> => {
    try {
      const success = await window.electron.writeSettings(updated);

      if (!success) {
        throw new Error('Failed to write settings');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
      console.error('Error persisting settings:', err);
      return false;
    }
  };

  /**
   * Set the default regulation used when importing new teams
   */
  const setDefaultRegulation = useCallback(async (format: 'Reg M-A' | 'Reg M-B'): Promise<boolean> => {
    const updated: AppSettings = {
      ...settings,
      defaultRegulation: format,
      lastModified: Date.now(),
    };

    const success = await persistSettingsToDisk(updated);

    if (success) {
      setSettings(updated);
      setError(null);
    }

    return success;
  }, [settings]);

  return {
    settings,
    isLoading,
    error,
    setDefaultRegulation,
  };
}
