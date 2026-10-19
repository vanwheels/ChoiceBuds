/**
 * ProfilePage.tsx - In-App Profile View
 * Renders inside App.tsx's/AppWeb.tsx's <main> (not a route) whenever
 * useProfileNav's stack is non-empty - layered on top of the existing
 * ActiveTab tabs rather than replacing them, so "Back" just pops the stack
 * and whichever tab was already active underneath reappears untouched (In-
 * App Profile Page & Navigation Shell, see TODO.md). Renders the same data
 * as the standalone `/u/<username>` route via the shared usePublicProfile/
 * ProfileCard (see PublicProfilePage.tsx).
 *
 * Own-profile detection (Move Profile Editing Onto the Profile Page, see
 * TODO.md) compares lowercased, since usernames are case-insensitive
 * server-side (worker/src/index.ts lowercases every lookup) - `username`
 * here can come from the lookup form below in whatever case was typed, not
 * just the exact-cased `syncUsername` the sidebar's own-profile link
 * passes. When it matches, ProfileEditControls renders the
 * team-visibility/teamsheet-tier/favorite-Pokémon editing controls that
 * used to live in Settings' PublicProfileSection - that section now just
 * links here instead of duplicating them.
 *
 * The username lookup box lives here rather than on every tab/the sidebar,
 * since opening a second profile from an already-open one is exactly what
 * the back-stack is for.
 *
 * Import-to-my-Teams (Save/Import a Team From a Profile, see TODO.md) also
 * lives here rather than in ProfileCard: it needs `teamsState`/
 * `databaseState` to build and persist a real `Team`, neither of which the
 * standalone, unauthenticated `/u/<username>` route (PublicProfilePage.tsx)
 * has - keeping the conversion/enrichment logic out of the shared,
 * presentational ProfileCard lets that route keep not needing them.
 * `isOwnProfile` gates it off entirely on your own profile.
 *
 * Drag-to-Rearrange Previewed Teams (see TODO.md) is the mirror image:
 * `onReorderTeams` is only wired up when `isOwnProfile` is true - you can
 * drag your own profile's preview order, never someone else's, and it's
 * `undefined` on the standalone route for the same "no Teams state to
 * write through" reason as the import action above. It calls
 * `teamsState.setProfileTeamOrder` directly (a thin wrapper, unlike
 * `handleImportTeam`'s enrichment pipeline), so it stays inline rather than
 * its own named handler.
 *
 * Profile Section Add-Team Picker (see TODO.md) is the same isOwnProfile-
 * only pair again: `localTeams` is `teamsState.teams` itself (the full
 * local list, not the synced `profile.teams` ProfileCard otherwise
 * renders from) and `onAddTeamToTier` is a thin `updateTeam` wrapper, same
 * shape as `onReorderTeams`'s wrapper above.
 */

import { useState, type FormEvent } from 'react';
import { usePublicProfile } from '../../hooks/usePublicProfile';
import { enrichPokemonWithAPI } from '../../services/pokeapi';
import type { PublicTeam } from '../../services/syncApi';
import {
  buildShowdownPokemonFromPublic,
  resolveImportedTeamFormat,
} from '../../utils/profileTeamImport';
import type { UseSyncReturn } from '../../hooks/useSync';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseDatabaseReturn } from '../../hooks/useDatabase';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseSettingsReturn } from '../../hooks/useSettings';
import type { UseSpeciesRosterReturn } from '../../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import type { ImportedPokemonInfo, Team } from '../../types/pokemon';
import ProfileCard, { type ImportTeamStatus } from './ProfileCard';
import ProfileEditControls from './ProfileEditControls';

interface ProfilePageProps {
  username: string;
  onBack: () => void;
  onOpenProfile: (username: string) => void;
  syncState: UseSyncReturn;
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  settingsState: UseSettingsReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  // Always available in-app (App.tsx/AppWeb.tsx mount both once, app-wide) -
  // threaded down to ProfileCard's per-Pokemon tiles/rows for real
  // type-colored move chips and item sprites, same visual language as
  // TeamCard.tsx/TeamPosterTile.tsx. Optional on ProfileCard itself since
  // the standalone, unauthenticated `/u/<username>` route
  // (PublicProfilePage.tsx) has neither - see ProfilePokemonTile.tsx's own
  // header comment for the fallback behavior that keeps working there.
  gameDataState: UseGameDataReturn;
  spriteCacheState: UseSpriteCacheReturn;
}

