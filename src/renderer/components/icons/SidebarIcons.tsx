/**
 * SidebarIcons.tsx - Nav-Item Icon Set
 * Design-approved 2026-08-29 (see TODO.md's sidebar/menuing entry) - one
 * icon per sidebar tab plus the collapse/expand toggle glyph, ported
 * directly from the approved `SidebarExpanded.dc.html`/`SidebarCollapsed.dc.html`
 * mockup artboards. Icon metaphors (grid/calculator/crossed-swords/bars/
 * shield/gear) are user-confirmed but explicitly **not locked in as
 * permanent** - revisit if a better metaphor comes up. Kept as standalone,
 * reusable components (not colocated in Sidebar.tsx) since the same TODO
 * entry green-lights using them elsewhere in the app (buttons, empty
 * states) for icon-language consistency, not just the sidebar.
 * All accept a `className` for color (via `currentColor`) and sizing.
 */

interface IconProps {
  className?: string;
}

export function TeamsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function CalcIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <rect x="7" y="4.5" width="10" height="4" rx="0.5" />
      <circle cx="8.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="16" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BattleLogIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
      <path d="M4 4l3 1M4 4l1 3" />
      <path d="M20 4l-3 1M20 4l-1 3" />
      <path d="M4 20l3-1M4 20l1-3" />
      <path d="M20 20l-3-1M20 20l-1-3" />
    </svg>
  );
}

export function StatisticsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
    </svg>
  );
}

export function TypeMatchupIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M12 3v15" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  );
}

/**
 * The collapse-rail toggle glyph - a box with a vertical divider and an
 * arrowhead pointing in whichever direction the click will move the rail
 * edge (left/inward when expanded -> collapse, right/outward when
 * collapsed -> expand), matching the two mockup artboards exactly.
 */
export function SidebarToggleIcon({ className, collapsed }: IconProps & { collapsed: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      {collapsed ? <path d="m6 10 1.5 2-1.5 2" /> : <path d="m7 10-1.5 2 1.5 2" />}
    </svg>
  );
}
