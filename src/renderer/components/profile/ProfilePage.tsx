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
 */

import { useState, type FormEvent } from 'react';
import { usePublicProfile } from '../../hooks/usePublicProfile';
import type { UseSyncReturn } from '../../hooks/useSync';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseSettingsReturn } from '../../hooks/useSettings';
import type { UseSpeciesRosterReturn } from '../../hooks/useSpeciesRoster';
import ProfileCard from './ProfileCard';
import ProfileEditControls from './ProfileEditControls';

interface ProfilePageProps {
  username: string;
  onBack: () => void;
  onOpenProfile: (username: string) => void;
  syncState: UseSyncReturn;
  teamsState: UseTeamsReturn;
  settingsState: UseSettingsReturn;
  speciesRosterState: UseSpeciesRosterReturn;
}

export default function ProfilePage({
  username,
  onBack,
  onOpenProfile,
  syncState,
  teamsState,
  settingsState,
  speciesRosterState,
}: ProfilePageProps) {
  const state = usePublicProfile(username);
  const [lookup, setLookup] = useState('');

  const isOwnProfile =
    !!syncState.syncUsername && syncState.syncUsername.toLowerCase() === username.toLowerCase();

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

      {state.status === 'found' && <ProfileCard profile={state.profile} />}

      {state.status === 'not-found' && (
        <p className="mt-10 text-sm text-zinc-400">
          No ChoiceBuds account found for &ldquo;{username}&rdquo;.
        </p>
      )}

      {state.status === 'error' && <p className="mt-10 text-sm text-red-400">{state.message}</p>}
    </div>
  );
}
