# Post Mortem: Prettier Adoption

**Shipped:** 2026-10-16 (single-day milestone, 3 legs).

## What shipped

1. **Leg 1** (`d1aeb98`) — installed `prettier` + `eslint-config-prettier`,
   added `.prettierrc`/`.prettierignore`, wired `eslintConfigPrettier` into
   `eslint.config.js`, and added `format`/`format:check` npm scripts.
2. **Leg 2** (`70f3efd`, `9781709`) — ran `prettier --write` across the
   codebase (288 files) as a single `style:` commit, recorded its hash in
   `.git-blame-ignore-revs`, and fixed a comment-placement side effect in
   `PlayerProfileSection.tsx` where the reformat moved an
   `eslint-disable-next-line` comment off the line it was meant to suppress.
3. **Leg 3** (`bc66643`) — added `format:check` to `deploy-web.yml` and to
   `release.yml`'s `build-windows`/`build-mac` jobs, closing the "CI fails
   on unformatted pushes" done check.

## What went well

- Leg 2's full-suite verification (lint/type-check/test/build) plus a
  manual `run-desktop` smoke check caught the one real side effect of the
  mass reformat (the misplaced lint-disable comment) before it shipped.
- Leg 3 didn't just add the CI step and assume it worked — running
  `format:check` locally first surfaced that `endOfLine: "lf"` disagreed
  with this Windows machine's (and GitHub's `windows-latest` runners')
  `core.autocrlf=true` CRLF checkouts, flagging all 302 files as
  unformatted despite matching content. Caught and fixed (`endOfLine:
  "auto"` in `.prettierrc`) before it could fail CI on the first real push.
- Each leg landed as its own commit with a same-day COMPLETED.md entry.

## What didn't / friction points

- The CRLF/`endOfLine` mismatch wasn't anticipated when Leg 1 picked
  Prettier's defaults — it only surfaced once Leg 3 tried to actually gate
  CI on `format:check`. A `.gitattributes`/`core.autocrlf` check during
  Leg 1's setup would have caught it two legs earlier.
- `release.yml`'s `build-windows`/`build-mac` `format:check` steps only run
  on version-tag pushes, so they're still unexercised by a real run as of
  this close — the milestone's "Done when" criteria don't require that,
  but it's a gap worth remembering at the next release tag push.

## Scope creep observed

None. All three legs matched the milestone's three "Done when" criteria
one-to-one.

## What changes for the next milestone

- When adopting a formatter or linter with an opinionated default that
  interacts with line endings, encoding, or other OS-level file
  representation, check `core.autocrlf`/`.gitattributes` for the dev
  machine(s) and CI runners *before* wiring the check into CI, not after -
  would have saved Leg 3's extra debugging round trip.
