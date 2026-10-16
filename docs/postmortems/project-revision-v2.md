# Post Mortem: Project Revision v2

**Shipped:** 2026-10-16 (single-day milestone, 6 legs).

## What shipped

A 6-leg pass bringing the project up to global conventions v2, scoped from
`docs/investigations/project-revision-v2-audit.md`'s 11-item audit:

1. **CI Gate** (`4e5362f`, `e610fc8`) — added `npm run lint` + `npm run
   test` ahead of the build step in `release.yml`'s `build-windows`/
   `build-mac` jobs and `deploy-web.yml`'s `deploy` job.
2. **CLAUDE.md Slim** (`ac600c7`) — moved the Architecture section into a
   new root `ARCHITECTURE.md`, moved the external-data-source policy into
   `.claude/rules/external-data-sources.md`, corrected several stale
   concrete claims found while re-verifying them.
3. **Lessons to Rules** (`999e9e8`) — promoted five durable postmortem
   lessons into scoped `.claude/rules/` files.
4. **Memory Cleanup** (`6cf4ce6`) — deleted two stale/redundant memory
   entries, promoted two standing rules into CLAUDE.md.
5. **Docs Cleanup** (`9b2334b`) — added README title/intro with
   AI-disclosure and fan-project notice.
6. **Schema Version** (`3871eb4`) — added `schemaVersion` + a migration
   hook to every persisted collection; stamped CLAUDE.md `Conventions: v2`.

## What went well

- Leg 1's CI gate caught a real, previously-invisible bug on its first live
  run: a pre-existing `no-use-before-define` error in `useSettings.ts` that
  no CI step had ever run lint against before. The leg paid for itself
  immediately.
- Leg 1 was also verified live end-to-end (a throwaway `v0.0.0-gatetest`
  tag off a disposable branch, deliberately failing test, confirmed the
  gate actually blocks `release.yml`), then fully cleaned up — tag, draft
  release, and branch all deleted.
- Leg 6 noticed the "new" `schemaVersion` field could reuse an existing
  dead `version` field (always hardcoded to `1`, never read anywhere)
  instead of adding a redundant second field — good scope discipline.
- Leg 2's re-verification of CLAUDE.md's claims against the actual code
  (rather than just restructuring it) surfaced several stale facts that
  would have otherwise kept drifting: a renamed config file, moved IPC
  handlers, an out-of-date preload surface, and a Web build description
  describing an old, narrower nav.
- Every leg landed as its own commit with a COMPLETED.md entry, hash
  filled in right after.

## What didn't / friction points

- Leg 1's live verification of `release.yml` was initially skipped — the
  test-tag push was blocked by the session's auto-mode classifier — and
  only happened because the user explicitly asked to be thorough. Nothing
  caught or flagged the skip on its own; it would have shipped unverified
  if not for that follow-up.
- CLAUDE.md's concrete factual claims (file names, IPC handler locations,
  Web build nav scope) had drifted stale for a while before this audit
  caught it. Nothing short of a full project-revision pass was watching
  for that drift.
- The commit-then-fill-in-hash pattern (one commit for the leg, a second
  docs-only commit to backfill its own hash into COMPLETED.md) added six
  extra commits across the milestone. Minor, but worth noting as overhead
  of the current COMPLETED.md convention.

## Scope creep observed

None within the 6 legs — audit items 10 (file-cap violations) and 11
(comment hygiene) were correctly deferred as "reported, not a leg" rather
than folded in (file-cap splits moved to Future Milestones; comment hygiene
left for whenever those files are next touched).

One adjacent commit landed the same day but outside the audit's 6 items:
`9a20f5c` revised CLAUDE.md's web-verification default back to
dev-server-first now that Leg 1's CI gate makes the live site no longer the
only safety net. It's a direct consequence of Leg 1 landing, not scope
creep into this milestone, but it wasn't itemized in the audit or tracked
as its own leg — flagging so the gap in tracking doesn't repeat.

## What changes for the next milestone

- When a leg's plan calls for a live/destructive verification step and the
  auto-mode classifier blocks it, say so explicitly to the user in the
  moment rather than letting the leg complete without it silently — don't
  rely on the user noticing and asking for thoroughness after the fact.
