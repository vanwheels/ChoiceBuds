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
 */

import { useEffect, useState } from 'react';
import { fetchPublicProfile, type PublicProfile } from '../services/syncApi';

type LoadState =
  | { status: 'loading' }
  | { status: 'found'; profile: PublicProfile }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

export default function PublicProfilePage({ username }: { username: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetchPublicProfile(username)
      .then((profile) => {
        if (cancelled) return;
        setState(profile ? { status: 'found', profile } : { status: 'not-found' });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Could not load this profile',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-900 px-6 py-16 text-zinc-100">
      {state.status === 'loading' && (
        <p className="mt-10 text-sm text-zinc-500">Loading profile…</p>
      )}

      {state.status === 'found' && (
        <>
          <img src="/mascot.png" alt="" className="h-20 w-20" />
          <h1 className="mt-6 text-2xl font-bold">{state.profile.username}</h1>

          {state.profile.favoritePokemon && (
            <div className="mt-6 flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                Favorite Pokémon
              </span>
              <img
                src={state.profile.favoritePokemon.spriteUrl}
                alt={state.profile.favoritePokemon.species}
                className="h-20 w-20 object-contain [image-rendering:pixelated]"
              />
              <span className="text-sm text-zinc-300">{state.profile.favoritePokemon.species}</span>
            </div>
          )}

          {state.profile.teams.length > 0 && (
            <div className="mt-10 flex w-full max-w-xl flex-col gap-4">
              {state.profile.teams.map((team) => (
                <div key={team.id} className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-zinc-100">
                      {team.name || 'Untitled Team'}
                    </h2>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                      {team.format}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {team.pokemon.map((p, idx) => (
                      <div key={idx} className="flex flex-col items-center w-14">
                        <img
                          src={p.spriteUrl}
                          alt={p.species}
                          className="h-12 w-12 object-contain [image-rendering:pixelated]"
                        />
                        <span className="w-full truncate text-center text-[10px] text-zinc-400">
                          {p.nickname || p.species}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

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
