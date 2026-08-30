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
 */

import { motion } from 'framer-motion';
import type { ActiveTab } from '../App';
import { SIDEBAR_WIDTH_TRANSITION } from '../config/motion';
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed';
import {
  TeamsIcon,
  CalcIcon,
  BattleLogIcon,
  StatisticsIcon,
  TypeMatchupIcon,
  SettingsIcon,
  SidebarToggleIcon,
} from './icons/SidebarIcons';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const MAIN_NAV_ITEMS: { tab: ActiveTab; label: string; Icon: typeof TeamsIcon }[] = [
  { tab: 'teams', label: 'Teams', Icon: TeamsIcon },
  { tab: 'calc', label: 'Calc', Icon: CalcIcon },
  { tab: 'battles', label: 'Battle Log', Icon: BattleLogIcon },
  { tab: 'statistics', label: 'Statistics', Icon: StatisticsIcon },
  { tab: 'typeMatchup', label: 'Type Matchup', Icon: TypeMatchupIcon },
];

const BOTTOM_NAV_ITEMS: { tab: ActiveTab; label: string; Icon: typeof TeamsIcon }[] = [
  { tab: 'settings', label: 'Settings', Icon: SettingsIcon },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();

  const renderNavItem = ({ tab, label, Icon }: { tab: ActiveTab; label: string; Icon: typeof TeamsIcon }) => {
    const isActive = activeTab === tab;
    return (
      <button
        key={tab}
        onClick={() => onTabChange(tab)}
        aria-label={collapsed ? label : undefined}
        className={`group relative flex items-center rounded-lg font-semibold transition-colors cursor-pointer ${
          collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-[9px] text-[13.5px]'
        } ${
          isActive ? 'text-accent-gold bg-accent-gold/15' : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
        }`}
      >
        {isActive && (
          <span
            className={`absolute top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-[3px] bg-accent-gold ${
              collapsed ? '-left-2.5' : '-left-3'
            }`}
          />
        )}
        <span className="flex shrink-0 text-inherit transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.18]">
          <Icon />
        </span>
        {!collapsed && <span>{label}</span>}
        {collapsed && (
          <span className="pointer-events-none absolute left-full top-1/2 z-10 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-100 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
            {label}
          </span>
        )}
      </button>
    );
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 208 }}
      transition={SIDEBAR_WIDTH_TRANSITION}
      className={`flex flex-col border-r border-zinc-700 bg-zinc-800 py-4 ${
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
        {MAIN_NAV_ITEMS.map(renderNavItem)}
      </nav>

      <div className="mt-auto w-full border-t border-zinc-700 pt-2">
        {BOTTOM_NAV_ITEMS.map(renderNavItem)}
      </div>
    </motion.aside>
  );
}
