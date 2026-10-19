/**
 * useProfileLayout Hook - Persisted Profile Team-Preview Layout Choice
 * A pure UI-chrome preference (grid of per-Pokemon tiles vs. a denser list),
 * not app data, so it's backed directly by localStorage - same pattern
 * useSidebarCollapsed.ts already uses for its own not-quite-app-data
 * preference. Works unmodified on the standalone, unauthenticated
 * `/u/<username>` route (PublicProfilePage.tsx) too, since it only touches
 * localStorage, never teamsState/syncState.
 */

import { useCallback, useState } from 'react';

export type ProfileLayout = 'grid' | 'list';

const STORAGE_KEY = 'choicebuds:profileLayout';

function readInitial(): ProfileLayout {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

export interface UseProfileLayoutReturn {
  layout: ProfileLayout;
  setLayout: (layout: ProfileLayout) => void;
}

export function useProfileLayout(): UseProfileLayoutReturn {
  const [layout, setLayoutState] = useState<ProfileLayout>(readInitial);

  const setLayout = useCallback((next: ProfileLayout) => {
    setLayoutState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (e.g. blocked) - the toggle still works
      // this session, it just won't persist across launches/reloads.
    }
  }, []);

  return { layout, setLayout };
}
