/**
 * syncApi.ts - Cross-Device Sync Worker Client
 * Talks to the small self-run Cloudflare Worker in worker/ (see its README
 * for deployment) - PUT/GET a single JSON blob per pairing identifier.
 *
 * Deliberately deviates from pokeapi.ts/pokepaste.ts's no-timeout convention
 * with an AbortController: this Worker is infrastructure the user runs
 * themselves, so a lapsed/torn-down deployment is a real possibility, unlike
 * a flaky third-party API - a hung fetch here would otherwise freeze the
 * Settings UI with no feedback.
 */

import type { SyncPayload } from '../types/pokemon';

/** Placeholder until the user deploys their own Worker - see worker/README.md */
const SYNC_WORKER_URL = 'https://choicebuds-sync.YOUR-SUBDOMAIN.workers.dev';

const REQUEST_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Sync server took too long to respond - check your connection and try again');
    }
    throw new Error('Could not reach the sync server - check your connection and try again');
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function pushSyncData(identifier: string, payload: SyncPayload): Promise<void> {
  const response = await fetchWithTimeout(`${SYNC_WORKER_URL}/sync/${encodeURIComponent(identifier)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Push failed (${response.status})`);
  }
}

/** Returns null if no data has ever been pushed under this identifier */
export async function pullSyncData(identifier: string): Promise<SyncPayload | null> {
  const response = await fetchWithTimeout(`${SYNC_WORKER_URL}/sync/${encodeURIComponent(identifier)}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Pull failed (${response.status})`);
  }

  return response.json();
}
