// REPL driver for ChoiceBuds (Electron + Vite dev server). Windows, no
// xvfb needed - Electron just opens a real window. Designed for agents:
// run as a background Bash task, send commands over stdin, read the
// output file for results (console errors included, not just DOM state).
//
// Requires `npm run dev` (the Vite dev server + its own auto-launched
// Electron window) already running on http://localhost:5173 - this
// driver launches ITS OWN separate Electron instance pointed at the same
// dev server, so you get a Playwright-controlled window independent of
// whatever's on screen. There's no singleInstanceLock in main.ts, so both
// can run at once without conflict (they do share the same userData dir
// for teams.json/battles.json - fine for reads, be aware for writes).

import { _electron as electron } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

const APP_DIR = path.resolve(import.meta.dirname, '../../..');
const SHOT_DIR = process.env.SCREENSHOT_DIR || path.join(APP_DIR, '.claude/skills/run-desktop/shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

let app = null;
let page = null;

// The electron npm package's own dist/ binary name is platform-specific
// (electron.exe on Windows, Electron.app/Contents/MacOS/Electron on macOS,
// electron on Linux) - it's recorded in node_modules/electron/path.txt by
// its postinstall. Hardcoding "electron.exe" only works on Windows; read
// path.txt the same way the electron package's own index.js does so this
// resolves correctly on every platform.
const electronPathFile = path.join(APP_DIR, 'node_modules/electron/path.txt');
const electronBin = path.join(APP_DIR, 'node_modules/electron/dist', fs.readFileSync(electronPathFile, 'utf-8'));

const COMMANDS = {
  async launch() {
    if (app) return console.log('already launched');
    // ELECTRON_RUN_AS_NODE (often set in this shell's environment) makes
    // electron.exe boot as a plain Node process instead of a full Electron
    // app - no window, no CDP handshake, Playwright's launch() just times
    // out. Strip it defensively rather than relying on callers to unset it.
    const env = { ...process.env, NODE_ENV: 'development' };
    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({
      executablePath: electronBin,
      args: [APP_DIR, '--no-sandbox'],
      env,
      timeout: 30_000,
    });
    page = await app.firstWindow();
    page.on('console', msg => console.log('[console]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[pageerror]', err.message));
    await page.waitForLoadState('domcontentloaded');
    console.log('launched.', app.windows().length, 'window(s):', page.url());
  },

  async ss(name) {
    if (!page) return console.log('ERROR: launch first');
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png');
    await page.screenshot({ path: f });
    console.log('screenshot:', f);
  },

  async click(sel) {
    if (!page) return console.log('ERROR: launch first');
    const r = await page.evaluate(s => {
      const el = document.querySelector(s);
      if (!el) return 'NOT_FOUND';
      el.click(); return 'OK';
    }, sel);
    console.log('click', sel, '->', r);
  },

  // Most of this app's "clickable rows" are plain divs/buttons with an
  // onClick, often wrapped in a parent (li > button) whose text is
  // identical - clicking an ANCESTOR does nothing (bubbling only goes up,
  // never down into descendants), so this must prefer the DEEPEST element
  // with matching text, not just the smallest text.
  async 'click-text'(text) {
    if (!page) return console.log('ERROR: launch first');
    const r = await page.evaluate(t => {
      const all = [...document.querySelectorAll('body *')];
      const exact = all.filter(e => e.textContent?.trim() === t);
      const candidates = exact.length > 0 ? exact : all.filter(e => e.textContent?.includes(t));
      if (candidates.length === 0) return 'NOT_FOUND';
      const depth = el => { let d = 0, n = el; while (n.parentElement) { d++; n = n.parentElement; } return d; };
      const el = candidates.reduce((a, b) => (depth(b) > depth(a) ? b : a));
      el.click(); return 'OK: ' + el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : '');
    }, text);
    console.log('click-text', JSON.stringify(text), '->', r);
  },

  async type(text)  { if (page) await page.keyboard.type(text, { delay: 30 }); },
  async press(key)  { if (page) await page.keyboard.press(key); },

  async wait(sel) {
    if (!page) return console.log('ERROR: launch first');
    try { await page.waitForSelector(sel, { timeout: 10_000 }); console.log('found:', sel); }
    catch { console.log('TIMEOUT:', sel); }
  },

  async eval(expr) {
    if (!page) return console.log('ERROR: launch first');
    try { console.log(JSON.stringify(await page.evaluate(expr))); }
    catch (e) { console.log('ERROR:', e.message); }
  },

  async text(sel) {
    if (!page) return console.log('ERROR: launch first');
    console.log(await page.evaluate(
      s => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)',
      sel || null));
  },

  async windows() {
    if (!app) return console.log('ERROR: launch first');
    for (const w of app.windows()) console.log(' ', w.url());
  },

  async quit() { if (app) await app.close().catch(() => {}); app = null; page = null; },
  help() { console.log('commands:', Object.keys(COMMANDS).join(', ')); },
};

// A heredoc/pipe delivers all commands in one stdin chunk. readline's
// 'line' event fires for every buffered line synchronously as part of one
// internal loop, regardless of pause()/async awaits in earlier handlers -
// so a naive `rl.on('line', async ...)` runs all commands concurrently
// instead of in order. Reading all of stdin up front and processing lines
// one at a time in a real for-loop sidesteps that entirely.
async function readAllStdin() {
  const chunks = [];
  for await (const chunk of fs.createReadStream(null, { fd: 0 })) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function runLine(line) {
  const [cmd, ...rest] = line.trim().split(/\s+/);
  if (!cmd) return;
  const fn = COMMANDS[cmd];
  if (!fn) return console.log('unknown:', cmd, '- try: help');
  try { await fn(rest.join(' ')); } catch (e) { console.log('ERROR:', e.message); }
}

console.log('ChoiceBuds driver - "help" for commands, "launch" to start');
const input = await readAllStdin();
for (const line of input.split(/\r?\n/)) {
  if (!line.trim()) continue;
  console.log('driver>', line);
  await runLine(line);
  if (line.trim() === 'quit') break;
}
await COMMANDS.quit();
process.exit(0);
