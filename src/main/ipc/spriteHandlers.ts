/**
 * IPC handlers for the local sprite cache - checking whether a remote sprite
 * URL has already been downloaded, and downloading/caching it if not.
 */

import { ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getUserDataPath } from '../paths';

/**
 * Get (and ensure exists) the local sprite cache directory
 */
async function getSpriteCacheDir(): Promise<string> {
  const dir = path.join(getUserDataPath(), 'sprites');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Deterministic local filename for a remote sprite URL - hashed so it's
 * filesystem-safe regardless of the URL's own path structure, keeping the
 * original extension (.png for the PokeAPI/sprites hotlink, .gif for
 * Showdown's animated sprite CDN - see utils/spriteUrl.ts::getAnimatedSpriteUrl)
 * for sanity.
 */
function getSpriteCacheFilename(remoteUrl: string): string {
  const hash = crypto.createHash('sha1').update(remoteUrl).digest('hex');
  const ext = path.extname(new URL(remoteUrl).pathname) || '.png';
  return `${hash}${ext}`;
}

/**
 * data: URLs (not file:// paths) - the renderer loads the app from
 * http://localhost:5173 in development, and Chromium blocks file:// loads
 * from an http: page ("Not allowed to load local resource"). data: URLs
 * work unconditionally regardless of the page's origin/loading scheme, in
 * both dev and the packaged file:// build.
 */
function fileToDataUrl(filePath: string, buffer: Buffer): string {
  const ext = path.extname(filePath).slice(1).toLowerCase() || 'png';
  return `data:image/${ext};base64,${buffer.toString('base64')}`;
}

export function registerSpriteHandlers(): void {
  /**
   * Check whether a sprite for the given remote URL is already cached locally.
   * Returns a data: URL if so, otherwise null (never fetches).
   */
  ipcMain.handle('sprite:get-path', async (_event, remoteUrl: string) => {
    try {
      const dir = await getSpriteCacheDir();
      const filePath = path.join(dir, getSpriteCacheFilename(remoteUrl));
      const buffer = await fs.readFile(filePath);
      return fileToDataUrl(filePath, buffer);
    } catch {
      return null;
    }
  });

  /**
   * Download a sprite from its remote URL and cache it locally, returning it
   * as a data: URL. Idempotent - skips the network request if already cached.
   */
  ipcMain.handle('sprite:download', async (_event, remoteUrl: string) => {
    try {
      const dir = await getSpriteCacheDir();
      const filePath = path.join(dir, getSpriteCacheFilename(remoteUrl));

      try {
        const cachedBuffer = await fs.readFile(filePath);
        return fileToDataUrl(filePath, cachedBuffer);
      } catch {
        // Not cached yet - fall through to download
      }

      const response = await fetch(remoteUrl);
      if (!response.ok) return null;
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      return fileToDataUrl(filePath, buffer);
    } catch (err) {
      console.error(`Error downloading sprite from ${remoteUrl}:`, err);
      return null;
    }
  });
}
