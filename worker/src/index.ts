/**
 * ChoiceBuds cross-device sync Worker
 *
 * Real username + password accounts. Low-volume account/token/lockout state
 * lives in Workers KV (SYNC_KV, prefixed keys - see README.md for the full
 * key scheme); the high-frequency per-account sync blob lives in an R2
 * bucket (SYNC_R2) instead, since KV's 1,000 writes/day free-tier cap is
 * shared across every account this Worker serves and a push/pull round trip
 * writes that blob on every sync. A GET/PUT that finds no R2 object yet
 * falls back to the account's legacy KV blob, so already-signed-up accounts
 * migrate onto R2 automatically on their next sync - no bulk-copy step. A
 * device authenticates with a server-issued opaque bearer token, not the
 * password itself: signup/login return a random token and the Worker stores
 * only its hash, so a compromised device never hands over a password the
 * user might have reused elsewhere. Multiple devices stay signed in
 * independently - login does not invalidate another device's token.
 *
 * Endpoints:
 *   POST /signup            - {username, password, email?} -> {ok, token}
 *   POST /login              - {username, password} -> {ok, token}
 *   PUT  /sync/:username     - Bearer token + body: this device's full local
 *                              SyncPayload (each collection + its pending
 *                              tombstones) -> the full merged SyncPayload,
 *                              same shape GET returns. PUT doubles as pull:
 *                              the Worker merges per-record (last-write-wins
 *                              by updatedAt, see merge.ts) instead of
 *                              overwriting, persists the result, and hands
 *                              it straight back so the pushing client
 *                              reconciles in one round trip.
 *   GET  /sync/:username     - Bearer token -> stored (already-merged)
 *                              SyncPayload, 404 if none
 */

import { hashPassword, verifyPassword, generateToken, hashToken, constantTimeEqual, isValidUsername, isValidPassword, type PasswordHash } from './crypto';
import { mergeCollection, type SyncTombstone } from './merge';

export interface Env {
  SYNC_KV: KVNamespace;
  SYNC_R2: R2Bucket;
}

interface Account {
  username: string; // display case
  passwordHash: string;
  passwordSalt: string;
  email: string | null;
  createdAt: number;
}

/** Mirrors the renderer's types/settings.ts::SyncPayload - kept in sync by hand, same as the Account/TokenEntry shapes above mirror the renderer's own concerns. */
interface SyncPayload {
  teams: HasIdAndUpdatedAt[];
  teamTombstones: SyncTombstone[];
  battles: HasIdAndUpdatedAt[];
  battleTombstones: SyncTombstone[];
  savedPokemon: HasIdAndUpdatedAt[];
  savedPokemonTombstones: SyncTombstone[];
  savedAt: number;
}

/** The Worker only ever needs `id`/`updatedAt` to merge a record - the rest of each collection's shape (Team/Battle/SavedPokemonEntry) is opaque to it. */
interface HasIdAndUpdatedAt {
  id: string;
  updatedAt: number;
  [key: string]: unknown;
}

const EMPTY_SYNC_PAYLOAD: SyncPayload = {
  teams: [], teamTombstones: [],
  battles: [], battleTombstones: [],
  savedPokemon: [], savedPokemonTombstones: [],
  savedAt: 0,
};

interface TokenEntry {
  tokenHash: string;
  createdAt: number;
}

const MAX_BODY_BYTES = 512 * 1024; // team/battle JSON is tiny text - generous even at real scale
const MIN_WRITE_INTERVAL_MS = 3000; // per-account throttle on PUT, not a real abuse defense
const MAX_TOKENS_PER_ACCOUNT = 10; // one per signed-in device; oldest evicted beyond this
const LOGIN_FAIL_LIMIT = 10;
const LOGIN_FAIL_WINDOW_SECONDS = 15 * 60;
const SIGNUP_THROTTLE_SECONDS = 60; // KV's expirationTtl floor is 60s

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function accountKey(lowerUsername: string): string {
  return `account:${lowerUsername}`;
}
function tokensKey(lowerUsername: string): string {
  return `tokens:${lowerUsername}`;
}
function syncKey(lowerUsername: string): string {
  return `sync:${lowerUsername}`;
}
function loginFailKey(lowerUsername: string): string {
  return `loginfail:${lowerUsername}`;
}
function signupThrottleKey(ip: string): string {
  return `signupthrottle:${ip}`;
}

async function getAccount(env: Env, lowerUsername: string): Promise<Account | null> {
  const raw = await env.SYNC_KV.get(accountKey(lowerUsername));
  return raw ? (JSON.parse(raw) as Account) : null;
}

async function getTokens(env: Env, lowerUsername: string): Promise<TokenEntry[]> {
  const raw = await env.SYNC_KV.get(tokensKey(lowerUsername));
  return raw ? (JSON.parse(raw) as TokenEntry[]) : [];
}

