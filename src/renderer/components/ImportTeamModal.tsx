/**
 * ImportTeamModal.tsx - Team Import Modal Component
 * Inline text-paste area for Showdown format team imports
 * Invokes parser service and enriches with PokeAPI data
 */

import { useState } from 'react';
import { parseShowdownText } from '../services/parser';
import { enrichPokemonWithAPI } from '../services/pokeapi';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { Team, ImportedPokemonInfo } from '../types/pokemon';

interface ImportTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (team: Team) => Promise<boolean>;
  databaseState: UseDatabaseReturn;
}

/**
 * Modal component for importing teams from Showdown/Pokepaste format
 */
export default function ImportTeamModal({
  isOpen,
  onClose,
  onImport,
  databaseState,
}: ImportTeamModalProps) {
  const [pastedText, setPastedText] = useState('');
  const [teamName, setTeamName] = useState('');
  const [author, setAuthor] = useState('');
  const [teamFormat, setTeamFormat] = useState<'Reg M-A' | 'Reg M-B'>('Reg M-A');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<string>('');

  if (!isOpen) return null;

  /**
   * Handle the import process
   */
  const handleImport = async () => {
    if (!pastedText.trim()) {
      setError('Please paste team data');
      return;
    }

    if (!teamName.trim()) {
      setError('Please enter a team name');
      return;
    }

    setIsImporting(true);
    setError(null);
    setImportProgress('Parsing team data...');

    try {
      // Step 1: Parse Showdown text
      const parseResult = parseShowdownText(pastedText);

      if (!parseResult.success || parseResult.pokemon.length === 0) {
        throw new Error(
          parseResult.errors.length > 0
            ? parseResult.errors.join(', ')
            : 'Failed to parse team data'
        );
      }

      setImportProgress(`Parsed ${parseResult.pokemon.length} Pokémon. Fetching data...`);

      // Step 2: Enrich each Pokémon with PokeAPI data
      const enrichedPokemon: ImportedPokemonInfo[] = [];

      for (let i = 0; i < parseResult.pokemon.length; i++) {
        const pokemon = parseResult.pokemon[i];
        setImportProgress(
          `Enriching ${pokemon.species} (${i + 1}/${parseResult.pokemon.length})...`
        );

        const enriched = await enrichPokemonWithAPI(
          pokemon,
          databaseState.getCachedEntry,
          databaseState.setCacheEntry
        );

        enrichedPokemon.push(enriched);
      }

      // Step 3: Create team object
      const team: Team = {
        id: crypto.randomUUID(),
        name: teamName.trim(),
        format: teamFormat,
        pokemon: enrichedPokemon,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        author: author.trim() || undefined,
      };

      setImportProgress('Saving team...');

      // Step 4: Save team
      const success = await onImport(team);

      if (success) {
        // Reset form and close modal
        setPastedText('');
        setTeamName('');
        setAuthor('');
        setTeamFormat('Reg M-A');
        setImportProgress('');
        onClose();
      } else {
        throw new Error('Failed to save team');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setImportProgress('');
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!isImporting) {
      setPastedText('');
      setTeamName('');
      setAuthor('');
      setError(null);
      setImportProgress('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-100">Import Team</h2>
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Team Name Input */}
          <div>
            <label htmlFor="teamName" className="block text-sm font-medium text-gray-300 mb-2">
              Team Name
            </label>
            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={isImporting}
              placeholder="Enter team name..."
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Author (optional) - Pokepaste pages have one; a plain Showdown export doesn't */}
          <div>
            <label htmlFor="teamAuthor" className="block text-sm font-medium text-gray-300 mb-2">
              Author <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              id="teamAuthor"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              disabled={isImporting}
              placeholder="Who built this team?"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Format Selection */}
          <div>
            <label htmlFor="teamFormat" className="block text-sm font-medium text-gray-300 mb-2">
              Format
            </label>
            <select
              id="teamFormat"
              value={teamFormat}
              onChange={(e) => setTeamFormat(e.target.value as typeof teamFormat)}
              disabled={isImporting}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="Reg M-A">Reg M-A</option>
              <option value="Reg M-B">Reg M-B</option>
            </select>
          </div>

          {/* Paste Area */}
          <div>
            <label htmlFor="pasteArea" className="block text-sm font-medium text-gray-300 mb-2">
              Paste Team (Showdown Format)
            </label>
            <textarea
              id="pasteArea"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              disabled={isImporting}
              placeholder="Paste your Showdown/Pokepaste team here..."
              rows={12}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
            />
          </div>

          {/* Progress Message */}
          {importProgress && (
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{importProgress}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || !pastedText.trim() || !teamName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? 'Importing...' : 'Import Team'}
          </button>
        </div>
      </div>
    </div>
  );
}
