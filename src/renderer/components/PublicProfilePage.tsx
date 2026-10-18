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
 */

import { useEffect, useState } from 'react';
import { fetchPublicProfile } from '../services/syncApi';

type LoadState =
  | { status: 'loading' }
  | { status: 'found'; username: string }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

export default function PublicProfilePage({ username }: { username: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetchPublicProfile(username)
      .then((profile) => {
        if (cancelled) return;
        setState(
          profile ? { status: 'found', username: profile.username } : { status: 'not-found' },
        );
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
          <h1 className="mt-6 text-2xl font-bold">{state.username}</h1>
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
