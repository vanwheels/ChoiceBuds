/**
 * syncApi.ts - Cross-Device Sync Worker Client
 * Talks to the small self-run Cloudflare Worker in worker/ (see its README
 * for deployment) - real username/password accounts, authenticated per
 * device via a server-issued opaque bearer token (see worker/src/crypto.ts).
 *
 * Deliberately deviates from pokeapi.ts/pokepaste.ts's no-timeout convention
 * with an AbortController: this Worker is infrastructure the user runs
 * themselves, so a lapsed/torn-down deployment is a real possibility, unlike
 * a flaky third-party API - a hung fetch here would otherwise freeze the
 * Settings UI with no feedback.
 */

import type { SyncPayload } from '../types/pokemon';

const SYNC_WORKER_URL = 'https://choicebuds-sync.vanwheelstheman.workers.dev';

const REQUEST_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Sync server took too long to respond - check your connection and try again', { cause: err });
    }
    throw new Error('Could not reach the sync server - check your connection and try again', { cause: err });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return body?.error || fallback;
}

export async function signup(username: string, password: string, email?: string): Promise<{ token: string }> {
  const response = await fetchWithTimeout(`${SYNC_WORKER_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Sign up failed (${response.status})`));
  }

  const body = await response.json();
  return { token: body.token };
}

export async function login(username: string, password: string): Promise<{ token: string }> {
  const response = await fetchWithTimeout(`${SYNC_WORKER_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Log in failed (${response.status})`));
  }

  const body = await response.json();
  return { token: body.token };
}

/**
 * PUTs this device's local state and returns the Worker's merged result
 * (see worker/src/index.ts) - the Worker merges per-record instead of
 * overwriting, so this doubles as a pull: the response is the full
 * authoritative post-merge SyncPayload, not just an acknowledgement.
 */
export async function pushSyncData(username: string, token: string, payload: SyncPayload): Promise<SyncPayload> {
  const response = await fetchWithTimeout(`${SYNC_WORKER_URL}/sync/${encodeURIComponent(username)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Sync failed (${response.status})`));
  }

  return response.json();
}

/** Returns null if no data has ever been pushed under this account */
export async function pullSyncData(username: string, token: string): Promise<SyncPayload | null> {
  const response = await fetchWithTimeout(`${SYNC_WORKER_URL}/sync/${encodeURIComponent(username)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Pull failed (${response.status})`));
  }

  return response.json();
}
