/**
 * TeamValidationButton.tsx - "Validate Team" Button + Result Popup
 * Computes validateTeam() on click and shows a brief popup listing pass/fail
 * and any issues found, anchored under the button. Auto-dismisses after a
 * few seconds, or immediately via Escape/click-outside (useDismissable).
 * Self-contained so TeamCard.tsx just renders this rather than owning the
 * popup state itself.
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
        title="Validate Team"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 text-sm transition-all cursor-pointer"
      >
        ✓
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
              <ul className="text-xs text-gray-300 list-disc list-inside space-y-0.5">
                {result.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