async function addToken(env: Env, lowerUsername: string, tokenHash: string): Promise<void> {
  const tokens = await getTokens(env, lowerUsername);
  tokens.push({ tokenHash, createdAt: Date.now() });
  while (tokens.length > MAX_TOKENS_PER_ACCOUNT) tokens.shift();
  await env.SYNC_KV.put(tokensKey(lowerUsername), JSON.stringify(tokens));
}

async function verifyBearerToken(env: Env, lowerUsername: string, request: Request): Promise<boolean> {
  const auth = request.headers.get('Authorization') ?? '';
  const match = auth.match(/^Bearer (.+)$/);
  if (!match) return false;

  const presentedHash = await hashToken(match[1]);
  const tokens = await getTokens(env, lowerUsername);
  return tokens.some(t => constantTimeEqual(t.tokenHash, presentedHash));
}

async function isLoginLocked(env: Env, lowerUsername: string): Promise<boolean> {
  const raw = await env.SYNC_KV.get(loginFailKey(lowerUsername));
  return raw !== null && Number(raw) >= LOGIN_FAIL_LIMIT;
}

async function recordLoginFailure(env: Env, lowerUsername: string): Promise<void> {
  const raw = await env.SYNC_KV.get(loginFailKey(lowerUsername));
  const count = raw ? Number(raw) + 1 : 1;
  await env.SYNC_KV.put(loginFailKey(lowerUsername), String(count), { expirationTtl: LOGIN_FAIL_WINDOW_SECONDS });
}

async function clearLoginFailures(env: Env, lowerUsername: string): Promise<void> {
  await env.SYNC_KV.delete(loginFailKey(lowerUsername));
}

async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

async function handleSignup(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const throttled = await env.SYNC_KV.get(signupThrottleKey(ip));
  if (throttled !== null) {
    return errorResponse('Signing up too frequently - try again shortly', 429);
  }

  const body = await readJsonBody<{ username?: unknown; password?: unknown; email?: unknown }>(request);
  if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') {
    return errorResponse('Body must include "username" and "password"', 400);
  }

  if (!isValidUsername(body.username)) {
    return errorResponse('Username must be 2-32 letters, numbers, or underscores', 400);
  }
  if (!isValidPassword(body.password)) {
    return errorResponse('Password must be at least 8 characters', 400);
  }
  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;

  const lowerUsername = body.username.toLowerCase();
  const existing = await getAccount(env, lowerUsername);
  if (existing) {
    return errorResponse('Username is already taken', 409);
  }

  const { hash, salt } = await hashPassword(body.password);
  const account: Account = {
    username: body.username,
    passwordHash: hash,
    passwordSalt: salt,
    email,
    createdAt: Date.now(),
  };
  await env.SYNC_KV.put(accountKey(lowerUsername), JSON.stringify(account));

  const token = generateToken();
  await addToken(env, lowerUsername, await hashToken(token));
  await env.SYNC_KV.put(signupThrottleKey(ip), '1', { expirationTtl: SIGNUP_THROTTLE_SECONDS });

  return jsonResponse({ ok: true, token }, 201);
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody<{ username?: unknown; password?: unknown }>(request);
  if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') {
    return errorResponse('Body must include "username" and "password"', 400);
  }

  const lowerUsername = body.username.toLowerCase();

  if (await isLoginLocked(env, lowerUsername)) {
    return errorResponse('Too many failed login attempts - try again later', 429);
  }

  const account = await getAccount(env, lowerUsername);
  if (!account) {
    await recordLoginFailure(env, lowerUsername);
    return errorResponse('Invalid username or password', 401);
  }

  const stored: PasswordHash = { hash: account.passwordHash, salt: account.passwordSalt };
  const valid = await verifyPassword(body.password, stored);
  if (!valid) {
    await recordLoginFailure(env, lowerUsername);
    return errorResponse('Invalid username or password', 401);
  }

  await clearLoginFailures(env, lowerUsername);
  const token = generateToken();
  await addToken(env, lowerUsername, await hashToken(token));

  return jsonResponse({ ok: true, token });
}

