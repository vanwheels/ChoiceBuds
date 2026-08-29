/**
 * TeamOverflowMenu.tsx - Team-Card Header "More" (⋮) Overflow Menu
 * Header/controls rework leg 2 (see TODO.md): the old row of always-visible
 * icon buttons (Validate/Export/Export Image/Export PDF/Delete) collapses
 * into this single overflow trigger inside TeamCard.tsx's pill-shaped
 * control cluster, freeing that pill down to just Edit + Expand always
 * visible. Self-contained open/close state (useState + useDismissable),
 * matching the existing RegulationBadge.tsx/TeamValidationButton.tsx
 * pattern rather than routing through a hook - this is transient popover UI,
 * not app state. Row icons/copy/order pulled verbatim from the approved
 * design mockup's Overflow.dc.html artboard (same "parse the design
 * artifact's own source" approach leg 1 used for the coverflow keyframes),
 * not eyeballed from the screenshot. Delete is visually distinguished in red
 * per the approved spec.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Team } from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';
import { useDismissable } from '../hooks/useDismissable';
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
  const ref = useDismissable<HTMLDivElement>(() => setIsOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
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

      {isOpen && (
        <div className="absolute z-50 top-full right-0 mt-2 w-56 rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl p-1.5">
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
        </div>
      )}
    </div>
  );
}
