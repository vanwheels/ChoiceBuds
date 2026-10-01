/**
 * useCalcButtonCorner Hook - Persisted Calc Launcher Corner
 * Per-device UI chrome preference, not app data, so it's backed directly by
 * localStorage - deliberately not routed through AppSettings/SyncPayload or
 * the services/storage/ adapter, since this must never travel through
 * cross-device sync. Same localStorage-as-persistence pattern
 * useSidebarCollapsed.ts already uses for its own UI-chrome preference.
 */

import { useCallback, useState } from 'react';

export type CalcButtonCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

const STORAGE_KEY = 'choicebuds:calcButtonCorner';
const DEFAULT_CORNER: CalcButtonCorner = 'bottom-right';

function isCalcButtonCorner(value: string | null): value is CalcButtonCorner {
  return (
    value === 'bottom-right' ||
    value === 'bottom-left' ||
    value === 'top-right' ||
    value === 'top-left'
  );
}

function readInitial(): CalcButtonCorner {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isCalcButtonCorner(stored) ? stored : DEFAULT_CORNER;
  } catch {
    return DEFAULT_CORNER;
  }
}

export interface UseCalcButtonCornerReturn {
  corner: CalcButtonCorner;
  setCorner: (corner: CalcButtonCorner) => void;
}

export function useCalcButtonCorner(): UseCalcButtonCornerReturn {
  const [corner, setCornerState] = useState<CalcButtonCorner>(readInitial);

  const setCorner = useCallback((next: CalcButtonCorner) => {
    setCornerState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (e.g. blocked) - corner just won't persist
      // across launches, the move itself still works this session.
    }
  }, []);

  return { corner, setCorner };
}
