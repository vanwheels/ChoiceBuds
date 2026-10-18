/**
 * ProfilePage.tsx - In-App Profile View
 * Renders inside App.tsx's/AppWeb.tsx's <main> (not a route) whenever
 * useProfileNav's stack is non-empty - layered on top of the existing
 * ActiveTab tabs rather than replacing them, so "Back" just pops the stack
 * and whichever tab was already active underneath reappears untouched (In-
 * App Profile Page & Navigation Shell, see TODO.md). Renders the same data
 * as the standalone `/u/<username>` route via the shared usePublicProfile/
 * ProfileCard (see PublicProfilePage.tsx), with no distinction yet between
 * viewing your own profile and someone else's - that split only matters once
 * editing controls move here (Move Profile Editing Onto the Profile Page,
 * see TODO.md).
 *
 * The username lookup box lives here rather than on every tab/the sidebar,
 * since opening a second profile from an already-open one is exactly what
 * the back-stack is for - typing your own username from any entry point
 * exercises the same "own profile" render path as anyone else's, so no
 * separate code path is needed until Leg 4's editing controls land.
 */

import { useState, type FormEvent } from 'react';
import { usePublicProfile } from '../../hooks/usePublicProfile';
import ProfileCard from './ProfileCard';

interface ProfilePageProps {
  username: string;
  onBack: () => void;
  onOpenProfile: (username: string) => void;
}

export default function ProfilePage({ username, onBack, onOpenProfile }: ProfilePageProps) {
  const state = usePublicProfile(username);
  const [lookup, setLookup] = useState('');

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
