/**
 * SaveToLibraryDialog.tsx - "Save to Library" Name Prompt
 * Shared confirm-with-a-name step in front of useSavedPokemon.ts's
 * addSavedPokemonBatch, used at both of today's save points (Save-to-Library
 * Name Prompt Leg 1, see TODO.md): Calc's "Save Set" button
 * (CalcPokemonPanel.tsx::handleSaveSet, which enriches first so this dialog
 * always has a real pokedexNumber/sprite to show) and Teams' PokemonCard
 * right-click "Save to Library" item. Replaces the prior silent
 * auto-generated label at both - the name typed here is what
 * addSavedPokemonBatch's `labels` argument carries through; its own
 * nextAvailableLabel dedup logic still runs underneath as a fallback against
 * whatever's typed here, not removed.
 *
 * Deliberately just a name + sprite, not a full set editor - editing the
 * actual build happens after the fact from wherever the saved entry lives
 * (Calc's saved-sets list today, the Box tab's own editable card once that
 * ships - see TODO.md).
 */

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ImportedPokemonInfo } from '../types/pokemon';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import Modal from './Modal';

interface SaveToLibraryDialogProps {
  pokemon: ImportedPokemonInfo;
  resolveSprite: (remoteUrl: string) => string;
  /** Persists the entry under the given name. Returning false keeps the dialog open with an error instead of closing it. */
  onSave: (label: string) => Promise<boolean> | boolean;
  onClose: () => void;
}

export default function SaveToLibraryDialog({ pokemon, resolveSprite, onSave, onClose }: SaveToLibraryDialogProps) {
  const { showdownData, pokedexNumber } = pokemon;
  const [name, setName] = useState(showdownData.nickname || showdownData.species);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const success = await onSave(name.trim() || showdownData.species);
      if (success) {
        onClose();
      } else {
        setError('Failed to save - please try again');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <Modal panelClassName="max-w-sm">
      <div className="px-5 py-4 border-b border-zinc-700 flex items-center justify-between">
        <h2 className="text-base font-bold text-zinc-100">Save to Library</h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 shrink-0 bg-zinc-900 rounded-lg border border-zinc-600 flex items-center justify-center overflow-hidden">
            <img
              src={resolveSprite(getPixelSpriteUrl(pokedexNumber, showdownData.species, showdownData.gender || 'M', showdownData.shiny))}
              alt={showdownData.species}
              className="w-12 h-12 object-contain [image-rendering:pixelated]"
            />
          </div>
          <p className="text-sm text-zinc-300 truncate">{showdownData.species}</p>
        </div>

        <div>
          <label htmlFor="saveToLibraryName" className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">
            Name
          </label>
          <input
            id="saveToLibraryName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-accent-gold"
          />
        </div>

        {error && (
          <div className="p-2 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg text-red-200 text-xs">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-accent-gold hover:bg-accent-gold-deep text-zinc-900 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
