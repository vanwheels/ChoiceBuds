#!/usr/bin/env node
// "Mobile Web" preview - the third UI mode alongside `npm run dev` (desktop
// Electron app, :5173) and `npm run dev:web` (desktop-width browser, :5174).
// Opens a real Chrome window emulating a phone viewport against the same
// web dev server, using playwright-core's system-Chrome driver
// (channel: 'chrome') instead of a separately downloaded Chromium build -
// same dependency .claude/skills/run-desktop/driver.mjs already relies on
// to drive the Electron app, just pointed at a plain browser context here.
//
// Requires `npm run dev:web` already running on http://localhost:5174 -
// same "bring your own running server" convention driver.mjs's own
// Prerequisites section uses for the Electron app on :5173, rather than
// this script also owning a second dev-server process to manage/tear down.

import { chromium } from 'playwright-core';

const WEB_DEV_URL = 'http://localhost:5174';

// iPhone-ish viewport - matches the 375px phone-width convention already
// established by TeamCard.tsx's own @[380px]/@[600px] container-query
// breakpoints and the live mobile verification passes recorded in TODO.md.
const VIEWPORT = { width: 375, height: 812 };
const USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function assertServerUp() {
  try {
    await fetch(WEB_DEV_URL, { signal: AbortSignal.timeout(2000) });
  } catch {
    console.error(
      `\nNo dev server answering at ${WEB_DEV_URL}.\n` +
        `Start it first in another terminal: npm run dev:web\n`,
    );
    process.exit(1);
  }
}

async function main() {
  await assertServerUp();

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

  // Fires when the user closes the window (last page closes the browser
  // process) - not just on an explicit browser.close() call.
  await new Promise((resolve) => browser.on('disconnected', resolve));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
