#!/usr/bin/env node
// "Mobile Web" preview - the third UI mode alongside `npm run dev` (desktop
// Electron app, :5173) and `npm run dev:web` (desktop-width browser, :5174).
// Opens a real Chrome window emulating a phone viewport against the web dev
// server, using playwright-core's system-Chrome driver (channel: 'chrome')
// instead of a separately downloaded Chromium build - same dependency
// .claude/skills/run-desktop/driver.mjs already relies on to drive the
// Electron app, just pointed at a plain browser context here.
//
// Self-starts `vite --config web/vite.config.ts` if nothing's already
// answering on :5174 (one command, no second terminal needed) and tears
// that child process down on exit - but if a dev:web server is already
// running (e.g. you're also testing desktop-width web in another terminal),
// reuses it and leaves it alone rather than fighting over the port.

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
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
  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', '--config', 'web/vite.config.ts'],
    {
      cwd: APP_DIR,
      stdio: 'inherit',
    },
  );
  const up = await waitForServer();
  if (!up) {
    console.error(`Timed out waiting for ${WEB_DEV_URL} to come up.`);
    child.kill();
    process.exit(1);
  }
  return child;
}

async function main() {
  const reusingExisting = await isServerUp();
  const ownWebServer = reusingExisting ? null : await startOwnWebServer();
  if (reusingExisting) console.log(`Reusing already-running dev:web server at ${WEB_DEV_URL}`);

  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: USER_AGENT,
  });
  const page = await context.newPage();
  await page.goto(WEB_DEV_URL);

  console.log(`Mobile Web preview open at ${VIEWPORT.width}x${VIEWPORT.height} -> ${WEB_DEV_URL}`);
  console.log('Close the browser window to exit.');

  const cleanup = () => {
    if (ownWebServer) ownWebServer.kill();
  };
  // Ctrl+C in the terminal is the other exit path besides closing the
  // browser window below - without this, a self-started vite child is
  // left orphaned holding :5174.
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  // Fires when the user closes the window (last page closes the browser
  // process) - not just on an explicit browser.close() call.
  await new Promise((resolve) => browser.on('disconnected', resolve));
  cleanup();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
