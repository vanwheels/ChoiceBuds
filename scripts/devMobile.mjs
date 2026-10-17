#!/usr/bin/env node
// "Mobile Web" preview - the third UI mode alongside `npm run dev` (desktop
// Electron app, :5173) and `npm run dev:web` (desktop-width browser, :5174).
// Opens a real Chromium-based browser emulating a phone viewport against the
// web dev server, using playwright-core (no separately downloaded Chromium
// build - same package `.claude/skills/run-desktop/driver.mjs` already
// depends on, there to drive the Electron app directly instead). Prefers
// system Chrome via playwright's `channel: 'chrome'`; falls back to a
// locally installed Opera GX (also Chromium-based) via `executablePath` when
// Chrome isn't present - confirmed live 2026-10-17 as the actual browser on
// Vanny's dev machine.
//
// Self-starts `vite --config web/vite.config.ts` if nothing's already
// answering on :5174 (one command, no second terminal needed) and tears
// that child process down on exit - but if a dev:web server is already
// running (e.g. you're also testing desktop-width web in another terminal),
// reuses it and leaves it alone rather than fighting over the port.

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_DEV_URL = 'http://localhost:5174';
const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// iPhone-ish viewport - matches the 375px phone-width convention already
// established by TeamCard.tsx's own @[380px]/@[600px] container-query
// breakpoints and the live mobile verification passes recorded in TODO.md.
const VIEWPORT = { width: 375, height: 812 };
const USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function isServerUp() {
  try {
    await fetch(WEB_DEV_URL, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerUp()) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

// Only kills the Vite child this script itself spawned - a server someone
// else is already running (e.g. a `dev:web` left open in another terminal)
// is never touched.
async function startOwnWebServer() {
  console.log('No dev:web server running - starting one (vite --config web/vite.config.ts)...');
  // Spawns Vite's own bin script via `node` directly rather than through the
  // `npx`/`npx.cmd` shim - Node 24 on Windows throws `spawn EINVAL` for a
  // bare `.cmd` target without `shell: true`, and `shell: true` would wrap
  // the real Vite process inside a `cmd.exe` that this script's own
  // `child.kill()` below can't reach, orphaning it on exit instead.
  const viteBin = path.resolve(APP_DIR, 'node_modules/vite/bin/vite.js');
  const child = spawn(process.execPath, [viteBin, '--config', 'web/vite.config.ts'], {
    cwd: APP_DIR,
    stdio: 'inherit',
  });
  const up = await waitForServer();
  if (!up) {
    console.error(`Timed out waiting for ${WEB_DEV_URL} to come up.`);
    child.kill();
    process.exit(1);
  }
  return child;
}

// Opera GX's install path isn't on any playwright-recognized `channel` (that
// list only covers Chrome/Edge), so it's launched via `executablePath`
// instead - resolved through %LOCALAPPDATA% rather than hardcoding a
// username.
function findOperaGxPath() {
  if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) return null;
  const operaPath = path.join(process.env.LOCALAPPDATA, 'Programs', 'Opera GX', 'opera.exe');
  return existsSync(operaPath) ? operaPath : null;
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: false });
  } catch (err) {
    const operaPath = findOperaGxPath();
    if (!operaPath) throw err;
    console.log("System Chrome not found - falling back to this machine's Opera GX...");
    return chromium.launch({ executablePath: operaPath, headless: false });
  }
}

async function main() {
  const reusingExisting = await isServerUp();
  const ownWebServer = reusingExisting ? null : await startOwnWebServer();
  if (reusingExisting) console.log(`Reusing already-running dev:web server at ${WEB_DEV_URL}`);

  // Registered before the browser launch (which can throw, e.g. no Chrome
  // and no Opera GX fallback found) so a self-started vite child never gets
  // orphaned holding :5174, even on a failed launch - not just on the two
  // success-path exits below.
  const cleanup = () => {
    if (ownWebServer) ownWebServer.kill();
  };
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  try {
    const browser = await launchBrowser();
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: USER_AGENT,
    });
    const page = await context.newPage();
    await page.goto(WEB_DEV_URL);

    console.log(
      `Mobile Web preview open at ${VIEWPORT.width}x${VIEWPORT.height} -> ${WEB_DEV_URL}`,
    );
    console.log('Close the browser window to exit.');

    // Fires when the user closes the window (last page closes the browser
    // process) - not just on an explicit browser.close() call.
    await new Promise((resolve) => browser.on('disconnected', resolve));
  } finally {
    cleanup();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
