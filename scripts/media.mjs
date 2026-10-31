#!/usr/bin/env node
// `npm run media` - regenerates docs/media/*.png from the fixed demo dataset
// (scripts/media/demoData.mjs), never real user data. Starts the web dev
// server if it isn't already up, seeds a fresh browser context's IndexedDB,
// then screenshots each screen at a fixed viewport. File names describe the
// screen, so reruns replace files without touching README links.

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_TEAMS_DATABASE } from './media/demoData.mjs';

const WEB_URL = 'http://localhost:5174';
const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(APP_DIR, 'docs', 'media');

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 375, height: 812 };

/** Screens to capture. `tab` is the sidebar label to click first (null = landing tab). */
const SHOTS = [
  { name: 'teams.png', viewport: DESKTOP, tab: null },
  { name: 'type-matchup.png', viewport: DESKTOP, tab: 'Type Matchup' },
  { name: 'speed-tiers.png', viewport: DESKTOP, tab: 'Speed Tiers' },
  { name: 'teams-mobile.png', viewport: PHONE, tab: null, mobile: true },
];

async function isUp() {
  try {
    await fetch(WEB_URL, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await isUp()) return null;
  console.log('Starting web dev server...');
  // Runs Vite's bin directly: Node on Windows can't spawn a .cmd shim without
  // a shell, and a shell would orphan the real process on kill (see devMobile.mjs).
  const child = spawn(
    process.execPath,
    [path.join(APP_DIR, 'node_modules/vite/bin/vite.js'), '--config', 'web/vite.config.ts'],
    { cwd: APP_DIR, stdio: 'ignore' },
  );
  for (let i = 0; i < 100; i++) {
    if (await isUp()) return child;
    await new Promise((r) => setTimeout(r, 300));
  }
  child.kill();
  throw new Error(`Timed out waiting for ${WEB_URL}`);
}

async function launch() {
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch (err) {
    const opera =
      process.env.LOCALAPPDATA &&
      path.join(process.env.LOCALAPPDATA, 'Programs', 'Opera GX', 'opera.exe');
    if (!opera || !existsSync(opera)) throw err;
    return chromium.launch({ executablePath: opera });
  }
}

async function seed(page) {
  await page.goto(WEB_URL);
  await page.evaluate(
    (db) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('choicebuds', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onsuccess = () => {
          const tx = req.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(db, 'teams-database');
          tx.oncomplete = () => {
            req.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      }),
    DEMO_TEAMS_DATABASE,
  );
}

async function capture(browser, shot) {
  // Fresh context per shot: empty storage every time, so no run depends on the last.
  const context = await browser.newContext({
    viewport: shot.viewport,
    deviceScaleFactor: 1,
    ...(shot.mobile ? { isMobile: true, hasTouch: true } : {}),
  });
  const page = await context.newPage();
  await seed(page);
  await page.reload();
  await page.getByText('My Teams', { exact: true }).filter({ visible: true }).waitFor();
  await page.getByRole('img').filter({ visible: true }).first().waitFor();
  // Desktop only: the expanded card shows full sets (the phone card has no expand control).
  if (!shot.mobile) await page.getByTitle('Expand').first().click();
  if (shot.tab) await page.getByRole('button', { name: shot.tab }).first().click();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(OUT_DIR, shot.name) });
  console.log(`wrote docs/media/${shot.name}`);
  await context.close();
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const server = await ensureServer();
  try {
    const browser = await launch();
    for (const shot of SHOTS) await capture(browser, shot);
    await browser.close();
  } finally {
    if (server) server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
