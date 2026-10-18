/**
 * usePublicProfile.ts - Public Profile Data Fetch
 * Shared by the standalone `/u/<username>` route (PublicProfilePage.tsx) and
 * the in-app profile page (components/profile/ProfilePage.tsx) so both
 * render off the same `GET /profile/:username` call rather than each owning
 * its own copy of this loading/not-found/error state machine.
 */

import { useEffect, useState } from 'react';
import { fetchPublicProfile, type PublicProfile } from '../services/syncApi';

export type PublicProfileLoadState =
  | { status: 'loading' }
  | { status: 'found'; profile: PublicProfile }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

export function usePublicProfile(username: string): PublicProfileLoadState {
  const [state, setState] = useState<PublicProfileLoadState>({ status: 'loading' });

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

  return state;
}
