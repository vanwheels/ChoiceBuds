# Post-mortem: UI/UX Overhaul

**Date:** 2026-08-29 (single-day implementation arc, design approved and
built same day). **Status:** Shipped. Full implementation detail lives in
`COMPLETED.md`'s entries for each piece below (`git log` range
`ca1b022..e537592`) — this doc is the retrospective, not a restatement.

## What shipped

One approved Claude Design canvas mockup (6+ artboards, including four live
clickable motion demos) drove five coordinated pieces, all implemented and
live-verified the same day:

1. **Color palette rework** (legs A+B, C, D) — gold/purple accent design
   tokens replacing `blue-600`, zinc neutral standardization over the
   existing gray/zinc split, and a per-type glow effect on individual
   Pokémon cards.
2. **Teams page carousel/grid rework** (legs 1-4 + a same-day follow-up
   fix) — 3D coverflow replacing the flat sprite-strip, header/controls
   pill with an overflow menu, expanded-grid stat restoration, and a
   responsive 2-column grid with drag-reorder gated to expanded+edit-mode.
3. **Sidebar/menuing rework** — collapsible rail, new icon set, status
   footer moved to a Settings-page card.
4. **Window sizing rework** — persist size/position across launches via a
   dedicated main-process-owned `window-state.json`.
5. **Animation/motion language** (legs 1-4) — Framer Motion adopted as the
   app's general-purpose animation library (modal transitions, card
   expand/collapse, sidebar collapse, drag-reorder), with a shared
   duration/easing scale in `config/motion.ts`.

## What went well

- **Design-approval-first workflow.** The mockup was built and approved
  before any code was written, and each multi-leg piece had its leg order
  confirmed with the user (via `AskUserQuestion`) before implementation
  started. This kept each leg bounded and let the user course-correct
  between legs rather than after a big-bang implementation.
- **"Read the source, don't eyeball it."** Breakpoints, colors, and SVG
  paths were pulled directly from the mockup's own artboard source or
  sampled programmatically (Gholdengo sprite for gold, `icon.png`'s
  background fill for purple) rather than guessed from a screenshot. This
  avoided a whole class of "close enough" drift between mockup and
  implementation.
- **Live verification caught real bugs before legs were called done.**
  `run-desktop` (and one-off Playwright scripts where its driver fell
  short) surfaced the overflow-menu clipping root cause, the frozen-height
  card-expand artifact, the roster-reorder remount-instead-of-move bug, and
  the header-squeeze breakpoint bug — all before merging, not after.
- **Disposable-team testing discipline held throughout.** Every live
  verification against draggable/persisted state used fresh disposable
  teams, confirmed deleted afterward, with the user's 2 real teams
  explicitly re-confirmed untouched each time. Heavy live testing, zero
  data-loss risk.

## What didn't go well / friction points

- **Several bugs took multiple passes to actually root-cause.** The
  overflow-menu clipping bug took 3 passes before landing on the real
  cause (`overflow-y-auto` coercing `overflow-x` to `auto` per the CSS
  spec) — the first two passes fixed real but secondary symptoms
  (`scrollbarGutter`) without touching the actual clipping. The
  card-expand height bug had a non-obvious load-bearing fix (resetting
  inline `height` back to `'auto'`, not just `overflow`) that wasn't
  apparent from the first symptom reported.
- **A mockup placeholder number shipped unvalidated and immediately needed
  a fix.** The 2-column grid breakpoint (`~1160px`) was carried over from
  the mockup's own static-snapshot placeholder without live-measuring the
  header's actual hard-minimum content width first. It shipped, the user
  reported a visibly squeezed layout via screenshot, and only then got
  properly measured and corrected to `1360px`. That measurement could have
  happened before shipping instead of after.
- **`run-desktop`'s driver gap kept recurring.** Real window resize and
  real hover needed direct `BrowserWindow`/`electronApp.evaluate()` access
  the shared skill doesn't expose, so multiple one-off standalone
  Playwright scripts were written ad hoc across different legs to work
  around the same gap.

## Scope creep observed

- **Framer Motion's role expanded mid-arc.** The original plan scoped it to
  just the Teams-carousel coverflow; during the animation/motion design
  pass it grew, with explicit user approval in the moment, into "the app's
  general-purpose animation library" covering modals, card expand/collapse,
  sidebar collapse, and drag-reorder — four more legs than the original
  framing implied. Not silent creep (the user approved it explicitly), but
  worth flagging per the project's own scope-creep convention: it was a
  real enlargement of the arc, decided inside the same session rather than
  routed through a separate TODO item first.
- **A data-model bug got fixed inline instead of deferred.** Animation leg
  4 (drag-reorder) uncovered a real correctness bug — `PokemonCard`s were
  keyed by index instead of a stable id, so a reorder unmounted/remounted
  cards instead of animating them — and fixed it inline (adding a real
  `id` field to `ImportedPokemonInfo`) rather than filing it separately.
  Justified here (the animation literally couldn't work without the fix),
  but it's a second instance in this same arc of a leg's scope growing
  past its own spec to absorb a fix found along the way.

## What changes for the next milestone

- Live-measure any mockup's placeholder numeric values (breakpoints,
  thresholds, minimum widths) against the real implementation before
  calling a leg done — not after a user-reported bug forces the
  measurement that should have happened first.
- When a leg's verification needs something `run-desktop` can't do (main-
  process control, real hover/drag), treat it as a signal to consider
  closing that skill gap rather than re-solving it with a fresh one-off
  script each time it recurs.
- Keep the precedent this milestone set: sequence multi-leg design work
  with the user before writing code, and explicitly call out any mid-arc
  scope expansion — even one the user approves on the spot — rather than
  letting it fold silently into the leg it happened during.
