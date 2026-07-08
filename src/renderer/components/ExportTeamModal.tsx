/**
 * ExportTeamModal.tsx - Team Export Modal Component
 * Mirrors ImportTeamModal.tsx's layout for the reverse direction: renders
 * the team back into Showdown export text (services/parser.ts::formatShowdownText)
 * for copying elsewhere. The on-screen preview additionally colors each EVs
 * line's stat abbreviations using the app's own per-stat color convention
 * (config/pokemonTheme.ts::getStatLabelColor, same one used in StatsColumn.tsx/
 * CalcStatRows.tsx) - purely a display aid, since plain text can't carry color;
 * the copied text itself is the same plain string real Showdown expects.
 */

import { useState } from 'react';
import { formatPokemonLines, formatShowdownText } from '../services/parser';
import { getStatLabelColor } from '../config/pokemonTheme';
import type { Team } from '../types/pokemon';

interface ExportTeamModalProps {
  team: Team;
  onClose: () => void;
}

const COPY_CONFIRMATION_MS = 2000;

export default function ExportTeamModal({ team, onClose }: ExportTeamModalProps) {
  const [copied, setCopied] = useState(false);
  const showdownData = team.pokemon.map(p => p.showdownData);
  const plainText = formatShowdownText(showdownData);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(plainText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPY_CONFIRMATION_MS);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-100">Export Team</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg font-mono text-sm text-gray-100 whitespace-pre-wrap">
            {showdownData.map((pokemon, pIdx) => (
              <div key={pIdx} className={pIdx > 0 ? 'mt-4' : ''}>
                {formatPokemonLines(pokemon).map((line, lIdx) => (
                  <div key={lIdx}>
                    {line.kind === 'text' ? line.text : (
                      <>
                        EVs:{' '}
                        {line.parts.map((part, partIdx) => (
                          <span key={part.stat}>
                            {partIdx > 0 && ' / '}
                            <span className={getStatLabelColor(part.stat)}>{part.value} {part.stat}</span>
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
