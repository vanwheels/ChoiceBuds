/**
 * UpdateCheckSection.tsx - Update-Check Result Display
 * The check itself runs automatically on launch (useUpdateCheck.ts) - this
 * only renders whatever it found. Extracted from SettingsPage.tsx as its
 * own component, same reasoning as SyncSection.tsx: a distinct concern from
 * the Default Regulation/Sync sections next to it.
 */

import type { UseUpdateCheckReturn } from '../hooks/useUpdateCheck';

interface UpdateCheckSectionProps {
  updateCheckState: UseUpdateCheckReturn;
}

const GITHUB_URL_PREFIX = 'https://github.com/';

export default function UpdateCheckSection({ updateCheckState }: UpdateCheckSectionProps) {
  const { status, currentVersion, latestVersion, releaseUrl } = updateCheckState;

  const handleViewRelease = () => {
    if (releaseUrl && releaseUrl.startsWith(GITHUB_URL_PREFIX)) {
      window.electron.openExternal(releaseUrl);
    }
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h2 className="text-sm font-semibold text-gray-200">Updates</h2>
      <p className="mt-1 text-xs text-gray-400">Current version: {currentVersion}</p>

      <div className="mt-3">
        {status === 'checking' && (
          <p className="text-xs text-gray-500">Checking for updates...</p>
        )}
        {status === 'up-to-date' && (
          <p className="text-xs text-green-400">You're up to date.</p>
        )}
        {status === 'no-releases' && (
          <p className="text-xs text-gray-500">No releases published yet.</p>
        )}
        {status === 'error' && (
          <p className="text-xs text-red-400">Couldn't check for updates - check your connection.</p>
        )}
        {status === 'update-available' && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-yellow-400">Update available: {latestVersion}</p>
            <button
              onClick={handleViewRelease}
              className="px-2 py-1 text-[11px] font-bold rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
            >
              View Release
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
