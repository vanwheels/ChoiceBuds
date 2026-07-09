/**
 * SyncSection.tsx - Cross-Device Sync UI
 * Manual Push/Pull against the user's own Cloudflare Worker (see
 * services/syncApi.ts, worker/README.md). Extracted from SettingsPage.tsx
 * as its own component since it's a meaningfully separate, more complex
 * concern than the Default Regulation setting next to it.
 */

import { useState } from 'react';
import type { UseSyncReturn } from '../hooks/useSync';

interface SyncSectionProps {
  syncState: UseSyncReturn;
}

const STATUS_LABEL: Record<UseSyncReturn['status'], string> = {
  'never-synced': 'Never synced',
  'up-to-date': 'Up to date',
  'unpushed-changes': 'Unpushed local changes',
  'unpulled-changes': 'Unpulled changes available',
  unknown: "Status unknown - couldn't reach the sync server",
};

type BlockedAction =
  | { type: 'push'; message: string }
  | { type: 'pull'; message: string }
  | null;

export default function SyncSection({ syncState }: SyncSectionProps) {
  const { syncIdentifier, lastPushedAt, lastPulledAt, isBusy, error, status, createIdentifier, pairExistingIdentifier, forgetIdentifier, push, pull } = syncState;

  const [newUsername, setNewUsername] = useState('');
  const [pairInput, setPairInput] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<BlockedAction>(null);

  const handleCreate = async () => {
    setSetupError(null);
    const result = await createIdentifier(newUsername);
    if (!result.ok) {
      setSetupError(result.message);
    } else {
      setNewUsername('');
    }
  };

  const handlePair = async () => {
    setSetupError(null);
    const result = await pairExistingIdentifier(pairInput);
    if (!result.ok) {
      setSetupError(result.message);
    } else {
      setPairInput('');
    }
  };

  const handlePush = async (force = false) => {
    setBlocked(null);
    const result = await push({ force });
    if (!result.ok && result.reason === 'needs-pull-first') {
      setBlocked({ type: 'push', message: `The remote data is newer than what you've pulled (saved ${new Date(result.remoteSavedAt).toLocaleString()}). Pull first to avoid losing it.` });
    }
  };

  const handlePull = async (force = false) => {
    setBlocked(null);
    const result = await pull({ force });
    if (!result.ok && result.reason === 'needs-push-first') {
      setBlocked({ type: 'pull', message: `You have local changes that haven't been pushed (as of ${new Date(result.localModifiedAt).toLocaleString()}). Push first to avoid losing them.` });
    }
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h2 className="text-sm font-semibold text-gray-200">Cross-Device Sync</h2>
      <p className="mt-1 text-xs text-gray-400">
        Manually push/pull your teams and battle logs to your own sync server. Nothing syncs automatically.
      </p>

      {!syncIdentifier ? (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Create a new sync identifier</label>
            <div className="flex gap-2">
              <input
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="username"
                className="flex-1 px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCreate}
                disabled={!newUsername.trim()}
                className="px-3 py-1.5 text-xs font-bold rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Or pair with an identifier from another device</label>
            <div className="flex gap-2">
              <input
                value={pairInput}
                onChange={e => setPairInput(e.target.value)}
                placeholder="username#1234"
                className="flex-1 px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handlePair}
                disabled={!pairInput.trim()}
                className="px-3 py-1.5 text-xs font-bold rounded bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Pair
              </button>
            </div>
          </div>
          {setupError && <p className="text-xs text-red-400">{setupError}</p>}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400">Identifier: </span>
              <span className="text-sm font-mono text-gray-100">{syncIdentifier}</span>
            </div>
            <button
              onClick={forgetIdentifier}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
            >
              Forget
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Status:</span>
            <span className={status === 'up-to-date' ? 'text-green-400' : status === 'unknown' ? 'text-gray-500' : 'text-yellow-400'}>
              {STATUS_LABEL[status]}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handlePush()}
              disabled={isBusy}
              className="px-3 py-1.5 text-xs font-bold rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isBusy ? 'Working...' : 'Push'}
            </button>
            <button
              onClick={() => handlePull()}
              disabled={isBusy}
              className="px-3 py-1.5 text-xs font-bold rounded bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isBusy ? 'Working...' : 'Pull'}
            </button>
          </div>

          {lastPushedAt && <p className="text-[11px] text-gray-500">Last pushed: {new Date(lastPushedAt).toLocaleString()}</p>}
          {lastPulledAt && <p className="text-[11px] text-gray-500">Last pulled: {new Date(lastPulledAt).toLocaleString()}</p>}

          {blocked && (
            <div className="rounded border border-yellow-700 bg-yellow-900/30 p-2 flex flex-col gap-2">
              <p className="text-xs text-yellow-300">{blocked.message}</p>
              <div className="flex gap-2">
                {blocked.type === 'push' ? (
                  <>
                    <button onClick={() => handlePull()} className="px-2 py-1 text-[11px] font-bold rounded bg-gray-700 text-gray-200 hover:bg-gray-600 cursor-pointer">Pull first</button>
                    <button onClick={() => handlePush(true)} className="px-2 py-1 text-[11px] font-bold rounded bg-red-900 text-red-200 hover:bg-red-800 cursor-pointer">Push anyway</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handlePush()} className="px-2 py-1 text-[11px] font-bold rounded bg-gray-700 text-gray-200 hover:bg-gray-600 cursor-pointer">Push first</button>
                    <button onClick={() => handlePull(true)} className="px-2 py-1 text-[11px] font-bold rounded bg-red-900 text-red-200 hover:bg-red-800 cursor-pointer">Pull anyway</button>
                  </>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
