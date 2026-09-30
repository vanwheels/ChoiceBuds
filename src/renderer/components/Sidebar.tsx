/**
 * Sidebar.tsx - Primary Navigation Rail
 * Design-approved 2026-08-29 (see TODO.md's sidebar/menuing entry), ported
 * from the `SidebarExpanded.dc.html`/`SidebarCollapsed.dc.html` mockup
 * artboards. Replaces the old flat 128px text-only nav list.
 *
 * Colors are translated from the mockup's literal (pre-palette-rework) gray/
 * blue hex values into this app's actual live tokens rather than copied
 * verbatim - the mockup's own design-approval note explicitly flags its
 * active-nav accent as superseded by the later gold/purple palette pass
 * (kept-blue was only ever provisional), and its sidebar/content
 * gray-800/900/700 values are just this app's already-live zinc-800/900/700
 * under an older name. See the mapping this file actually uses:
 *   - sidebar/content backgrounds, borders  -> zinc-800/900/700 (unchanged
 *     from what App.tsx already had)
 *   - inactive nav-item hover bg            -> zinc-700 (not the mockup's
 *     literal #27272a, which is indistinguishable from this app's zinc-800
 *     sidebar background and would render as no visible hover at all)
 *   - active nav-item text/bg/accent-bar    -> accent-gold, per the
 *     palette-pass supersede note
 *
 * Collapse state lives in useSidebarCollapsed.ts (persisted via
 * localStorage - see that hook's own header comment for why not
 * settings.json). The rail width transition (320ms ease-out, the
 * "deliberate" bucket) now runs through Framer Motion
 * (`SIDEBAR_WIDTH_TRANSITION` in config/motion.ts) rather than the plain CSS
 * `transition-[width]` this leg replaced - animation/motion pass leg 3. Icon
 * hover-scale and hover backgrounds stay plain CSS/Tailwind, per the motion
 * pass's own note that the micro-interaction bucket wasn't worth porting.
 *
 * Mobile Nav Shell: Drawer leg (see TODO.md/its scoping doc): below the `md`
 * breakpoint (768px - phone-sized touch viewports; tablet and up keep the
 * rail) the fixed-width rail above is hidden entirely and replaced with a
 * hamburger trigger + off-canvas drawer, self-contained in this component so
 * neither App.tsx nor AppWeb.tsx need any new wiring. The drawer reuses the
 * same `MAIN_NAV_ITEMS`/`BOTTOM_NAV_ITEMS`/`renderFooter` content as the
 * rail via `renderNavItem`, now parameterized on an explicit
 * collapsed/onClick pair rather than reading the rail's own `collapsed`
 * state, since the drawer always renders in its full (non-collapsed) form
 * regardless of the desktop collapse preference - collapsing a full-screen
 * overlay to icon-only doesn't reclaim anything worth trading the labels
 * for. Tapping a nav item, the backdrop, or the header's close button all
 * close the drawer.
 */

import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { ActiveTab } from '../App';
import {
  SIDEBAR_WIDTH_TRANSITION,
  MODAL_OVERLAY_TRANSITION,
  DRAWER_PANEL_ENTER_TRANSITION,
  DRAWER_PANEL_EXIT_TRANSITION,
} from '../config/motion';
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed';
import {
  TeamsIcon,
  BoxIcon,
  BattleLogIcon,
  StatisticsIcon,
  TypeMatchupIcon,
  SpeedTiersIcon,
  SettingsIcon,
  SidebarToggleIcon,
  MenuIcon,
  CloseIcon,
} from './icons/SidebarIcons';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  /**
   * Extra content pinned below the bottom nav group (Settings), collapse-aware
   * via the passed flag. Unused on desktop (App.tsx passes nothing); AppWeb
   * uses it for the sync-status/sign-in footer that used to live in its own
   * hand-rolled sidebar before this component was adopted there - see
   * AppWeb.tsx's header comment.
   */
  renderFooter?: (collapsed: boolean) => ReactNode;
  /**
   * Extra content pinned to the right end of the mobile top bar, alongside
   * the hamburger trigger (Responsive Layout Audit follow-up, see TODO.md) -
   * both App.tsx and AppWeb.tsx use this for a compact Calc launcher there,
   * since the floating `fixed bottom-6 right-6` button both files also
   * render collides with page content at the bottom of a phone viewport
   * (reported live - the bottom-left area of whatever's on screen gets
   * covered). Unused on desktop/tablet - the rail there has no equivalent
   * top-bar row to pin into, so the floating button stays as the desktop
   * launcher, just hidden below `md` instead of duplicated.
   */
  mobileTopBarEnd?: ReactNode;
}

