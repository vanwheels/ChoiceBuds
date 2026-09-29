/**
 * SyncSection.tsx - Cross-Device Sync UI
 * Sign up / log in against the user's own Cloudflare Worker (see
 * services/syncApi.ts, worker/README.md) - sync itself then runs
 * automatically in the background (useSync.ts), with "Sync Now" here as a
 * manual fallback. Extracted from SettingsPage.tsx as its own component
 * since it's a meaningfully separate, more complex concern than the Default
 * Regulation setting next to it.
 */

import { useState } from 'react';
import type { UseSyncReturn } from '../hooks/useSync';

interface SyncSectionProps {
  syncState: UseSyncReturn;
}

const STATUS_LABEL: Record<UseSyncReturn['status'], string> = {
  'signed-out': 'Not signed in',
  idle: 'Up to date',
  syncing: 'Syncing...',
  error: "Couldn't reach the sync server",
};

export default function SyncSection({ syncState }: SyncSectionProps) {
  const { syncUsername, lastSyncedAt, error, status, signUp, logIn, logOut, syncNow } = syncState;

  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setSetupError(null);
    if (signupPassword !== signupPasswordConfirm) {
      setSetupError('Passwords do not match');
      return;
    }
    const result = await signUp(signupUsername, signupPassword, signupEmail.trim() || undefined);
    if (!result.ok) {
      setSetupError(result.message);
    } else {
      setSignupUsername('');
      setSignupPassword('');
      setSignupPasswordConfirm('');
      setSignupEmail('');
    }
  };

  const handleLogIn = async () => {
    setSetupError(null);
    const result = await logIn(loginUsername, loginPassword);
    if (!result.ok) {
      setSetupError(result.message);
    } else {
      setLoginUsername('');
      setLoginPassword('');
    }
  };

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Cross-Device Sync</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Your teams, battle logs, and Box syncs automatically to your own sync
        server in the background. "Sync Now" below is a manual fallback.
      </p>

      {!syncUsername ? (
        <div className="mt-3 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Sign up</label>
            <div className="flex flex-col gap-2">
              <input
                value={signupUsername}
                onChange={e => setSignupUsername(e.target.value)}
                placeholder="username"
                className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
              />
              <input
                type="password"
                value={signupPassword}
                onChange={e => setSignupPassword(e.target.value)}
                placeholder="password (min 8 characters)"
                className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
              />
              <input
                type="password"
                value={signupPasswordConfirm}
                onChange={e => setSignupPasswordConfirm(e.target.value)}
                placeholder="confirm password"
                className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
              />
              <input
                value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)}
                placeholder="email (optional, for a future password reset)"
                className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
              />
              <button
                onClick={handleSignUp}
                disabled={!signupUsername.trim() || !signupPassword}
                className="px-3 py-1.5 text-xs font-bold rounded bg-accent-gold text-zinc-900 hover:bg-accent-gold-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer self-start"
              >
                Sign up
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Or log in on this device</label>
            <div className="flex flex-col gap-2">
              <input
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                placeholder="username"
                className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
              />
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="password"
                className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
              />
              <button
                onClick={handleLogIn}
                disabled={!loginUsername.trim() || !loginPassword}
                className="px-3 py-1.5 text-xs font-bold rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer self-start"
              >
                Log in
              </button>
            </div>
          </div>
          {setupError && <p className="text-xs text-red-400">{setupError}</p>}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400">Signed in as: </span>
              <span className="text-sm font-mono text-zinc-100">{syncUsername}</span>
            </div>
            <button
              onClick={logOut}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Log out
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400">Status:</span>
            <span className={status === 'idle' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-zinc-500'}>
              {STATUS_LABEL[status]}
            </span>
          </div>

          <button
            onClick={() => syncNow()}
            disabled={status === 'syncing'}
            className="px-3 py-1.5 text-xs font-bold rounded bg-accent-gold text-zinc-900 hover:bg-accent-gold-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer self-start"
          >
            {status === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </button>

          {lastSyncedAt && <p className="text-[11px] text-zinc-500">Last synced: {new Date(lastSyncedAt).toLocaleString()}</p>}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
