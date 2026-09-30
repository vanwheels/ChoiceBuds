/**
 * WebAuthScreen.tsx - Sign Up / Log In Modal
 * Opened from AppWeb.tsx's sidebar "Sign in to sync" prompt - signing in is
 * opt-in on web, same as desktop (Teams/Box/the calc all work fully
 * signed-out, stored only in this browser's IndexedDB). This just turns on
 * `useSync`'s background sync; it's never a gate on using the app. Reuses
 * useSync.ts's signUp/logIn exactly as SyncSection.tsx does; this is a
 * dismissible modal instead of a Settings-page card.
 */

import { useState } from 'react';
import type { UseSyncReturn } from '../hooks/useSync';

interface WebAuthScreenProps {
  syncState: UseSyncReturn;
  onClose: () => void;
}

type Mode = 'signup' | 'login';

export default function WebAuthScreen({ syncState, onClose }: WebAuthScreenProps) {
  const { signUp, logIn } = syncState;

  const [mode, setMode] = useState<Mode>('signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    const result = mode === 'signup'
      ? await signUp(username, password, email.trim() || undefined)
      : await logIn(username, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-800 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h1 className="text-lg font-bold text-zinc-100">Sign in to sync</h1>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          {mode === 'signup'
            ? 'Create an account to sync your teams, Box, and settings across devices.'
            : 'Log in to pull your teams and Box down to this device.'}
        </p>

        <div className="mt-4 flex gap-1 rounded-lg bg-zinc-900 p-1">
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 rounded px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'signup' ? 'bg-accent-gold text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 rounded px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'login' ? 'bg-accent-gold text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Log in
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="username"
            autoComplete="username"
            className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'password (min 8 characters)' : 'password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
          />
          {mode === 'signup' && (
            <>
              <input
                type="password"
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                placeholder="confirm password"
                autoComplete="new-password"
                className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
              />
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email (optional, for a future password reset)"
                autoComplete="email"
                className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
              />
            </>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || !username.trim() || !password}
            className="mt-1 px-3 py-1.5 text-xs font-bold rounded bg-accent-gold text-zinc-900 hover:bg-accent-gold-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isSubmitting ? (mode === 'signup' ? 'Signing up...' : 'Logging in...') : (mode === 'signup' ? 'Sign up' : 'Log in')}
          </button>
        </form>
      </div>
    </div>
  );
}
