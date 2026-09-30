/**
 * useMobileHeaderActions.tsx - Page-Aware Mobile Top-Bar Registration
 * Mobile Compact Top Bar: Teams & Box Leg 1 (see TODO.md's scoping doc,
 * docs/investigations/mobile-teams-box-card-view-scope.md). Sidebar.tsx's
 * mobile top bar previously only knew about one static end-of-bar node (the
 * Calc launcher, wired once at the App.tsx/AppWeb.tsx shell level) - this
 * gives whichever tab is actually active a way to publish its own title +
 * action buttons into that same bar instead.
 *
 * Every visited tab stays mounted (App.tsx/AppWeb.tsx's display:none
 * pattern, see their own header comments), so this registers per-tab rather
 * than one shared slot a later-mounting page could clobber - Sidebar.tsx
 * reads back only the currently active tab's entry via
 * useActiveMobileHeaderEntry, called with the `activeTab` prop it already
 * has.
 *
 * Two separate contexts, not one bundling both pieces - confirmed live via
 * run-desktop as a real infinite-loop bug, not just a theoretical one: a
 * single context whose value includes both the ever-changing `registry` and
 * the `register` setter makes every producer (TeamsPage/BoxPage, which only
 * need `register`) re-render whenever ANY tab's registry entry changes,
 * since useContext re-renders a consumer on any value-identity change
 * regardless of which field it destructures. That re-render reconstructs the
 * producer's `actions` JSX as a new object, re-firing its registration
 * effect (whose deps include that object), calling `register` again, and
 * looping ("Maximum update depth exceeded" in the console, reproduced
 * mounting BoxPage below `md`). Splitting the stable setter into its own
 * context means its value (from `useCallback` with an empty dep array) never
 * changes identity across Provider re-renders, so producers never
 * re-render just because the registry changed elsewhere - only
 * RegistryContext's consumer (Sidebar) does.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ActiveTab } from '../App';

interface MobileHeaderEntry {
  title: string;
  actions?: ReactNode;
}

type MobileHeaderRegistry = Partial<Record<ActiveTab, MobileHeaderEntry>>;
type RegisterFn = (tab: ActiveTab, entry: MobileHeaderEntry) => void;

// Safe no-op/empty defaults (rather than throwing) so Sidebar/pages never
// need a provider wrapper just to render in isolation - e.g. a future
// component test that mounts Sidebar directly gets an empty bar, not a crash.
const RegisterContext = createContext<RegisterFn>(() => {});
const RegistryContext = createContext<MobileHeaderRegistry>({});

export function MobileHeaderActionsProvider({ children }: { children: ReactNode }) {
  const [registry, setRegistry] = useState<MobileHeaderRegistry>({});
  const register = useCallback<RegisterFn>((tab, entry) => {
    setRegistry(prev => ({ ...prev, [tab]: entry }));
  }, []);
  return (
    <RegisterContext.Provider value={register}>
      <RegistryContext.Provider value={registry}>
        {children}
      </RegistryContext.Provider>
    </RegisterContext.Provider>
  );
}

/** Called by a page (TeamsPage/BoxPage) to publish its own mobile top-bar title/actions. */
export function useMobileHeaderActions(tab: ActiveTab, title: string, actions?: ReactNode) {
  const register = useContext(RegisterContext);
  useEffect(() => {
    register(tab, { title, actions });
  }, [register, tab, title, actions]);
}

/** Called once by Sidebar.tsx to read back whichever tab is currently active. */
export function useActiveMobileHeaderEntry(activeTab: ActiveTab): MobileHeaderEntry | undefined {
  const registry = useContext(RegistryContext);
  return registry[activeTab];
}