async function handleSyncGet(env: Env, lowerUsername: string, request: Request): Promise<Response> {
  if (!(await verifyBearerToken(env, lowerUsername, request))) {
    return errorResponse('Invalid or missing token', 401);
  }

  const r2Object = await env.SYNC_R2.get(syncKey(lowerUsername));
  if (r2Object !== null) {
    return new Response(await r2Object.text(), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Not yet migrated to R2 (pre-hybrid-storage account) - fall back to the
  // legacy KV blob. The next PUT for this account writes its merge result to
  // R2, so this fallback stops being hit for them after that.
  const stored = await env.SYNC_KV.get(syncKey(lowerUsername));
  if (stored === null) {
    return errorResponse('No data found for this account', 404);
  }
  return new Response(stored, {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function handleSyncPut(env: Env, lowerUsername: string, request: Request): Promise<Response> {
  if (!(await verifyBearerToken(env, lowerUsername, request))) {
    return errorResponse('Invalid or missing token', 401);
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse('Payload too large', 413);
  }

  const bodyText = await request.text();
  if (bodyText.length > MAX_BODY_BYTES) {
    return errorResponse('Payload too large', 413);
  }

  let parsed: Partial<SyncPayload>;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return errorResponse('Body must be valid JSON', 400);
  }

  if (
    !isRecordArray(parsed.teams) || !isTombstoneArray(parsed.teamTombstones) ||
    !isRecordArray(parsed.battles) || !isTombstoneArray(parsed.battleTombstones) ||
    !isRecordArray(parsed.savedPokemon) || !isTombstoneArray(parsed.savedPokemonTombstones)
  ) {
    return errorResponse('Body must include teams/battles/savedPokemon arrays and their tombstone arrays', 400);
  }
  const incoming = parsed as SyncPayload;

  const r2Key = syncKey(lowerUsername);
  const r2Object = await env.SYNC_R2.get(r2Key);

  // Throttle on the server's own record of when it last accepted a write for
  // this account (R2 customMetadata, never sent by the client - string-only,
  // unlike KV's typed metadata param) - using a client-supplied timestamp
  // would let a client bypass the throttle by lying.
  const receivedAt = Number(r2Object?.customMetadata?.receivedAt ?? '0');
  if (r2Object && Date.now() - receivedAt < MIN_WRITE_INTERVAL_MS) {
    return errorResponse('Writing too frequently - try again shortly', 429);
  }

  let existing: SyncPayload;
  if (r2Object) {
    existing = JSON.parse(await r2Object.text());
  } else {
    // No R2 object yet - either a brand-new account, or one not yet migrated
    // off the legacy KV blob. Fall back to KV so an already-signed-up
    // account's data merges forward instead of being overwritten; this
    // write then lands the merge result on R2, completing the migration.
    const kvStored = await env.SYNC_KV.get(r2Key);
    existing = kvStored ? JSON.parse(kvStored) : EMPTY_SYNC_PAYLOAD;
  }

  const teamsMerge = mergeCollection(existing.teams, existing.teamTombstones, incoming.teams, incoming.teamTombstones);
  const battlesMerge = mergeCollection(existing.battles, existing.battleTombstones, incoming.battles, incoming.battleTombstones);
  const savedPokemonMerge = mergeCollection(existing.savedPokemon, existing.savedPokemonTombstones, incoming.savedPokemon, incoming.savedPokemonTombstones);

  const merged: SyncPayload = {
    teams: teamsMerge.records,
    teamTombstones: teamsMerge.tombstones,
    battles: battlesMerge.records,
    battleTombstones: battlesMerge.tombstones,
    savedPokemon: savedPokemonMerge.records,
    savedPokemonTombstones: savedPokemonMerge.tombstones,
    savedAt: Date.now(),
  };

  const mergedText = JSON.stringify(merged);
  await env.SYNC_R2.put(r2Key, mergedText, {
    customMetadata: { receivedAt: String(Date.now()) },
    httpMetadata: { contentType: 'application/json' },
  });
  return new Response(mergedText, {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function isRecordArray(value: unknown): value is HasIdAndUpdatedAt[] {
  return Array.isArray(value) && value.every((v): v is HasIdAndUpdatedAt =>
    typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>).id === 'string' && typeof (v as Record<string, unknown>).updatedAt === 'number'
  );
}

function isTombstoneArray(value: unknown): value is SyncTombstone[] {
  return Array.isArray(value) && value.every((v): v is SyncTombstone =>
    typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>).id === 'string' && typeof (v as Record<string, unknown>).deletedAt === 'number'
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/signup' && request.method === 'POST') {
      return handleSignup(request, env);
    }
    if (url.pathname === '/login' && request.method === 'POST') {
      return handleLogin(request, env);
    }

    const match = url.pathname.match(/^\/sync\/([^/]+)$/);
    if (!match) {
      return errorResponse('Not found', 404);
    }

    const username = decodeURIComponent(match[1]);
    if (!isValidUsername(username)) {
      return errorResponse('Malformed username', 400);
    }
    const lowerUsername = username.toLowerCase();

    if (request.method === 'GET') {
      return handleSyncGet(env, lowerUsername, request);
    }
    if (request.method === 'PUT') {
      return handleSyncPut(env, lowerUsername, request);
    }

    return errorResponse('Method not allowed', 405);
  },
};
