/**
 * TeamSheetPdfModal.tsx - VGC Team Sheet PDF Export
 * Sibling to ExportTeamModal.tsx (Showdown text) and TeamExportImageModal.tsx
 * (poster PNG); this one fills the real official Play! Pokémon tournament
 * PDF (services/teamSheetPdf.ts) with the team's 6 Pokemon plus the player's
 * Settings-page identity profile. Battle Team Number/Name is edited here
 * (not Settings) since it's tournament-specific per Team, not stable player
 * identity - see the Team type's own doc comment.
 */

import { useState } from 'react';
import type { Team } from '../types/pokemon';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseSettingsReturn } from '../hooks/useSettings';

interface TeamSheetPdfModalProps {
  team: Team;
  teamsState: UseTeamsReturn;
  settingsState: UseSettingsReturn;
  onClose: () => void;
}

const inputClass = 'flex-1 px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function TeamSheetPdfModal({ team, teamsState, settingsState, onClose }: TeamSheetPdfModalProps) {
  const { updateTeam } = teamsState;
  const { playerProfile } = settingsState.settings;
  const [battleTeamNumber, setBattleTeamNumber] = useState(team.battleTeamNumber ?? '');
  // Defaults to the team's own builder name (still fully editable/overridable
  // below) rather than starting blank - most players register a Battle Team
  // under the same name they already gave it in the builder.
  const [battleTeamName, setBattleTeamName] = useState(team.battleTeamName ?? team.name);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasProfile = Object.values(playerProfile).some(v => v);

  const handleDownload = async () => {
    setIsWorking(true);
    setError(null);
    try {
      if (battleTeamNumber !== (team.battleTeamNumber ?? '') || battleTeamName !== (team.battleTeamName ?? '')) {
        await updateTeam(team.id, {
          battleTeamNumber: battleTeamNumber.trim() || undefined,
          battleTeamName: battleTeamName.trim() || undefined,
        });
      }
      // Dynamic import so pdf-lib (a sizeable dependency) only loads when this
      // modal is actually used, instead of bloating the eager main bundle
      // TeamCard.tsx (and every other statically-imported caller) ships in.
      const { generateTeamSheetPdf } = await import('../services/teamSheetPdf');
      const bytes = await generateTeamSheetPdf(
        { ...team, battleTeamNumber: battleTeamNumber.trim() || undefined, battleTeamName: battleTeamName.trim() || undefined },
        playerProfile
      );
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${team.name.replace(/[^a-z0-9]+/gi, '-')}-team-sheet.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating team sheet PDF:', err);
      setError('Failed to generate PDF.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-100">Team Sheet PDF</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <p className="text-xs text-gray-400">
            Fills the official Play! Pokémon Video Game Team List PDF with this team's 6 Pokémon and your Player Profile.
          </p>

          {!hasProfile && (
            <p className="text-xs text-yellow-400">
              Your Player Profile is empty - fill it in on the Settings page for a fully-completed sheet. Generating now will still work, just with those fields left blank.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Battle Team Number</label>
              <input
                type="text"
                value={battleTeamNumber}
                onChange={e => setBattleTeamNumber(e.target.value)}
                placeholder="e.g. 1"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Battle Team Name</label>
              <input
                type="text"
                value={battleTeamName}
                onChange={e => setBattleTeamName(e.target.value)}
                placeholder="e.g. Rain Balance"
                className={inputClass}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            disabled={isWorking}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWorking ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
