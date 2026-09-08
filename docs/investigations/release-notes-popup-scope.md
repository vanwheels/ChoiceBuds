# Release Notes Popup — Scoping Pass (2026-09-08)

Leg 1 of the Release Notes Popup backlog item. This session was scoping
only, per project convention (scoping and building are always separate
sessions) — no implementation happened here. See `TODO.md`'s Leg 2 entry for
the resulting build plan.

## Decisions (all via `AskUserQuestion`, this session)

1. **Content source: GitHub Release body.** Reuses the existing
   `services/github.ts` infra (already fetches `/releases/latest` for
   `useUpdateCheck`) rather than a second hand-maintained changelog file to
   keep in sync with what actually shipped. The Release `body` field (the
   same markdown drafted per the workflow-conventions release process) is
   the note content.
2. **Settings section: full version history**, not latest-only. Needs
   GitHub's paginated `/repos/{repo}/releases` list endpoint (not
   `/releases/latest`), one entry per past release with its own notes.
3. **Fresh install: skip the popup silently.** No prior "seen" version to
   compare against means nothing reads as "new" to a first-time user — mark
   the current version seen on first load with no popup, only surfacing
   notes starting with the *next* update after that.

## Existing infra this builds on

- `services/github.ts` — `fetchLatestRelease()`/`isNewerVersion()` already
  exist for the update checker. Extend rather than duplicate: add `body` (and
  `publishedAt`) to the `GitHubRelease` shape, and a new `fetchReleaseHistory()`
  hitting the list endpoint (unauthenticated `/releases` only returns
  published releases, not drafts, so no extra filtering needed for the
  draft-release workflow described in the root `CLAUDE.md`).
- `types/settings.ts` — `AppSettings` needs one new field:
  `lastSeenReleaseNotesVersion: string | null`. Follows the existing
  spread-over-`DEFAULT_SETTINGS` pattern in `useSettings.ts`, so no migration
  needed (missing field on old `settings.json` just falls back to `null`).
- `useSettings.ts`'s existing generic `updateSettings(partial)` covers
  persisting the new field — no new IPC/main-process work needed.
- `components/Modal.tsx` — shared modal shell (overlay + Framer Motion
  enter/exit) already used by every other modal in the app
  (`ImportTeamModal`, `ExportTeamModal`, etc.) — the popup should use this,
  not a bespoke overlay.
- `hooks/useUpdateCheck.ts` + `components/UpdateCheckSection.tsx` +
  their App.tsx/SettingsPage.tsx wiring is the closest existing precedent for
  *this exact shape* (a hook instantiated once in `App.tsx`, its state
  threaded both to a top-level render and down into `SettingsPage` as a
  prop) — follow that wiring, not `useSeasonDataCheck`'s
  instantiated-inside-`SettingsPage` pattern, since the popup (unlike that
  hook's Settings-only section) needs to render outside the Settings tab.

## New dependency needed: markdown rendering

No markdown-rendering library exists in the project yet (checked
`package.json`) — GitHub Release bodies are markdown, so both the popup and
the Settings history section need one. Plan: add `react-markdown` (+
`remark-gfm` for tables/checklists/strikethrough, which past release notes
have used). This is an implementation detail, not a design fork, but is
called out here since it's a new npm dependency being introduced by this
item specifically.

## Build plan (Leg 2)

1. `types/settings.ts` — add `lastSeenReleaseNotesVersion: string | null` to
   `AppSettings`; default `null` in `useSettings.ts`.
2. `services/github.ts` — extend `GitHubRelease` with `body: string` and
   `publishedAt: string`; add `fetchReleaseHistory(): Promise<GitHubRelease[]>`.
3. `hooks/useReleaseNotes.ts` (new) — takes `settings`/`updateSettings` (same
   args as `useSeasonDataCheck`/`useChampionsDataCheck`), fetches release
   history once on mount, computes whether the popup should show (`settings`
   loaded, `lastSeenReleaseNotesVersion !== null`, and it doesn't match
   `CURRENT_APP_VERSION`), finds the history entry matching the running
   version's tag for the popup body, silently calls
   `updateSettings({ lastSeenReleaseNotesVersion: CURRENT_APP_VERSION })` on
   first-ever load (fresh-install skip case), and exposes a `markAsSeen()`
   for the popup's dismiss action. Returns the full history array for the
   Settings section to reuse (fetched once, shared — not refetched per
   consumer).
4. `components/ReleaseNotesModal.tsx` (new) — built on `Modal.tsx`, renders
   the current version's release notes via `react-markdown`, a dismiss
   button wired to `markAsSeen()`. Mounted conditionally in `App.tsx`
   alongside the other top-level hooks (same tier as `useUpdateCheck`).
5. `components/ReleaseNotesSection.tsx` (new) — mirrors
   `UpdateCheckSection.tsx`'s shape/states (loading/error/no-releases), lists
   the full fetched history, each entry's markdown body rendered via
   `react-markdown`. Wired into `SettingsPage.tsx` next to
   `UpdateCheckSection`.
6. Tests: `services/github.test.ts` (new — doesn't exist yet) covering
   `fetchReleaseHistory`'s response mapping; `hooks/useReleaseNotes.test.ts`
   covering the fresh-install-skip case, the "unseen version" popup-trigger
   case, and `markAsSeen` persisting/clearing the flag.
7. No `README.md` Credits entry needed — `api.github.com` is already listed
   under the existing GitHub-releases exception (checking the app's own
   release history, not crediting a third-party data/asset source).
