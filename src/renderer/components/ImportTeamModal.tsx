/**
 * ImportTeamModal.tsx - Team Import Modal Component
 * Inline text-paste area for Showdown format team imports
 * Invokes parser service and enriches with PokeAPI data
 */

import { useState, useEffect } from 'react';
import { parseShowdownText } from '../services/parser';
import { enrichPokemonWithAPI } from '../services/pokeapi';
import { extractPokepasteId, fetchPokepaste, detectRegulationFromNotes, type PokepasteData } from '../services/pokepaste';
import { buildCatalogNotes } from '../services/vgcPastes';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { Team, ImportedPokemonInfo, RegulationLabel, ShowdownPokemon, VgcPasteTeamRow } from '../types/pokemon';
import Modal from './Modal';

interface ImportTeamModalProps {
  onClose: () => void;
  onImport: (team: Team) => Promise<boolean>;
  databaseState: UseDatabaseReturn;
  existingTeamNames: string[];
  defaultRegulation: RegulationLabel;
  // Signed-in sync account username (useSync.ts's syncUsername, sourced from
  // AppSettings directly - see settingsState.settings.syncUsername), used to
  // default the Author field below for a self-authored team. Deliberately
  // not applied when catalogRow is set - a VGCPastes import is someone
  // else's real tournament team, and applyPokepasteData's own
  // owner/author precedence (see its comment) already handles attribution
  // for that case; defaulting to the signed-in user there would silently
  // overwrite a blank field before that logic gets a chance to run.
  syncUsername: string | null;
  // Set by VgcPasteCatalogModal.tsx when a catalog row's "Import" button is
  // clicked - the paste itself is fetched and applied on mount exactly like
  // a user pasting the same link into the paste area and blurring it (see
  // the mount effect below and handlePasteAreaBlur, which share
  // applyPokepasteData). Its presence also means "catalog import mode":
  // applyPokepasteData prefers the row's own description/owner over the
  // paste's own title/author for Team Name/Author (see that function's own
  // comment for why). finishImport also auto-populates the new Team's Notes
  // from the row's tournament/rank/link fields via services/vgcPastes.ts's
  // buildCatalogNotes (Notes Auto-Population, Leg 4, see TODO.md).
  catalogRow?: VgcPasteTeamRow;
}

/** Smallest-unused "Team N" - keeps working after teams are renamed/deleted, not just a running count. */
function nextGenericTeamName(existingTeamNames: string[]): string {
  const taken = new Set(existingTeamNames);
  let n = 1;
  while (taken.has(`Team ${n}`)) n++;
  return `Team ${n}`;
}

/**
 * Modal component for importing teams from Showdown/Pokepaste format
 */
