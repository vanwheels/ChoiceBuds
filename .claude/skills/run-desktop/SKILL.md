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
| `wait <css-sel>` | wait up to 10s for an element to appear |
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
