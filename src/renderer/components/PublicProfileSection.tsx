/**
 * PublicProfileSection.tsx - Public Profile Visibility Controls
 * One place to manage everything an account has toggled visible on its
 * public profile page (choicebuds.vannyproductions.com/u/<username>) - a
 * per-team toggle list plus the favorite-Pokémon picker/toggle (Public
 * Profiles: Per-Item Visibility Toggles, see TODO.md). Off by default for
 * every team/the favorite pick, matching the Worker only ever serving
 * what's explicitly toggled on (worker/src/index.ts::handleProfileGet).
 *
 * Only shows real controls once signed in to sync - there's no public
 * profile URL to manage without an account/username yet (Public Profiles:
 * Base Route, see TODO.md).
 */

import { useState } from 'react';
import type { UseSettingsReturn } from '../hooks/useSettings';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseSyncReturn } from '../hooks/useSync';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { SpeciesRosterEntry } from '../types/pokemon';
import { useDismissable } from '../hooks/useDismissable';

interface PublicProfileSectionProps {
  settingsState: UseSettingsReturn;
  teamsState: UseTeamsReturn;
  syncState: UseSyncReturn;
  speciesRosterState: UseSpeciesRosterReturn;
}

const MAX_SEARCH_RESULTS = 8;

export default function PublicProfileSection({
  settingsState,
  teamsState,
  syncState,
  speciesRosterState,
}: PublicProfileSectionProps) {
  const { settings, updateSettings } = settingsState;
  const { teams, updateTeam } = teamsState;
  const { syncUsername } = syncState;
  const { roster } = speciesRosterState;
  const { favoritePokemon } = settings;

  const [search, setSearch] = useState('');
  const searchRef = useDismissable<HTMLDivElement>(() => setSearch(''));

  if (!syncUsername) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Public Profile</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Sign up or log in below to get a public profile page other people can view by URL.
        </p>
      </div>
    );
  }

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
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Public Profile</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Off by default. Toggle a team or your favorite Pokémon on to show it at{' '}
        <a
          href={`/u/${syncUsername}`}
          target="_blank"
          rel="noreferrer"
          className="text-accent-gold hover:underline"
        >
          /u/{syncUsername}
        </a>
        .
      </p>

      <div className="mt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Teams</h3>
        {teams.length === 0 ? (
          <p className="mt-1 text-xs text-zinc-500">No teams yet.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-1.5">
            {teams.map((team) => (
              <label
                key={team.id}
                className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={team.isPublic ?? false}
                  onChange={() => updateTeam(team.id, { isPublic: !team.isPublic })}
                  className="cursor-pointer accent-accent-gold"
                />
                <span className="truncate">{team.name || 'Untitled Team'}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-semibold text-zinc-300">Favorite Pokémon</h3>

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
