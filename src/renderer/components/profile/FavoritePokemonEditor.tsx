/**
 * FavoritePokemonEditor.tsx - Click-the-Sprite Favorite Pokémon Picker
 * Rendered by ProfileCard.tsx in place of the plain favorite-Pokémon
 * display, only when ProfilePage.tsx passes a `favoriteEditing` prop (own
 * profile + its Edit toggle on). Replaces the former ProfileEditControls.tsx,
 * which duplicated this display in a separate box alongside a per-team
 * visibility dropdown list - that list is gone now that team visibility can
 * be set directly from the Teams tab's own TeamVisibilityBadge, the profile
 * section "+ Team" picker, and cross-section drag (Profile Edit Mode:
 * Inline Favorite Pokemon Editing, see TODO.md). This is the one
 * favorite-Pokemon UI left: it's both the normal display and, when editing,
 * the picker - clicking the sprite itself (or the dashed placeholder when
 * none is set) opens the species search in place.
 */

import { useState } from 'react';
import type { FavoritePokemon } from '../../types/settings';
import type { SpeciesRosterEntry } from '../../types/pokemon';
import { useDismissable } from '../../hooks/useDismissable';

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useDismissable<HTMLDivElement>(() => {
    setPickerOpen(false);
    setSearch('');
  });

  const trimmedSearch = search.trim().toLowerCase();
  const matches = trimmedSearch
    ? roster
        .filter((entry) => entry.name.toLowerCase().includes(trimmedSearch))
        .slice(0, MAX_SEARCH_RESULTS)
    : [];

  const handlePick = (entry: SpeciesRosterEntry) => {
    setSearch('');
    setPickerOpen(false);
    onPick(entry);
  };

  return (
    <div ref={pickerRef} className="relative mt-1 flex flex-col items-center">
      {pickerOpen ? (
        <div className="relative w-48">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search species..."
            autoFocus
            className="w-full px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
          />
          {matches.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded border border-zinc-600 bg-zinc-900 shadow-lg">
              {matches.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => handlePick(entry)}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 cursor-pointer"
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
        </div>
      ) : favoritePokemon.species ? (
        <>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            title="Click to change favorite Pokémon"
            className="cursor-pointer rounded transition-opacity hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-accent-gold"
          >
            <img
              src={
                favoritePokemon.shiny ? favoritePokemon.shinySpriteUrl : favoritePokemon.spriteUrl
              }
              alt={favoritePokemon.species}
              className="h-20 w-20 object-contain [image-rendering:pixelated]"
            />
          </button>
          <span className="text-sm text-zinc-300">{favoritePokemon.species}</span>
          <div className="mt-1 flex items-center gap-3 text-xs text-zinc-400">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={favoritePokemon.shiny}
                onChange={onToggleShiny}
                className="cursor-pointer accent-accent-gold"
              />
              Shiny
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={favoritePokemon.isPublic}
                onChange={onTogglePublic}
                className="cursor-pointer accent-accent-gold"
              />
              Public
            </label>
            <button
              onClick={onClear}
              className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Remove
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          title="Click to set a favorite Pokémon"
          className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-zinc-600 text-xl text-zinc-500 transition-colors cursor-pointer hover:border-zinc-400 hover:text-zinc-300"
        >
          +
        </button>
      )}
    </div>
  );
}
