/**
 * PublicProfilePage.tsx - Public, Unauthenticated Profile View
 * Mounted at choicebuds.vannyproductions.com/u/<username> (web/main.tsx's
 * own path check via utils/publicProfileRoute.ts) - a separate render path
 * from AppWeb's signed-out Teams/Box app, not a tab inside it, since any
 * visitor (no account, no sign-in) can land here cold. Public by default
 * for every account - no opt-in needed for this base view (Public Profiles:
 * Base Route, see TODO.md).
 *
 * Icon is a single fixed placeholder (the existing mascot.png DownloadPage.tsx
 * already uses) rather than a real preset-icon-set/picker - that's deferred
 * to its own later leg, this one only needed the route + username to exist.
 *
 * Teams/favorite Pokémon (Public Profiles: Per-Item Visibility Toggles, see
 * TODO.md) are opt-in per account, off by default - `profile.teams`/
 * `profile.favoritePokemon` are already filtered server-side
 * (worker/src/index.ts::handleProfileGet) to just what's toggled public, so
 * this component renders whatever it's handed with no further gating.
 *
 * The fetch/loading-state machine and the actual profile content render
 * (avatar, favorite, teams) are shared with the in-app profile page
 * (components/profile/ProfilePage.tsx) via usePublicProfile/ProfileCard - see
 * ProfileCard.tsx's own header comment.
 */

import { usePublicProfile } from '../hooks/usePublicProfile';
import ProfileCard from './profile/ProfileCard';

export default function PublicProfilePage({ username }: { username: string }) {
  const state = usePublicProfile(username);

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-900 px-6 py-16 text-zinc-100">
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

      <a href="/" className="mt-16 text-xs text-zinc-600 underline hover:text-zinc-400">
        Try ChoiceBuds yourself
      </a>
    </div>
  );
}