const MAIN_NAV_ITEMS: { tab: ActiveTab; label: string; Icon: typeof TeamsIcon }[] = [
  { tab: 'teams', label: 'Teams', Icon: TeamsIcon },
  { tab: 'box', label: 'Box', Icon: BoxIcon },
  { tab: 'battles', label: 'Battle Log', Icon: BattleLogIcon },
  { tab: 'statistics', label: 'Statistics', Icon: StatisticsIcon },
  { tab: 'typeMatchup', label: 'Type Matchup', Icon: TypeMatchupIcon },
  { tab: 'speedTiers', label: 'Speed Tiers', Icon: SpeedTiersIcon },
];

const BOTTOM_NAV_ITEMS: { tab: ActiveTab; label: string; Icon: typeof TeamsIcon }[] = [
  { tab: 'settings', label: 'Settings', Icon: SettingsIcon },
];

/**
 * Enter/exit transitions differ (see config/motion.ts), so this has to be a
 * variants object rather than a single `transition` prop read off `drawerOpen` -
 * a conditional `transition` prop is only evaluated on the render where the
 * element is still mounted, so it would apply the enter transition to the
 * exit animation too. Variants let Framer Motion pick the right one per
 * direction (`animate="visible"` vs. `exit="hidden"`), same as Modal.tsx's
 * own panelVariants.
 */
const drawerVariants = {
  hidden: { x: '-100%', transition: DRAWER_PANEL_EXIT_TRANSITION },
  visible: { x: 0, transition: DRAWER_PANEL_ENTER_TRANSITION },
};

