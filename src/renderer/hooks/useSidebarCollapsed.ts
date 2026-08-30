/**
 * useSidebarCollapsed Hook - Persisted Sidebar Collapse State
 * A pure UI-chrome preference, not app data, so it's backed directly by
 * localStorage rather than plumbed through settings.json/the main process -
 * same localStorage-as-persistence pattern useSpeciesRoster.ts already uses
 * for its own not-quite-app-data cache.
 */

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'choicebuds:sidebarCollapsed';

function readInitial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export interface UseSidebarCollapsedReturn {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

export function useSidebarCollapsed(): UseSidebarCollapsedReturn {
  const [collapsed, setCollapsed] = useState<boolean>(readInitial);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage unavailable (e.g. blocked) - collapse state just won't
        // persist across launches, the toggle itself still works this session.
      }
      return next;
    });
  }, []);

  return { collapsed, toggleCollapsed };
}
