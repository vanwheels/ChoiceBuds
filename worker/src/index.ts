/**
 * ChoiceBuds cross-device sync Worker
 *
 * Real username + password accounts, keyed in Workers KV (single SYNC_KV
 * binding, prefixed keys - see README.md for the full key scheme). A device
 * authenticates with a server-issued opaque bearer token, not the password
 * itself: signup/login return a random token and the Worker stores only its
 * hash, so a compromised device never hands over a password the user might
 * have reused elsewhere. Multiple devices stay signed in independently -
 * login does not invalidate another device's token.
 *
 * Endpoints:
 *   POST /signup            - {username, password, email?} -> {ok, token}
 *   POST /login              - {username, password} -> {ok, token}
 *   PUT  /sync/:username     - Bearer token + body {teams, battles, savedAt}
 *   GET  /sync/:username     - Bearer token -> stored SyncPayload, 404 if none
 */

import { hashPassword, verifyPassword, generateToken, hashToken, constantTimeEqual, isValidUsername, isValidPassword, type PasswordHash } from './crypto';

export interface Env {
  SYNC_KV: KVNamespace;
}

interface Account {
  username: string; // display case
  passwordHash: string;
  passwordSalt: string;
  email: string | null;
  createdAt: number;
}

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

  let parsed: { savedAt?: unknown };
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return errorResponse('Body must be valid JSON', 400);
  }

  if (typeof parsed.savedAt !== 'number') {
    return errorResponse('Body must include a numeric "savedAt"', 400);
  }

  // Throttle on the server's own record of when it last accepted a write for
  // this account (KV metadata, never sent by the client) - using the
  // client-supplied savedAt would let a client bypass the throttle by lying.
  const { metadata } = await env.SYNC_KV.getWithMetadata<{ receivedAt: number }>(syncKey(lowerUsername));
  if (metadata && Date.now() - metadata.receivedAt < MIN_WRITE_INTERVAL_MS) {
    return errorResponse('Writing too frequently - try again shortly', 429);
  }

  await env.SYNC_KV.put(syncKey(lowerUsername), bodyText, { metadata: { receivedAt: Date.now() } });
  return jsonResponse({ ok: true });
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