export default function Sidebar({ activeTab, onTabChange, renderFooter, mobileTopBarEnd }: SidebarProps) {
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const renderNavItem = (
    { tab, label, Icon }: { tab: ActiveTab; label: string; Icon: typeof TeamsIcon },
    isCollapsed: boolean,
    onClick: () => void,
  ) => {
    const isActive = activeTab === tab;
    return (
      <button
        key={tab}
        onClick={onClick}
        aria-label={isCollapsed ? label : undefined}
        className={`group relative flex items-center rounded-lg font-semibold transition-colors cursor-pointer ${
          isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-[9px] text-[13.5px]'
        } ${
          isActive ? 'text-accent-gold bg-accent-gold/15' : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
        }`}
      >
        {isActive && (
          <span
            className={`absolute top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-[3px] bg-accent-gold ${
              isCollapsed ? '-left-2.5' : '-left-3'
            }`}
          />
        )}
        <span className="flex shrink-0 text-inherit transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.18]">
          <Icon />
        </span>
        {!isCollapsed && <span>{label}</span>}
        {isCollapsed && (
          <span className="pointer-events-none absolute left-full top-1/2 z-10 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-100 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
            {label}
          </span>
        )}
      </button>
    );
  };

  const goToTabFromDrawer = (tab: ActiveTab) => {
    onTabChange(tab);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* Desktop/tablet rail - md (768px) and up. Below that, the drawer below takes over entirely. */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 208 }}
        transition={SIDEBAR_WIDTH_TRANSITION}
        className={`hidden md:flex md:flex-col border-r border-zinc-700 bg-zinc-800 py-4 ${
          collapsed ? 'px-2.5 items-center' : 'px-3'
        }`}
      >
        {/* Brand Header */}
        <div className={`flex items-center border-b border-zinc-700 pb-4 ${collapsed ? 'justify-center w-full' : 'gap-2.5 px-1.5'}`}>
          <div className="h-[30px] w-[30px] shrink-0 overflow-hidden rounded-lg">
            <img src={`${import.meta.env.BASE_URL}mascot.png`} alt="ChoiceBuds" className="h-full w-full object-cover" />
          </div>
          {!collapsed && <h1 className="text-[15px] font-bold text-zinc-100">ChoiceBuds</h1>}
        </div>

        {/* Collapse/Expand Toggle */}
        <div className="mt-3 w-full">
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : undefined}
            className={`flex w-full items-center rounded-lg text-xs font-semibold text-zinc-500 transition-colors cursor-pointer hover:bg-zinc-700 hover:text-zinc-300 ${
              collapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-2'
            }`}
          >
            <SidebarToggleIcon collapsed={collapsed} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-2 flex w-full flex-col gap-[3px]">
          {MAIN_NAV_ITEMS.map(item => renderNavItem(item, collapsed, () => onTabChange(item.tab)))}
        </nav>

        <div className="mt-auto w-full border-t border-zinc-700 pt-2">
          {BOTTOM_NAV_ITEMS.map(item => renderNavItem(item, collapsed, () => onTabChange(item.tab)))}
        </div>

        {renderFooter && (
          <div className="mt-2 w-full border-t border-zinc-700 pt-2">
            {renderFooter(collapsed)}
          </div>
        )}
      </motion.aside>

      {/*
        Mobile top bar - below md only. In-flow (not `fixed`), so it takes a
        real row in the shell's flex layout instead of overlaying whatever
        each page renders at its own top-left corner (App.tsx/AppWeb.tsx's
        outer shell stacks to flex-col below md for exactly this reason -
        see their own header comments). A `fixed` hamburger was the original
        shape here and covered the "My Teams"/"Box" page titles, found live
        2026-09-30 - this replaces it rather than just repositioning it,
        since anything `fixed` in a screen corner will always cover
        whichever page renders content there. Hamburger sits on the left,
        the side the drawer itself slides in from - an earlier version put
        it on the right, flagged by Vanny the same day as disorienting when
        the trigger and its own drawer open on opposite sides. No brand
        here (an earlier version duplicated the drawer's own logo/name
        header) - flagged as redundant once the drawer's open, since both
        headers are visible together; the drawer keeps the brand, this bar
        is just the trigger.
      */}
      <div className="md:hidden flex items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4 py-3">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          className="flex items-center justify-center rounded-lg p-2 text-zinc-300 transition-colors cursor-pointer hover:bg-zinc-700"
        >
          <MenuIcon />
        </button>
        {mobileTopBarEnd}
      </div>

      {/* Mobile off-canvas drawer, portaled so it isn't constrained by any transformed ancestor - same reasoning as Modal.tsx's own portal. */}
      {createPortal(
        <AnimatePresence>
          {drawerOpen && (
            <div key="mobile-drawer" className="md:hidden">
              <motion.div
                key="backdrop"
                className="fixed inset-0 z-50 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={MODAL_OVERLAY_TRANSITION}
                onClick={() => setDrawerOpen(false)}
              />
              <motion.div
                key="panel"
                className="fixed left-0 top-0 z-50 flex h-full w-[240px] flex-col border-r border-zinc-700 bg-zinc-800 px-3 py-4"
                variants={drawerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                {/* Brand Header + Close */}
                <div className="flex items-center justify-between gap-2.5 border-b border-zinc-700 px-1.5 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-[30px] w-[30px] shrink-0 overflow-hidden rounded-lg">
                      <img src={`${import.meta.env.BASE_URL}mascot.png`} alt="ChoiceBuds" className="h-full w-full object-cover" />
                    </div>
                    <h1 className="text-[15px] font-bold text-zinc-100">ChoiceBuds</h1>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close navigation menu"
                    className="flex items-center justify-center rounded-lg p-1.5 text-zinc-400 transition-colors cursor-pointer hover:bg-zinc-700 hover:text-zinc-200"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <nav className="mt-2 flex w-full flex-col gap-[3px]">
                  {MAIN_NAV_ITEMS.map(item => renderNavItem(item, false, () => goToTabFromDrawer(item.tab)))}
                </nav>

                <div className="mt-auto w-full border-t border-zinc-700 pt-2">
                  {BOTTOM_NAV_ITEMS.map(item => renderNavItem(item, false, () => goToTabFromDrawer(item.tab)))}
                </div>

                {renderFooter && (
                  <div className="mt-2 w-full border-t border-zinc-700 pt-2">
                    {renderFooter(false)}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
