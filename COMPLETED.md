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

**Prettier Adoption — Leg 2** (2026-10-16)
Ran `prettier --write` across the codebase (288 files) and committed the
result as a single `style: format codebase with Prettier` commit, with
`.git-blame-ignore-revs` recording its hash in a follow-up commit. The
reformat moved an `eslint-disable-next-line react-hooks/purity` comment in
`PlayerProfileSection.tsx` off the line it was meant to suppress (Prettier
wrapped a single-line `updateSettings({...})` call across three lines,
pushing `Date.now()` to a line the comment no longer covered) - relocated
the comment to the correct line as part of the same commit so lint stayed
clean. Full suite (lint/type-check/test/build) passed post-reformat; manual
smoke check via `run-desktop` confirmed the app still launches and renders
(nav, Teams page with real data, What's New modal) with the real dev
server. See commits 70f3efd, 9781709.

**Prettier Adoption — Leg 1** (2026-10-16)
Installed `prettier` + `eslint-config-prettier`, added `.prettierrc`/
`.prettierignore`, and wired `eslintConfigPrettier` into `eslint.config.js`
plus `format`/`format:check` npm scripts. See commit d1aeb98.

