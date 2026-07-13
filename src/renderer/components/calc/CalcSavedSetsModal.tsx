/**
 * CalcSavedSetsModal.tsx - Saved Pokémon Sets: Import + Manage
 * Combined into one modal rather than two separate surfaces (a paste-to-
 * import box and a management list), since both are Calc-specific and a
 * user visiting either one is likely to want the other nearby. Reuses the
 * same parse (parseShowdownText) + per-block enrich (enrichPokemonWithAPI)
 * loop ImportTeamModal.tsx already uses for team import - the only
 * difference is each enriched Pokemon becomes its own SavedPokemonEntry via
 * useSavedPokemon.ts::addSavedPokemon (auto-labeled/deduped there) instead
 * of being collected into a single Team. No team name/author/format/
 * pokepaste-link fields - those are Team-specific and out of scope for a
 * flat individual-set library.
 */

import { useState } from 'react';
import { parseShowdownText } from '../../services/parser';
import { enrichPokemonWithAPI } from '../../services/pokeapi';
import type { UseDatabaseReturn } from '../../hooks/useDatabase';
import type { UseSavedPokemonReturn } from '../../hooks/useSavedPokemon';
import type { ImportedPokemonInfo } from '../../types/pokemon';
import { getPixelSpriteUrl } from '../../utils/spriteUrl';

interface CalcSavedSetsModalProps {
  onClose: () => void;
  databaseState: UseDatabaseReturn;
  savedPokemonState: UseSavedPokemonReturn;
  resolveSprite: (remoteUrl: string) => string;
}

export default function CalcSavedSetsModal({ onClose, databaseState, savedPokemonState, resolveSprite }: CalcSavedSetsModalProps) {
  const [pastedText, setPastedText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const handleImport = async () => {
    if (!pastedText.trim()) {
      setError('Please paste one or more Pokémon sets');
      return;
    }

    setIsImporting(true);
    setError(null);
    setImportProgress('Parsing...');

    try {
      const parseResult = parseShowdownText(pastedText);

      if (!parseResult.success || parseResult.pokemon.length === 0) {
        throw new Error(
          parseResult.errors.length > 0 ? parseResult.errors.join(', ') : 'Failed to parse pasted text'
        );
      }

      // Enrich every parsed Pokemon first, then save them all in one batch -
      // a loop of sequential single-add calls would each read the hook's
      // savedPokemon state from the same stale closure and silently
      // overwrite each other (see useSavedPokemon.ts::addSavedPokemonBatch).
      const enrichedPokemon: ImportedPokemonInfo[] = [];
      for (let i = 0; i < parseResult.pokemon.length; i++) {
        const pokemon = parseResult.pokemon[i];
        setImportProgress(`Enriching ${pokemon.species} (${i + 1}/${parseResult.pokemon.length})...`);
        enrichedPokemon.push(await enrichPokemonWithAPI(pokemon, databaseState.getCachedEntry, databaseState.setCacheEntry));
      }

      setImportProgress('Saving...');
      const success = await savedPokemonState.addSavedPokemonBatch(enrichedPokemon);
      if (!success) throw new Error('Failed to save Pokémon sets');

      setPastedText('');
      setImportProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setImportProgress('');
    } finally {
      setIsImporting(false);
    }
  };

  const startRename = (id: string, currentLabel: string) => {
    setRenamingId(id);
    setRenameDraft(currentLabel);
  };

  const commitRename = async () => {
    if (renamingId && renameDraft.trim()) {
      await savedPokemonState.renameSavedPokemon(renamingId, renameDraft.trim());
    }
    setRenamingId(null);
  };

  const sortedSets = [...savedPokemonState.savedPokemon].sort((a, b) => {
    const speciesCompare = a.pokemon.showdownData.species.localeCompare(b.pokemon.showdownData.species);
    return speciesCompare !== 0 ? speciesCompare : a.label.localeCompare(b.label);
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-100">Saved Pokémon Sets</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Import section */}
          <div>
            <label htmlFor="savedSetsPasteArea" className="block text-sm font-medium text-gray-300 mb-2">
              Paste one or more Pokémon (Showdown format)
            </label>
            <textarea
              id="savedSetsPasteArea"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              disabled={isImporting}
              placeholder="Paste one or more Showdown-format Pokémon sets, separated by a blank line..."
              rows={8}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleImport}
                disabled={isImporting || !pastedText.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? 'Saving...' : 'Save Set(s)'}
              </button>
            </div>
            {importProgress && <p className="text-blue-400 text-sm mt-2">{importProgress}</p>}
            {error && (
              <div className="mt-2 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Management list */}
          <div className="pt-2 border-t border-gray-700">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-2">
              Your Saved Sets ({sortedSets.length})
            </h3>
            {sortedSets.length === 0 ? (
              <p className="text-sm text-gray-400">No saved sets yet - paste one above to get started.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {sortedSets.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700"
                  >
                    <img
                      src={resolveSprite(getPixelSpriteUrl(
                        entry.pokemon.pokedexNumber,
                        entry.pokemon.showdownData.species,
                        entry.pokemon.showdownData.gender || 'M',
                        entry.pokemon.showdownData.shiny
                      ))}
                      alt={entry.pokemon.showdownData.species}
                      className="w-9 h-9 object-contain [image-rendering:pixelated] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      {renamingId === entry.id ? (
                        <input
                          type="text"
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                          autoFocus
                          className="w-full px-1.5 py-0.5 text-sm bg-gray-800 border border-blue-500 rounded text-gray-100 outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startRename(entry.id, entry.label)}
                          title="Click to rename"
                          className="text-left text-sm font-semibold text-gray-100 hover:text-blue-400 truncate cursor-pointer"
                        >
                          {entry.label}
                        </button>
                      )}
                      <p className="text-xs text-gray-400 truncate">{entry.pokemon.showdownData.species} - Lv{entry.pokemon.showdownData.level}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => savedPokemonState.deleteSavedPokemon(entry.id)}
                      title="Delete"
                      className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 cursor-pointer shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