export default function ProfilePage({
  username,
  onBack,
  onOpenProfile,
  syncState,
  teamsState,
  databaseState,
  settingsState,
  speciesRosterState,
  gameDataState,
  spriteCacheState,
}: ProfilePageProps) {
  const state = usePublicProfile(username);
  const [lookup, setLookup] = useState('');
  const [importStatus, setImportStatus] = useState<Record<string, ImportTeamStatus>>({});

  const isOwnProfile =
    !!syncState.syncUsername && syncState.syncUsername.toLowerCase() === username.toLowerCase();

  const handleImportTeam = async (publicTeam: PublicTeam) => {
    setImportStatus((prev) => ({ ...prev, [publicTeam.id]: 'importing' }));

    try {
      const enrichedPokemon: ImportedPokemonInfo[] = [];
      for (const p of publicTeam.pokemon) {
        enrichedPokemon.push(
          await enrichPokemonWithAPI(
            buildShowdownPokemonFromPublic(p),
            databaseState.getCachedEntry,
            databaseState.setCacheEntry,
          ),
        );
      }

      const newTeam: Team = {
        id: crypto.randomUUID(),
        name: publicTeam.name || 'Imported Team',
        format: resolveImportedTeamFormat(
          publicTeam.format,
          settingsState.settings.defaultRegulation,
        ),
        pokemon: enrichedPokemon,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        author: username,
      };

      const success = await teamsState.addTeam(newTeam);
      setImportStatus((prev) => ({ ...prev, [publicTeam.id]: success ? 'imported' : 'error' }));
    } catch {
      setImportStatus((prev) => ({ ...prev, [publicTeam.id]: 'error' }));
    }
  };

  const handleLookup = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = lookup.trim();
    if (!trimmed) return;
    setLookup('');
    onOpenProfile(trimmed);
  };

  return (
    <div className="flex flex-col items-center px-4 pb-10 md:px-0">
      <div className="flex w-full max-w-xl items-center justify-between gap-3 pt-2">
        <button
          onClick={onBack}
          className="text-sm text-zinc-400 transition-colors cursor-pointer hover:text-zinc-200"
        >
          ← Back
        </button>
        <form onSubmit={handleLookup} className="flex items-center gap-1.5">
          <input
            type="text"
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="Find a profile by username"
            className="w-48 rounded border border-zinc-600 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
          />
          <button
            type="submit"
            className="rounded bg-accent-gold px-2.5 py-1 text-xs font-semibold text-zinc-900 transition-colors cursor-pointer hover:bg-accent-gold-deep"
          >
            Go
          </button>
        </form>
      </div>

      {isOwnProfile && (
        <ProfileEditControls
          settingsState={settingsState}
          teamsState={teamsState}
          speciesRosterState={speciesRosterState}
        />
      )}

      {state.status === 'loading' && (
        <p className="mt-10 text-sm text-zinc-500">Loading profile…</p>
      )}

      {state.status === 'found' && (
        <ProfileCard
          profile={state.profile}
          gameDataState={gameDataState}
          spriteCacheState={spriteCacheState}
          databaseState={databaseState}
          onImportTeam={isOwnProfile ? undefined : handleImportTeam}
          importStatus={importStatus}
          onReorderTeams={
            isOwnProfile ? (orderedIds) => teamsState.setProfileTeamOrder(orderedIds) : undefined
          }
          localTeams={isOwnProfile ? teamsState.teams : undefined}
          onAddTeamToTier={
            isOwnProfile
              ? (teamId, tier) => teamsState.updateTeam(teamId, { visibility: tier })
              : undefined
          }
        />
      )}

      {state.status === 'not-found' && (
        <p className="mt-10 text-sm text-zinc-400">
          No ChoiceBuds account found for &ldquo;{username}&rdquo;.
        </p>
      )}

      {state.status === 'error' && <p className="mt-10 text-sm text-red-400">{state.message}</p>}
    </div>
  );
}
