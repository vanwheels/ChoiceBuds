/**
 * PublicProfileSection.tsx - Public Profile Pointer
 * Settings' entry point into the public profile
 * (choicebuds.vannyproductions.com/u/<username>) - editing what's shown
 * there (team visibility/teamsheet tier, favorite Pokémon) now lives on the
 * profile page itself (Move Profile Editing Onto the Profile Page, see
 * TODO.md), shown there via ProfileEditControls only when viewing your own
 * profile. This section just links there instead of duplicating those
 * controls.
 *
 * Only shows a real link once signed in to sync - there's no public
 * profile URL to open without an account/username yet (Public Profiles:
 * Base Route, see TODO.md).
 *
 * The /u/<username> link below opens the in-app profile page (In-App
 * Profile Page & Navigation Shell, see TODO.md) instead of a new browser
 * tab - `href` is kept so right-click "copy link"/middle-click still work,
 * but a plain click calls `onOpenProfile` and prevents the default
 * navigation.
 */

import type { UseSyncReturn } from '../hooks/useSync';

interface PublicProfileSectionProps {
  syncState: UseSyncReturn;
  onOpenProfile: (username: string) => void;
}

export default function PublicProfileSection({
  syncState,
  onOpenProfile,
}: PublicProfileSectionProps) {
  const { syncUsername } = syncState;

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

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Public Profile</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Manage which teams and your favorite Pokémon show up at{' '}
        <a
          href={`/u/${syncUsername}`}
          onClick={(e) => {
            e.preventDefault();
            onOpenProfile(syncUsername);
          }}
          className="text-accent-gold hover:underline"
        >
          /u/{syncUsername}
        </a>{' '}
        from the profile page itself.
      </p>
    </div>
  );
}
