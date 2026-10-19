/**
 * FavoritePokemonEditor.tsx - Click-the-Sprite Favorite Pokémon Picker
 * Rendered by ProfileCard.tsx in place of the plain favorite-Pokémon
 * display, whenever ProfilePage.tsx passes a `favoriteEditing` prop (own
 * profile - no Edit toggle gate, see Profile Section Remove-Team Control's
 * redesign in TODO.md). The sprite (or the dashed "+" placeholder when no
 * favorite is set) is permanently clickable, matching the rest of the app's
 * always-on-editing convention (e.g. PokemonCard.tsx's own permanent "×");
 * clicking it opens a popup modal with the current favorite (if any) shown
 * at the top, the species search box below it, and the shiny/public
 * toggles - rather than expanding the search inline the way an earlier
 * Edit-mode-gated version of this component used to. The search results
 * list is in-flow (not an absolutely-positioned dropdown, which an earlier
 * version of this modal used and which Modal.tsx's own `overflow-hidden`
 * panel silently clipped, since an absolutely-positioned child doesn't
 * grow its parent's height) - same single-scroll-region shape as
 * AddTeamToProfileDialog.tsx's own pick-from-list modal.
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { FavoritePokemon } from '../../types/settings';
import type { SpeciesRosterEntry } from '../../types/pokemon';
import Modal from '../Modal';

const MAX_SEARCH_RESULTS = 8;

export interface FavoritePokemonEditorProps {
  favoritePokemon: FavoritePokemon;
  roster: SpeciesRosterEntry[];
  onPick: (entry: SpeciesRosterEntry) => void;
  onToggleShiny: () => void;
  onTogglePublic: () => void;
  onClear: () => void;
}

export default function FavoritePokemonEditor({
  favoritePokemon,
  roster,
  onPick,
  onToggleShiny,
  onTogglePublic,
  onClear,
}: FavoritePokemonEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const trimmedSearch = search.trim().toLowerCase();
  const matches = trimmedSearch
    ? roster
        .filter((entry) => entry.name.toLowerCase().includes(trimmedSearch))
        .slice(0, MAX_SEARCH_RESULTS)
    : [];

  const handleClose = () => {
    setIsOpen(false);
    setSearch('');
  };

  const handlePick = (entry: SpeciesRosterEntry) => {
    setSearch('');
    onPick(entry);
  };

  const handleClear = () => {
    onClear();
    handleClose();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title={
          favoritePokemon.species
            ? 'Click to change favorite Pokémon'
            : 'Click to set a favorite Pokémon'
        }
        className="cursor-pointer rounded transition-opacity hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-accent-gold"
      >
        {favoritePokemon.species ? (
          <img
            src={favoritePokemon.shiny ? favoritePokemon.shinySpriteUrl : favoritePokemon.spriteUrl}
            alt={favoritePokemon.species}
            className="h-20 w-20 object-contain [image-rendering:pixelated]"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-zinc-600 text-xl text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-300">
            +
          </div>
        )}
      </button>
      {favoritePokemon.species && (
        <span className="text-sm text-zinc-300">{favoritePokemon.species}</span>
      )}

      <AnimatePresence>
        {isOpen && (
          <Modal panelClassName="max-w-sm max-h-[85vh]">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-700 px-6 py-4">
              <h2 className="text-xl font-bold text-zinc-100">Favorite Pokémon</h2>
              <button
                onClick={handleClose}
                className="cursor-pointer text-zinc-400 transition-colors hover:text-zinc-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {favoritePokemon.species && (
                <div className="flex flex-col items-center gap-1 border-b border-zinc-700 pb-4">
                  <img
                    src={
                      favoritePokemon.shiny
                        ? favoritePokemon.shinySpriteUrl
                        : favoritePokemon.spriteUrl
                    }
                    alt={favoritePokemon.species}
                    className="h-20 w-20 object-contain [image-rendering:pixelated]"
                  />
                  <span className="text-sm text-zinc-300">{favoritePokemon.species}</span>
                </div>
              )}

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search species..."
                autoFocus
                className="w-full rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
              />

              {matches.length > 0 && (
                <div className="flex flex-col gap-0.5 rounded border border-zinc-600 bg-zinc-900">
                  {matches.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => handlePick(entry)}
                      className="flex cursor-pointer items-center gap-2 px-2 py-1.5 hover:bg-zinc-800"
                    >
                      <img
                        src={entry.spriteUrl}
                        alt={entry.name}
                        className="h-6 w-6 object-contain [image-rendering:pixelated]"
                      />
                      <span className="text-xs text-zinc-200">{entry.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {favoritePokemon.species && (
                <div className="flex items-center gap-3 border-t border-zinc-700 pt-4 text-xs text-zinc-400">
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={favoritePokemon.shiny}
                      onChange={onToggleShiny}
                      className="cursor-pointer accent-accent-gold"
                    />
                    Shiny
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={favoritePokemon.isPublic}
                      onChange={onTogglePublic}
                      className="cursor-pointer accent-accent-gold"
                    />
                    Public
                  </label>
                  <button
                    onClick={handleClear}
                    className="cursor-pointer text-zinc-500 transition-colors hover:text-zinc-300"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
