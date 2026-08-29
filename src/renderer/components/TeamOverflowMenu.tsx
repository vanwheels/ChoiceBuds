/**
 * TeamOverflowMenu.tsx - Team-Card Header "More" (⋮) Overflow Menu
 * Header/controls rework leg 2 (see TODO.md): the old row of always-visible
 * icon buttons (Validate/Export/Export Image/Export PDF/Delete) collapses
 * into this single overflow trigger inside TeamCard.tsx's pill-shaped
 * control cluster, freeing that pill down to just Edit + Expand always
 * visible. Row icons/copy/order pulled verbatim from the approved design
 * mockup's Overflow.dc.html artboard (same "parse the design artifact's own
 * source" approach leg 1 used for the coverflow keyframes), not eyeballed
 * from the screenshot. Delete is visually distinguished in red per the
 * approved spec.
 *
 * Portaled to document.body (fixed-positioned off the trigger's own
 * getBoundingClientRect(), not a plain `absolute` child) - found +
 * fixed 2026-08-29 as a follow-up to the same day's scrollbar-shrink report:
 * TeamsPage.tsx's teams-list container is `overflow-y-auto`, and per the CSS
 * spec an element with only one overflow axis set to something other than
 * 'visible' has its other axis silently forced to 'auto' too - so that
 * container was clipping this menu horizontally/vertically for any team
 * whose card sits near its bottom edge (confirmed live: a lower team's open
 * menu was visibly cut off mid-list), on top of the scrollHeight-inflation
 * problem the same-day scrollbarGutter fixes addressed. A portal sidesteps
 * both at once - not a descendant of that scrolling box in the DOM anymore,
 * so it can't be clipped by it or count toward its scrollHeight. Since a
 * portaled node isn't a DOM descendant of the trigger's own wrapper either,
 * `useDismissable` (single-ref `contains()` check) can't tell "inside the
 * menu" from "outside" any more - outside-click/Escape handling is
 * reimplemented inline here with two refs (trigger + portaled menu) instead.
 * Also dismisses on scroll/resize rather than trying to keep the menu's
 * position live-tracking the trigger while open - simpler, and a stale-
 * positioned open menu would be more confusing than one that just closes.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import type { Team } from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';
import TeamValidationButton from './TeamValidationButton';

interface TeamOverflowMenuProps {
  team: Team;
  rulesetId: RegulationId;
  onExport: () => void;
  onExportImage: () => void;
  onExportPdf: () => void;
  onDelete?: () => void;
}

interface MenuRowProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

function MenuRow({ icon, label, onClick, danger }: MenuRowProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors cursor-pointer ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-zinc-300 hover:bg-zinc-800'
      }`}
    >
      <span className={`shrink-0 flex ${danger ? 'text-red-400' : 'text-zinc-500'}`}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function TeamOverflowMenu({ team, rulesetId, onExport, onExportImage, onExportPdf, onDelete }: TeamOverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Computed fresh every time the menu opens, off the trigger's real screen
  // position - runs before paint (useLayoutEffect) so the menu never flashes
  // at the wrong spot.
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleScrollOrResize = () => setIsOpen(false);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    // capture: true so this also catches scroll events firing on a nested
    // scrolling container (e.g. TeamsPage.tsx's teams-list div), not just
    // window/document itself scrolling - scroll doesn't bubble, but a
    // capturing listener still sees it on the way down.
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        title="More"
        className={`w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer ${
          isOpen ? 'bg-zinc-700 text-zinc-200' : ''
        }`}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
          <circle cx="12" cy="5" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="19" r="1.6" fill="currentColor" />
        </svg>
      </button>

      {isOpen && menuPos && createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 w-56 rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl p-1.5"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <TeamValidationButton team={team} rulesetId={rulesetId} />

          <MenuRow
            onClick={() => { onExport(); setIsOpen(false); }}
            label="Export (Showdown text)"
            icon={
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
            }
          />

          <MenuRow
            onClick={() => { onExportImage(); setIsOpen(false); }}
            label="Export Image"
            icon={
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="9" cy="10" r="1.6" fill="currentColor" stroke="none" />
                <path d="m5 18 5-5 4 4 3-3 3 3" />
              </svg>
            }
          />

          <MenuRow
            onClick={() => { onExportPdf(); setIsOpen(false); }}
            label="Export PDF"
            icon={
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3h6l4 4v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
                <path d="M14 3v4h4" />
                <path d="M9 13h6M9 17h6" />
              </svg>
            }
          />

          {onDelete && (
            <>
              <div className="h-px bg-zinc-800 my-1 mx-1" />
              <MenuRow
                onClick={() => { onDelete(); setIsOpen(false); }}
                label="Delete Team"
                danger
                icon={
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16" />
                    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                }
              />
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
