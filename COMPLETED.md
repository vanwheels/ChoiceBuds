# ChoiceBuds - Completed Work Log

Archive of finished work, split out of `TODO.md` (2026-07-08) to keep the
active task list quick to scan. Newest entries first. Cross-references to
still-open items point to `TODO.md`; references to other entries here stay
local ("see below"/"see above").

Archived at milestone boundaries as of the 2026-09-30 split (Post-Parity
Polish - see `MILESTONES.md`), per CLAUDE.md's archiving rules: a shipped
milestone becomes the real cutoff instead of an arbitrary entry count.
Entries prior to this file's oldest are in:
- [docs/archive/completed-2026-06-17-to-2026-07-09.md](docs/archive/completed-2026-06-17-to-2026-07-09.md)
  (the 50 oldest entries as of the 2026-08-31 split)
- [docs/archive/completed-2026-07-09-to-2026-09-01.md](docs/archive/completed-2026-07-09-to-2026-09-01.md)
  (everything through the Battle Logger Re-eval + Data & Process Cleanup
  milestone, split out at the 2026-09-08 Card UI Polish boundary)
- [docs/archive/completed-2026-09-01-to-2026-09-13.md](docs/archive/completed-2026-09-01-to-2026-09-13.md)
  (Card UI Polish through Regular Calc Popup and everything shipped between
  them, split out at the 2026-09-13 Regular Calc Popup boundary)
- [docs/archive/completed-2026-09-13-to-2026-09-30.md](docs/archive/completed-2026-09-13-to-2026-09-30.md)
  (VGCPastes Real-Set Sourcing through Post-Parity Polish and everything
  shipped between them, split out at the 2026-09-30 Post-Parity Polish
  boundary)
- [docs/archive/completed-2026-09-30-to-2026-10-16.md](docs/archive/completed-2026-09-30-to-2026-10-16.md)
  (Web TeamCard Expand Infinite-Loop Bug through Project Revision v2 and
  everything shipped between them, split out at the 2026-10-16 Project
  Revision v2 boundary)
- [docs/archive/completed-2026-10-16-to-2026-10-16.md](docs/archive/completed-2026-10-16-to-2026-10-16.md)
  (the Prettier Adoption milestone's three legs, split out at the
  2026-10-16 Prettier Adoption boundary)
- [docs/archive/completed-2026-10-16-to-2026-10-16-maintenance-code-health-sweep.md](docs/archive/completed-2026-10-16-to-2026-10-16-maintenance-code-health-sweep.md)
  (the Maintenance & Code Health Sweep milestone's seven legs, split out at
  the 2026-10-16 Maintenance & Code Health Sweep boundary - named with the
  milestone slug since it shares its date range with the Prettier Adoption
  archive above)

## Dev Environment: Electron Zoom-Persistence Fix + Mobile Web Preview Script — 2026-10-17

Electron zoom fix and the new `npm run dev:mobile` script both landed
2026-10-16 (see `docs/archive/completed-2026-10-16-to-2026-10-16.md`'s
boundary and commits `46513fe`/`b01327a`), but `dev:mobile` itself hadn't
been live-verified yet. Doing so today caught two real bugs: Node 24 on
Windows throws `spawn EINVAL` self-starting Vite through the bare `npx.cmd`
shim without `shell: true` (fixed by spawning `node` directly against
Vite's `bin/vite.js` instead, which also avoids `shell: true`'s own problem
of wrapping the real process in a `cmd.exe` that the script's `child.kill()`
cleanup can't reach); and this machine has no system Chrome installed at
all, so `channel: 'chrome'` always failed (fixed with a fallback to a
locally installed Opera GX, Vanny's actual daily browser, via
`executablePath` resolved through `%LOCALAPPDATA%`). Fixing the Chrome
fallback also exposed a cleanup-ordering bug: a failed browser launch left
the self-started Vite server orphaned on :5174 because `cleanup()` was
defined after the throwable launch call; moved its registration earlier and
wrapped the browser/page logic in `try`/`finally`. Confirmed live end to
end afterward: self-starts `dev:web`, opens a correctly phone-proportioned
Opera GX window, and cleanly tears down the self-started Vite server on
exit. See commit TBD.

