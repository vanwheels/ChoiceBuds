/**
 * ChoiceBuds cross-device sync Worker
 *
 * Stores one JSON blob per pairing identifier (`username#XXXX`) in Workers
 * KV. Deliberately dumb: no auth beyond knowing the identifier itself (same
 * threat model as a Discord invite link - see TODO.md's cross-device sync
 * design note), no per-user accounts, no server-side identifier allocation
 * (the client generates its own `username#XXXX` and just starts using it).
 *
 * Endpoints:
 *   PUT /sync/:identifier  - body is the JSON SyncPayload {teams, battles, savedAt}
 *   GET /sync/:identifier  - returns the stored SyncPayload, 404 if none
 */

export interface Env {
  SYNC_KV: KVNamespace;
}

const IDENTIFIER_PATTERN = /^[a-zA-Z0-9_]{2,32}#\d{4}$/;
const MAX_BODY_BYTES = 512 * 1024; // team/battle JSON is tiny text - generous even at real scale
const MIN_WRITE_INTERVAL_MS = 3000; // per-identifier throttle, not a real abuse defense (see TODO.md)

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const match = url.pathname.match(/^\/sync\/(.+)$/);

    if (!match) {
      return errorResponse('Not found', 404);
    }

    const identifier = decodeURIComponent(match[1]);
    if (!IDENTIFIER_PATTERN.test(identifier)) {
      return errorResponse('Malformed identifier - expected "username#XXXX"', 400);
    }

    if (request.method === 'GET') {
      const stored = await env.SYNC_KV.get(identifier);
      if (stored === null) {
        return errorResponse('No data found for this identifier', 404);
      }
      return new Response(stored, {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'PUT') {
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

      // Throttle on the server's own record of when it last accepted a
      // write for this identifier (KV metadata, never sent by the client)
      // - using the client-supplied `savedAt` here would let a client
      // bypass the throttle just by lying about it.
      const { metadata } = await env.SYNC_KV.getWithMetadata<{ receivedAt: number }>(identifier);
      if (metadata && Date.now() - metadata.receivedAt < MIN_WRITE_INTERVAL_MS) {
        return errorResponse('Writing too frequently - try again shortly', 429);
      }

      await env.SYNC_KV.put(identifier, bodyText, { metadata: { receivedAt: Date.now() } });
      return jsonResponse({ ok: true });
    }

    return errorResponse('Method not allowed', 405);
  },
};
