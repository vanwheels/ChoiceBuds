/**
 * IPC handler for publishing a pokepast.es paste from the main process.
 */

import { ipcMain } from 'electron';
import https from 'https';

export function registerPokepasteHandlers(): void {
  /**
   * Creates a new pokepast.es paste and returns its URL, or null on failure.
   * Proxied through the main process because pokepast.es/create's response
   * carries no CORS headers - a renderer-side fetch() could never read back
   * the Location header pointing at the new paste's id, even though the POST
   * itself succeeds. Main-process network calls aren't subject to browser
   * CORS at all, so this sidesteps the problem entirely. See CLAUDE.md's
   * external-integration policy for this exception.
   *
   * Uses Node's raw https.request() rather than fetch() - WHATWG fetch's
   * redirect handling returns an opaque-redirect response with headers
   * hidden by spec once a manual redirect is requested (applies in Node too,
   * via undici), so fetch() can't read res.headers.location either. Raw
   * https.request() has no such filtering.
   */
  ipcMain.handle('pokepaste:create', async (_event, payload: { paste: string; title?: string; author?: string; notes?: string }) => {
    const body = new URLSearchParams({
      paste: payload.paste,
      title: payload.title ?? '',
      author: payload.author ?? '',
      notes: payload.notes ?? '',
    }).toString();

    return new Promise<string | null>((resolve) => {
      const req = https.request(
        {
          hostname: 'pokepast.es',
          path: '/create',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          const location = res.headers.location;
          res.resume(); // drain the response body, we only need the header
          if (res.statusCode === 303 && location) {
            resolve(`https://pokepast.es${location}`);
          } else {
            console.error(`Pokepaste create failed: status ${res.statusCode}`);
            resolve(null);
          }
        }
      );

      req.on('error', (err) => {
        console.error('Error creating Pokepaste:', err);
        resolve(null);
      });

      req.write(body);
      req.end();
    });
  });
}
