---
name: run-desktop
description: Drive the ChoiceBuds Electron app for automated UI testing (click, screenshot, read console errors) without touching the real mouse/keyboard. Use when asked to test, verify, or screenshot the app's UI, or to interact with it programmatically.
---

ChoiceBuds is an Electron + Vite app. For agent/automated UI testing, drive
it via the Playwright REPL at `.claude/skills/run-desktop/driver.mjs`
instead of moving the real OS mouse cursor - it clicks by DOM selector/text,
reads console errors and page exceptions directly, and screenshots the
window without needing OS-level focus.

All paths are relative to the repo root.

## Prerequisites

`npm run dev` must already be running in the background (Vite dev server on
`http://localhost:5173`; its own vite-plugin-electron auto-launch is fine to
leave running too - the driver launches a second, independent Electron
window against the same dev server, since main.ts has no
`requestSingleInstanceLock`).

**Check `echo $ELECTRON_RUN_AS_NODE` before starting `npm run dev` itself,
not just before `launch`ing the driver.** If it's `1` in the shell that
runs `npm run dev`, vite-plugin-electron's own auto-launched Electron child
inherits it, boots as plain Node instead of real Electron, and immediately
crashes on `import { BrowserWindow } from 'electron'` (that package is CJS
- only real Electron's runtime special-cases the bare `electron` import to
return the API instead of a path string). vite-plugin-electron treats that
child's crash as fatal and kills the *entire* `npm run dev` process,
including the Vite server - so `curl localhost:5173` looks fine for a few
seconds and then silently goes to connection-refused with no obvious error
in view unless you tail the dev server's own log. Always
`unset ELECTRON_RUN_AS_NODE` (bash) before the `npm run dev` background
launch, confirm `curl -s -o /dev/null -w '%{http_code}' localhost:5173`
returns `200` a few seconds later (not just right after "ready in Nms"),
and only then start driving.

## Run

Pipe a batch of commands into the driver in one shot (it reads all of
stdin, then runs the commands in order - not a live REPL):

```bash
node .claude/skills/run-desktop/driver.mjs <<'EOF'
launch
ss 01-landing
click-text Battle Log
ss 02-battlelog
windows
quit
EOF
```

Run this via the Bash tool. It blocks until `quit` (or stdin ends), so use
`run_in_background: true` if a step might hang (e.g. `wait <sel>` on
something that never appears) and you want to inspect partial output
without the whole call timing out.

**Batch the whole interaction into one driver invocation.** Each separate
Bash tool call is a fresh permission prompt for the user - don't launch,
screenshot, then re-launch in a follow-up call just because the next step
depends on what the last screenshot showed. Read the relevant component
source first (to learn real button text/classes instead of guessing), then
write one heredoc that does launch -> navigate -> act -> verify -> clean up
-> quit in a single shot. If a step's outcome is genuinely unknown ahead of
time, use `eval` to branch/inspect *inside* that one call (`eval`'s JS can
do its own conditional DOM queries) rather than splitting into another
top-level call to look and decide.

Screenshots land in `.claude/skills/run-desktop/shots/` (override with
`SCREENSHOT_DIR`). Read them with the Read tool - actually look at the
image, don't just check the command succeeded.

### Commands