export default function ImportTeamModal({
  onClose,
  onImport,
  databaseState,
  existingTeamNames,
  defaultRegulation,
  catalogRow,
  syncUsername,
}: ImportTeamModalProps) {
  const [pastedText, setPastedText] = useState('');
  const [teamName, setTeamName] = useState('');
  const [author, setAuthor] = useState(() => (!catalogRow && syncUsername) ? syncUsername : '');
  const [teamFormat, setTeamFormat] = useState<RegulationLabel>(defaultRegulation);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<string>('');
  const [isFetchingPokepaste, setIsFetchingPokepaste] = useState(false);

  /**
   * Applies a fetched pokepast.es paste's own data into the form fields -
   * team name/author are only auto-filled when still empty, so this never
   * clobbers something the user already typed. Format is applied whenever
   * detected since it's a low-risk best-effort guess the Format dropdown
   * still lets the user override. Shared by handlePasteAreaBlur (a user
   * pasting/blurring a link) and the catalogRow mount effect below
   * (VgcPasteCatalogModal.tsx's "Import" button) - same data, two triggers.
   *
   * In catalog mode (catalogRow set), Team Name/Author prefer the row's own
   * description/owner over the paste's own title/author: VGCPastes
   * republishes every paste under its own account, so the paste's `author`
   * is always the literal string "VGCPastes" rather than the real player,
   * and its `title` carries a rental-code suffix (e.g. "...Top 16 Team
   * 7C8RLWGQWV") that doesn't belong in a team name. Falls back to the
   * paste's own fields when the row's description/owner is blank (not every
   * sheet row has both filled in).
   */
  const applyPokepasteData = (data: PokepasteData) => {
    setPastedText(data.paste);
    const nameFromCatalog = catalogRow?.description.trim();
    const teamNameToApply = nameFromCatalog || data.title;
    if (!teamName.trim() && teamNameToApply) setTeamName(teamNameToApply);
    const authorFromCatalog = catalogRow?.owner.trim();
    const authorToApply = authorFromCatalog || data.author;
    if (!author.trim() && authorToApply) setAuthor(authorToApply);
    const detectedFormat = detectRegulationFromNotes(data.notes || '');
    if (detectedFormat) setTeamFormat(detectedFormat);
  };

  /** If the paste box holds nothing but a pokepast.es link, fetch and apply it - see applyPokepasteData. */
  const handlePasteAreaBlur = async () => {
    const id = extractPokepasteId(pastedText);
    if (!id) return;

    setIsFetchingPokepaste(true);
    setError(null);
    try {
      applyPokepasteData(await fetchPokepaste(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Pokepaste link');
    } finally {
      setIsFetchingPokepaste(false);
    }
  };

  // Prefilled from the sample-team catalog (VgcPasteCatalogModal.tsx) - same
  // fetch-and-apply as a user pasting the link themselves and blurring the
  // textarea, just triggered on mount instead. Runs once; catalogRow never
  // changes across this modal's lifetime (a new prefill always means a
  // freshly-mounted modal instance). Inline async IIFE (not a named/outer-
  // scope function called by reference) - React's own accepted fetch-in-
  // effect shape, matching useDatabase.ts's mount effect; see
  // docs/investigations/set-state-in-effect-lint-fix.md for why the shape
  // matters to react-hooks/set-state-in-effect even with no sync setState
  // before the first await.
  useEffect(() => {
    if (!catalogRow) return;
    const id = extractPokepasteId(catalogRow.pokepasteUrl);
    if (!id) return;

    let cancelled = false;
    (async () => {
      setIsFetchingPokepaste(true);
      setError(null);
      try {
        const data = await fetchPokepaste(id);
        if (cancelled) return;
        applyPokepasteData(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch Pokepaste link');
      } finally {
        if (!cancelled) setIsFetchingPokepaste(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Parses the pasted text (if any), enriches every parsed Pokémon via PokeAPI, and saves the resulting team. */
  const handleParseAndImport = async () => {
    if (!pastedText.trim()) {
      await finishImport([]);
      return;
    }

    setIsImporting(true);
    setError(null);
    setImportProgress('Parsing team data...');

    try {
      const parseResult = parseShowdownText(pastedText);

      if (!parseResult.success || parseResult.pokemon.length === 0) {
        throw new Error(
          parseResult.errors.length > 0
            ? parseResult.errors.join(', ')
            : 'Failed to parse team data'
        );
      }

      await finishImport(parseResult.pokemon);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setImportProgress('');
      setIsImporting(false);
    }
  };

  const finishImport = async (parsedPokemon: ShowdownPokemon[]) => {
    setIsImporting(true);
    setError(null);

    try {
      const enrichedPokemon: ImportedPokemonInfo[] = [];

      for (let i = 0; i < parsedPokemon.length; i++) {
        const pokemon = parsedPokemon[i];

        setImportProgress(`Enriching ${pokemon.species} (${i + 1}/${parsedPokemon.length})...`);
        const enriched = await enrichPokemonWithAPI(
          pokemon,
          databaseState.getCachedEntry,
          databaseState.setCacheEntry
        );
        enrichedPokemon.push(enriched);
      }

      const team: Team = {
        id: crypto.randomUUID(),
        name: teamName.trim() || nextGenericTeamName(existingTeamNames),
        format: teamFormat,
        pokemon: enrichedPokemon,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        author: author.trim() || undefined,
        notes: catalogRow ? buildCatalogNotes(catalogRow) : undefined,
      };

      setImportProgress('Saving team...');

      const success = await onImport(team);

      if (success) {
        // Reset form and close modal
        setPastedText('');
        setTeamName('');
        setAuthor('');
        setTeamFormat(defaultRegulation);
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
    <Modal>
      {/* Modal Header */}
      <div className="px-6 py-4 border-b border-zinc-700 flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100">Import Team</h2>
        <button
          onClick={handleClose}
          disabled={isImporting}
          className="text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
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
          <label htmlFor="teamName" className="block text-sm font-medium text-zinc-300 mb-2">
            Team Name
          </label>
          <input
            id="teamName"
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            disabled={isImporting}
            placeholder="Enter team name... (defaults to &quot;Team N&quot; if left blank)"
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50"
          />
        </div>

        {/* Author (optional) - Pokepaste pages have one; a plain Showdown export doesn't */}
        <div>
          <label htmlFor="teamAuthor" className="block text-sm font-medium text-zinc-300 mb-2">
            Author <span className="text-zinc-500 font-normal">(optional)</span>
          </label>
          <input
            id="teamAuthor"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            disabled={isImporting}
            placeholder="Who built this team?"
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50"
          />
        </div>

        {/* Format Selection */}
        <div>
          <label htmlFor="teamFormat" className="block text-sm font-medium text-zinc-300 mb-2">
            Format
          </label>
          <select
            id="teamFormat"
            value={teamFormat}
            onChange={(e) => setTeamFormat(e.target.value as typeof teamFormat)}
            disabled={isImporting}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50"
          >
            <option value="Reg M-A">Reg M-A</option>
            <option value="Reg M-B">Reg M-B</option>
            <option value="Reg M-C">Reg M-C</option>
          </select>
        </div>

        {/* Paste Area - also accepts a pokepast.es link directly (see handlePasteAreaBlur) */}
        <div>
          <label htmlFor="pasteArea" className="block text-sm font-medium text-zinc-300 mb-2">
            Paste Team (Showdown Format or a pokepast.es link)
            <span className="text-zinc-500 font-normal"> (optional - leave blank to create an empty team)</span>
          </label>
          <textarea
            id="pasteArea"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            onBlur={handlePasteAreaBlur}
            disabled={isImporting}
            placeholder="Paste your Showdown/Pokepaste team, or a pokepast.es link, here... (or leave blank for an empty team)"
            rows={12}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50 resize-none"
          />
        </div>

        {/* Pokepaste Fetch Progress */}
        {isFetchingPokepaste && (
          <div className="flex items-center gap-2 text-accent-gold text-sm">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Fetching from Pokepaste...</span>
          </div>
        )}

        {/* Progress Message */}
        {importProgress && (
          <div className="flex items-center gap-2 text-accent-gold text-sm">
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
      <div className="px-6 py-4 border-t border-zinc-700 flex items-center justify-end gap-3">
        <button
          onClick={handleClose}
          disabled={isImporting}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleParseAndImport}
          disabled={isImporting}
          className="px-4 py-2 bg-accent-gold hover:bg-accent-gold-deep text-zinc-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isImporting ? 'Importing...' : pastedText.trim() ? 'Import Team' : 'Create Empty Team'}
        </button>
      </div>
    </Modal>
  );
}
