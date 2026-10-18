/**
 * useProfileNav.ts - In-App Profile Navigation Stack
 * A back-stack of usernames layered on top of the existing `ActiveTab`
 * navigation (In-App Profile Page & Navigation Shell, see TODO.md) - opening
 * a profile pushes a username rather than changing `activeTab`, so the
 * underlying tab stays exactly as it was and "back" just pops the stack
 * instead of needing to remember which tab to return to. A real stack (not a
 * single optional field) because the profile page's own username lookup can
 * open a second profile without leaving the first - back from there returns
 * to the previous profile, not straight to the tab.
 *
 * `closeProfile` resets the whole stack at once (not just one `goBack` pop)
 * - the Sidebar's `onTabChange` calls it before switching tabs, since
 * picking a different tab while a profile is open should always land on
 * that tab, not leave the (now-hidden) profile view stuck on screen
 * regardless of how deep the stack was (confirmed live, leg review).
 */

import { useState } from 'react';

export interface UseProfileNavReturn {
  /** Username currently shown, or null when no profile view is open (top of the stack). */
  viewingUsername: string | null;
  openProfile: (username: string) => void;
  goBack: () => void;
  closeProfile: () => void;
}

export function useProfileNav(): UseProfileNavReturn {
  const [stack, setStack] = useState<string[]>([]);

  const openProfile = (username: string) => {
    const trimmed = username.trim();
    if (!trimmed) return;
    setStack((prev) => [...prev, trimmed]);
  };

  const goBack = () => {
    setStack((prev) => prev.slice(0, -1));
  };

  const closeProfile = () => {
    setStack([]);
  };

  return {
    viewingUsername: stack.length > 0 ? stack[stack.length - 1] : null,
    openProfile,
    goBack,
    closeProfile,
  };
}