| command | what it does |
|---|---|
| `launch` | launch a fresh Electron window against the running dev server |
| `ss [name]` | screenshot -> `shots/<name>.png` |
| `click <css-sel>` | click element via DOM (not OS coordinates) |
| `click-text <text>` | click the first button/link/`[role=button]` containing text |
| `type <text>` / `press <key>` | keyboard input into the focused element |
| `wait <sel>` | wait up to 10s for an element to appear (CSS, or Playwright's `text=...` engine) |
| `eval <js>` | evaluate JS in the page, print the JSON result |
| `text [css-sel]` | print `innerText` of an element (or the whole body) |
| `windows` | list open windows/URLs |
| `quit` | close the driver's Electron instance, exit |

`launch` also wires up `console`/`pageerror` forwarding, so any renderer
exception (e.g. a crash when opening a specific battle) shows up directly
in the driver's own output - no more guessing whether a blank window is a
crash or a missed click.

## Gotchas

- The driver's Electron instance shares the same `userData` dir
  (teams.json/battles.json/etc.) as any other running instance - fine for
  read-only verification, but avoid running two instances that both write
  at the same time.
- `click`/`click-text` use `element.click()` in the DOM, which won't fire
  real pointer events some libraries expect (drag handles, custom
  hover-only menus). For those, fall back to `eval` with a more targeted
  DOM manipulation, or note it and move on.
- `launch` only waits for `domcontentloaded`, not for the app's own async
  hydration or lazy-loaded route chunks (the Calc and Battle Log tabs are
  both `React.lazy`-loaded, per CLAUDE.md). Clicking/evaluating
  immediately after `launch` can land on a bare loading spinner ("Loading
  calculator...", "Loading battle log...") or miss the sidebar nav
  entirely. Always `wait text=<something on the target screen>` (or a
  specific selector known to exist post-load) before the first
  click/eval, and again after navigating into a lazy tab before
  interacting with it.
- `eval <js>` is parsed one stdin line at a time - a multi-line arrow
  function breaks the command parser (`unknown: const - try: help`).
  Always write the whole `eval` expression on one line.
- The same Pokemon name/sprite shows up in multiple places at once on the
  Battle Log page (roster sidebar entry, Battlefield slot, opponent tag
  panel), and naive `click-text`/`querySelector('img[alt=X]')` matches
  the wrong one (usually the roster sidebar, since it's earlier in the
  DOM - clicking it toggles "brought" status, not select-active). Scope
  queries to a Battlefield-specific class instead: a slot's sprite
  `<button>` has class `rounded-lg p-1`
  (`document.querySelectorAll('button.rounded-lg.p-1')`, then read
  `.querySelector('img')?.alt` per button to find the right index), and
  an open move-log popover is `div.absolute.z-20`. Note a broken/404'd
  sprite image still has its `alt` attribute set correctly - don't assume
  a missing image means no matching element.
- Playwright's `text=Foo` selector (used by both `wait` and `click-text`'s
  underlying matching) is a **substring**, not exact, match. `wait
  text=My Team` will happily match a page that only has a "**My Teams**"
  heading (e.g. the Teams tab) - a false positive that looks like the
  right screen loaded when it's actually a different one. Pick wait/click
  text that's unique across the whole app, or fall back to `eval` with an
  exact-match DOM check when two screens share a near-identical string.
- `document.querySelector('button.some-class')` returns the *first*
  matching element in DOM order - the sidebar nav buttons on every page
  share generic utility classes (e.g. `text-left`) with in-page action
  buttons, so a single-class selector like `button.text-left` silently
  clicks the nav instead of the intended button. Use a compound selector
  of classes specific to the target (e.g. `button.py-3.bg-gray-800` for a
  StartBattleFlow team card vs. the sidebar's `py-2`), or scope the query
  to a container first.
- `Element.click()` returns `undefined`, so `el?.click() || 'fallback'`
  always evaluates to `'fallback'` whether or not a click happened - it
  looks like a "not found" signal but isn't one. Log `!!el` (or the
  element's own class/text) separately if you need to confirm a click
  actually fired, rather than trusting `.click()`'s return value.
- To trigger a React `onBlur` handler from `eval` (e.g. after setting a
  field's value via the native-setter trick), dispatch a `'focusout'`
  event, not `'blur'`. Native `blur` doesn't bubble even when the dispatched
  `Event` object has `bubbles: true` set on it - React's synthetic
  `onBlur` is implemented via a delegated listener for the bubbling
  `focusout` event, so a plain `el.dispatchEvent(new Event('blur', {
  bubbles: true }))` silently does nothing.
  `el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))` is what
  actually reaches the handler.
