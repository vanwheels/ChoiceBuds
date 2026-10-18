# Post-mortem: Scoping Sweep

**Date:** 2026-10-18 (single day). **Status:** Shipped. Boundary: `git log`
range `7e8a1a3^..2045642` — starts at the milestone's own scoping/plan
commit, ends at the last leg's decision commit. Full detail for every item
below lives in its own `COMPLETED.md` entry and investigation doc — this
doc is the retrospective, not a restatement.

## What shipped

Three scoping-only legs, no application code changed — each one closing a
decision that an earlier research leg (Bug Fix & Research Sweep, Public
Profiles & Team Sharing) had left open:

1. **Tourney Tab: Schedule Change Detection — Leg 1.** Decided to stay fully
   manual rather than build a periodic Serebii diff-check poll. See
   `docs/investigations/tourney-tab-schedule-source-research.md`.
2. **Pokepaste Import: New Showdown Client Team Links — Leg 2.** Decided to
   wait on adding `teams.pokemonshowdown.com/api` as a second import source.
   See `docs/investigations/pokepaste-format-research.md`.
3. **Public Team Browse & Upload Database — Leg 3.** Decided not to build
   it at all — not a moderation-model question, but a hosting-model one.
   See `docs/investigations/public-team-browse-upload-scope.md`.

## What went well

- All three decisions landed the same day the milestone was planned —
  each was a genuine "decide, don't build" question with no code at stake,
  so there was no reason for any of them to stretch across sessions.
- Leg 3 caught that the original framing ("what moderation model?") was the
  wrong question before investigating it on those terms — the real blocker
  was that this would be the project's first centrally-hosted,
  publicly-writable service at all. Reframing before researching avoided
  scoping a moderation system for a feature that wasn't going to be built.

## What didn't go well / friction points

None worth flagging — this was a clean, low-friction milestone.

## Scope creep observed

None. All three legs were decisions only; none drifted into even a small
implementation.

## What changes for the next milestone

No process changes proposed. The three decisions this milestone recorded
are themselves the artifact — nothing here points at a rule or workflow gap
worth promoting.

## Sibling check

No shared bug class applies — this milestone was decisions-only (no sync,
storage-adapter, parsing, or updater code touched), so there's nothing to
flag for GW2-Squaded.
