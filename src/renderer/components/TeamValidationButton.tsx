/**
 * TeamValidationButton.tsx - "Validate Team" Overflow-Menu Row + Result Popup
 * Computes validateTeam() on click and shows a brief popup listing pass/fail
 * and any issues found, anchored under the row. Auto-dismisses after a few
 * seconds, or immediately via Escape/click-outside (useDismissable). Lives
 * exclusively inside TeamOverflowMenu.tsx's dropdown (header/controls rework,
 * see TODO.md) as one of its menu rows, styled to match the other rows there
 * rather than the standalone round icon button it used to be - still
 * self-contained so TeamOverflowMenu just renders this rather than owning
 * the popup state itself.
 */

import { useEffect, useState } from 'react';
import type { Team } from '../types/pokemon';
import { validateTeam } from '../utils/teamValidation';
import { getRegulationLabel, type RegulationId } from '../utils/pokemonRules';
import { useDismissable } from '../hooks/useDismissable';

const AUTO_DISMISS_MS = 6000;

interface TeamValidationButtonProps {
  team: Team;
  rulesetId: RegulationId;
}

export default function TeamValidationButton({ team, rulesetId }: TeamValidationButtonProps) {
  const [result, setResult] = useState<{ valid: boolean; issues: string[] } | null>(null);
  const ref = useDismissable<HTMLDivElement>(() => setResult(null));

  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => setResult(null), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [result]);

  const handleValidate = () => {
    setResult(validateTeam(team, rulesetId));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleValidate}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 shrink-0">
          <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span>Validate Team</span>
      </button>
      {result && (
        <div className="absolute z-50 top-full right-0 mt-1 w-72 rounded-lg border-2 bg-slate-900 shadow-xl p-3"
          style={{ borderColor: result.valid ? '#10b981' : '#ef4444' }}
        >
          {result.valid ? (
            <p className="text-sm font-bold text-emerald-400">✓ Team is legal for {getRegulationLabel(rulesetId)}</p>
          ) : (
            <>
              <p className="text-sm font-bold text-red-400 mb-1">✗ {result.issues.length} issue{result.issues.length === 1 ? '' : 's'} found</p>
              <ul className="text-xs text-zinc-300 list-disc list-inside space-y-0.5">
                {result.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
