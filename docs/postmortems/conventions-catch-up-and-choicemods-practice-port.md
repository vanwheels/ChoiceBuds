# Post Mortem: Conventions Catch-up & ChoiceMods Practice Port

**Shipped:** 2026-11-24 to 2026-11-25 (5 legs, planned in `33843c8`).

## What shipped

1. **Conventions Catch-up Leg 1** (`ae39429`): CLAUDE.md cut from 225 to
   154 lines. Each workflow bullet now states its rule and links the post
   mortem holding the incident; the one rationale with no post mortem home
   moved into `bug-fix-small-features-sweep.md`.
2. **ChoiceMods Practice Port Leg 1** (`f102773`): an Active checks section
   with five ported ChoiceMods rules, absorbing the reactive
   `wrangler deploy` and record-live-verification bullets.
3. **Conventions Catch-up Leg 2** (`6f705b0`): ARCHITECTURE.md cut from 666
   to 100 lines of linked summaries. Section text moved verbatim to 14
   `docs/architecture/` files; four editing-rule sections became
   path-scoped `.claude/rules/` files.
4. **Conventions Catch-up Leg 3** (`f26a735`): TODO.md header reduced to a
   pointer at the global rules; `## Blocked` folded into Unscheduled.
5. **ChoiceMods Practice Port Leg 2** (`a356ac5`): `.claude/hooks/guard.mjs`,
   a Node PreToolUse hook on Bash and PowerShell blocking `git add -A`/`.`
   and `git commit -a`/`-am`, with 24 Vitest tests and a live refusal of
   each command in session.

## What went well

- Moving ARCHITECTURE.md sections verbatim kept Leg 2 a pure relocation:
  every old heading was mapped and every link checked, with no rewrites to
  review.
- Porting the guard to Node instead of ChoiceMods' Python avoided a venv
  dependency and let its tests ride the existing `npm run test`.
- The guard strips quoted text, heredocs and here-strings before matching,
  so a commit message that describes the blocked command still goes
  through. It was proven live against both shells, not only in tests.
- Every leg was docs/tooling only, needed no manual verification, and closed
  with its own COMPLETED.md entry and resolvable hash.

## What didn't / friction points

- CLAUDE.md regrew inside the milestone that trimmed it: 154 lines after
  Leg 1, 163 after the Active checks, 166 after Leg 2 added the
  lowercase-drive Vitest note. Still under the ~200 target, but nothing
  checked the size when a leg added to it.
- Running Vitest from a lowercase `d:` cwd fails every suite ("failed to
  find the runner") because the setup file loads under two path casings.
  It was found mid-milestone and recorded in CLAUDE.md's Commands; it had
  likely cost time in earlier sessions without being written down.
- The two item series (Conventions Catch-up, ChoiceMods Practice Port)
  interleaved by leg number, so "Leg 2" was ambiguous without the series
  name.

## Scope creep observed

- Leg 2 (ARCHITECTURE.md) also added the Vitest casing pitfall to
  CLAUDE.md. Small and useful, but outside that leg's stated system.
- The guard leg widened `vitest.config.ts`'s include to pick up
  `.claude/hooks/*.test.mjs`. Needed for the leg's tests to run in the
  suite, so not true creep.

## What changes for the next milestone

- A leg that adds to CLAUDE.md or ARCHITECTURE.md runs `wc -l` on it and
  checks the addition is a rule or a linked summary, not history. The size
  rules were only enforced by a one-off cleanup milestone.
- Windows Vitest casing: check the cwd's drive letter before blaming a test
  failure. Already in CLAUDE.md; a candidate for the global TypeScript rules
  since any Windows project with Vitest setupFiles can hit it.
