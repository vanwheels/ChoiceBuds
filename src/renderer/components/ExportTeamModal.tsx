/**
 * ExportTeamModal.tsx - Showdown-Format Export Modal
 * Mirrors ImportTeamModal.tsx's layout for the reverse direction: renders
 * one or more Pokemon back into Showdown export text
 * (services/parser.ts::formatShowdownText) for copying elsewhere. Shared
 * between TeamCard.tsx's whole-team export and PokemonCard.tsx's
 * single-Pokemon export - both just pass a different-length `pokemonList`
 * and `title`. The on-screen preview additionally colors each EVs line's
 * stat abbreviations using the app's own per-stat color convention
 * (config/pokemonTheme.ts::getStatLabelColor, same one used in StatsColumn.tsx/
 * CalcStatRows.tsx) - purely a display aid, since plain text can't carry color;
 * the copied text itself is the same plain string real Showdown expects.
 *
 * Also offers "Create Pokepaste Link", which posts the same Showdown text to
 * pokepast.es/create (services/pokepaste.ts::createPokepaste) and surfaces
 * the resulting URL. `pasteTitle`/`pasteAuthor`/`pasteNotes` feed that paste's
 * own title/author/notes fields - separate from `title`, which is just this
 * modal's on-screen heading (e.g. "Export Team" vs. a real team name).
 */

import { useState } from 'react';
import { formatPokemonLines, formatShowdownText } from '../services/parser';
import { createPokepaste } from '../services/pokepaste';
import { getStatLabelColor } from '../config/pokemonTheme';
import type { ShowdownPokemon } from '../types/pokemon';
import Modal from './Modal';

interface ExportTeamModalProps {
  pokemonList: ShowdownPokemon[];
  title: string;
  pasteTitle?: string;
  pasteAuthor?: string;
  pasteNotes?: string;
  onClose: () => void;
}

const COPY_CONFIRMATION_MS = 2000;

export default function ExportTeamModal({ pokemonList, title, pasteTitle, pasteAuthor, pasteNotes, onClose }: ExportTeamModalProps) {
  const [copied, setCopied] = useState(false);
  const [isCreatingPaste, setIsCreatingPaste] = useState(false);
  const [pokepasteUrl, setPokepasteUrl] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteUrlCopied, setPasteUrlCopied] = useState(false);
  const plainText = formatShowdownText(pokemonList);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(plainText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPY_CONFIRMATION_MS);
  };

  const handleCreatePokepaste = async () => {
    setIsCreatingPaste(true);
    setPasteError(null);
    const url = await createPokepaste(pokemonList, pasteTitle, pasteAuthor, pasteNotes);
    setIsCreatingPaste(false);
    if (url) {
      setPokepasteUrl(url);
    } else {
      setPasteError('Could not create the Pokepaste link - try again.');
    }
  };

  const handleCopyPasteUrl = async () => {
    if (!pokepasteUrl) return;
    await navigator.clipboard.writeText(pokepasteUrl);
    setPasteUrlCopied(true);
    window.setTimeout(() => setPasteUrlCopied(false), COPY_CONFIRMATION_MS);
  };

  return (
    <Modal>
      <div className="px-6 py-4 border-b border-zinc-700 flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100">{title}</h2>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg font-mono text-sm text-zinc-100 whitespace-pre-wrap">
          {pokemonList.map((pokemon, pIdx) => (
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

        {pokepasteUrl && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg">
            <a
              href={pokepasteUrl}
              onClick={(e) => { e.preventDefault(); window.electron.openExternal(pokepasteUrl); }}
              className="flex-1 text-sm text-accent-gold hover:underline truncate"
            >
              {pokepasteUrl}
            </a>
            <button
              onClick={handleCopyPasteUrl}
              className="px-3 py-1 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors shrink-0"
            >
              {pasteUrlCopied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        )}
        {pasteError && (
          <p className="mt-4 text-sm text-red-400">{pasteError}</p>
        )}
      </div>

      <div className="px-6 py-4 border-t border-zinc-700 flex items-center justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
        >
          Close
        </button>
        <button
          onClick={handleCreatePokepaste}
          disabled={isCreatingPaste}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-200 rounded-lg transition-colors"
        >
          {isCreatingPaste ? 'Creating...' : 'Create Pokepaste Link'}
        </button>
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-accent-gold hover:bg-accent-gold-deep text-zinc-900 rounded-lg transition-colors"
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
      </div>
    </Modal>
  );
}
