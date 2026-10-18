/**
 * ProfileEditControls.tsx - Own-Profile Editing Panel
 * Rendered by ProfilePage.tsx only when viewing your own profile (Move
 * Profile Editing Onto the Profile Page, see TODO.md) - lifted out of
 * Settings' former PublicProfileSection.tsx, which now just links here
 * instead of duplicating these controls.
 *
 * Edits write through the normal teamsState/settingsState mutators and
 * reflect immediately in this panel. The ProfileCard preview rendered
 * alongside it on ProfilePage still reflects the server's last-synced copy
 * (useSync's debounced push/poll), so it can lag behind an edit made here
 * by a few seconds - same latency this data always had, unchanged by this
 * leg.
 */

import { useState } from 'react';
import type { UseSettingsReturn } from '../../hooks/useSettings';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseSpeciesRosterReturn } from '../../hooks/useSpeciesRoster';
import type { SpeciesRosterEntry, TeamVisibility } from '../../types/pokemon';
import { useDismissable } from '../../hooks/useDismissable';

interface ProfileEditControlsProps {
  settingsState: UseSettingsReturn;
  teamsState: UseTeamsReturn;
  speciesRosterState: UseSpeciesRosterReturn;
}

const MAX_SEARCH_RESULTS = 8;

export default function ProfileEditControls({
  settingsState,
  teamsState,
  speciesRosterState,
}: ProfileEditControlsProps) {
  const { settings, updateSettings } = settingsState;
  const { teams, updateTeam } = teamsState;
  const { roster } = speciesRosterState;
  const { favoritePokemon } = settings;

  const [search, setSearch] = useState('');
  const searchRef = useDismissable<HTMLDivElement>(() => setSearch(''));

  const trimmedSearch = search.trim().toLowerCase();
  const matches = trimmedSearch
    ? roster
        .filter((entry) => entry.name.toLowerCase().includes(trimmedSearch))
        .slice(0, MAX_SEARCH_RESULTS)
    : [];

  // react-hooks/purity misattributes this Date.now() call as happening
  // during render because pickFavorite is only ever invoked from inside
  // matches.map() below - same false positive PlayerProfileSection.tsx's
  // setAgeDivision already documents (it's actually just building an
  // onClick closure per result row, same as any other handler here).
  const pickFavorite = (entry: SpeciesRosterEntry) => {
    setSearch('');
    void updateSettings({
      favoritePokemon: {
        species: entry.name,
        spriteUrl: entry.spriteUrl,
        shinySpriteUrl: entry.shinySpriteUrl,
        shiny: favoritePokemon.shiny,
        isPublic: favoritePokemon.isPublic,
        // eslint-disable-next-line react-hooks/purity
        updatedAt: Date.now(),
      },
    });
  };

  const toggleFavoriteShiny = () => {
    void updateSettings({
      favoritePokemon: {
        ...favoritePokemon,
        shiny: !favoritePokemon.shiny,
        updatedAt: Date.now(),
      },
    });
  };

  const toggleFavoritePublic = () => {
    void updateSettings({
      favoritePokemon: {
        ...favoritePokemon,
        isPublic: !favoritePokemon.isPublic,
        updatedAt: Date.now(),
      },
    });
  };

  const clearFavorite = () => {
    void updateSettings({
      favoritePokemon: {
        species: '',
        spriteUrl: '',
        shinySpriteUrl: '',
        shiny: false,
        isPublic: false,
        updatedAt: Date.now(),
      },
    });
  };

  return (
    <div className="mt-6 flex w-full max-w-xl flex-col gap-4">
      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Teams</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Off by default. Closed shows species/sprites only; Open also shows the full set
          (item/ability/moves/EVs/nature).
        </p>
        {teams.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">No teams yet.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-1.5">
            {teams.map((team) => (
              <div key={team.id} className="flex items-center gap-2 text-xs text-zinc-300">
                <select
                  value={team.visibility ?? 'private'}
                  onChange={(e) =>
                    updateTeam(team.id, { visibility: e.target.value as TeamVisibility })
                  }
                  className="cursor-pointer rounded border border-zinc-600 bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-gold"
                >
                  <option value="private">Private</option>
                  <option value="closed">Closed</option>
                  <option value="open">Open</option>
                </select>
                <span className="truncate">{team.name || 'Untitled Team'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Favorite Pokémon</h2>

        {favoritePokemon.species ? (
          <div className="mt-2 flex items-center gap-3">
            <img
              src={
                favoritePokemon.shiny ? favoritePokemon.shinySpriteUrl : favoritePokemon.spriteUrl
              }
              alt={favoritePokemon.species}
              className="h-10 w-10 object-contain [image-rendering:pixelated]"
            />
            <span className="text-xs text-zinc-200">{favoritePokemon.species}</span>
            <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={favoritePokemon.shiny}
                onChange={toggleFavoriteShiny}
                className="cursor-pointer accent-accent-gold"
              />
              Shiny
            </label>
            <button
              onClick={clearFavorite}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Remove
            </button>
          </div>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">No favorite picked yet.</p>
        )}

        <div ref={searchRef} className="mt-2 relative max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search species..."
            className="w-full px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
          />
          {matches.length > 0 && (
            <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded border border-zinc-600 bg-zinc-900 shadow-lg">
              {matches.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => pickFavorite(entry)}
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

        <label className="mt-2 flex items-center gap-2 text-xs text-zinc-300 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={favoritePokemon.isPublic}
            disabled={!favoritePokemon.species}
            onChange={toggleFavoritePublic}
            className="cursor-pointer accent-accent-gold disabled:opacity-50"
          />
          Show on public profile
        </label>
      </div>
    </div>
  );
}
