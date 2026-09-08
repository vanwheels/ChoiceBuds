# ChoiceBuds TODO

Working task list for ongoing/planned work. Every item is titled
`[Item/Sweep Name] — Leg N` (say "Start [title]" to kick off a session on
it). Bodies stay short — commit-message-body length, not an investigation
log; deep cross-checks/history belong in `docs/investigations/<topic>.md`,
linked from the item. `Last touched` + `Re-checks` are tracked per item; no
status enum otherwise — absence of a `Blocked:` line means open. Blocked
items are exempt from the re-check counter and live in their own tier below
rather than mixed into the active list. This file adopted that format as of
2026-08-31 — all re-check counters started at 0 then regardless of how long
an item had been sitting. Reordered into priority order 2026-08-31; within
the current milestone and "Unscheduled", items are listed highest-to-lowest
priority. Only one milestone is "current" at a time — see root `CLAUDE.md`'s
Task Tracking rules for the full section-lifecycle (`## Current Milestone:
<name>` → `MILESTONES.md` + `COMPLETED.md` on ship). Finished work moves to
[COMPLETED.md](COMPLETED.md).

## Current Milestone: Card UI Polish

- **[Card Content Overflow at Mid Widths] — Leg 1** *(Last touched:
  2026-09-08 · Re-checks: 0)*
  Scoped: likely cause is the classic CSS grid/flex "child won't shrink
  below its content's min-content width without an explicit `min-w-0`"
  gotcha — `TeamCard.tsx`'s `grid-cols-3` track can be narrower than
  `PokemonCard`'s `max-w-[280px]` cap in the container-width range below the
  `@[1040px]:grid-cols-6` breakpoint (confirmed narrower via the Team Card
  Grid Layout Re-check item's live measurements), so the card itself shrinks
  to fit its track, but `StatsColumn.tsx`'s SP-investment row (`min-w-0` is
  only applied to its inner nature-pill row today, not consistently up the
  tree) and the type-badge row don't shrink to match, spilling past the
  card's now-narrower rendered width. Fix direction: audit both rows for
  missing `min-w-0`/`flex-wrap`/`truncate` up their full ancestor chain, not
  a single-point patch. Needs a live `run-desktop` resize pass through the
  exact width range to pin down the real breakpoint and confirm the fix,
  same method the Team Card Grid Layout Re-check item used.

- **[Card Action Button Placement] — Leg 1** *(Last touched: 2026-09-08 ·
  Re-checks: 0)*
  Scoped: design already fully specified, nothing left to resolve there.
  Delete moves from its current `absolute top-2 right-2` position to sit
  centered exactly on the card's top-right corner (negative offset, e.g.
  `-top-2.5 -right-2.5`, extending outside the card's rounded border rather
  than inset). Export moves out of the corner entirely into a right-click
  context menu on the card — no existing context-menu component in the
  codebase to reuse, so this needs a small new one (custom-positioned at the
  click coordinates, dismisses on outside-click/Escape, single "Export"
  entry for now) rather than pulling in a menu library for one item.
  `onContextMenu` goes on the card's outer `data-pokemon-card` div,
  `preventDefault()`'d to suppress the OS/browser native menu.

- **[Pokémon Card Drag Without Handle] — Leg 1** *(Last touched: 2026-09-08 ·
  Re-checks: 0)*
  Scoped (per user decision): native HTML5 drag on the whole card, excluding
  interactive descendants, rather than a pointer-threshold approach. Root
  cause of the prior whole-card attempt's ambiguity (per its revert,
  `cb0cc98`) wasn't HTML5's click-vs-drag disambiguation itself — that
  already works cleanly for `MoveBubbleGrid.tsx`'s move-bubble drag, which
  is simultaneously a click target and a drag source — it was `draggable`
  on a container whose descendants include natively-draggable elements (the
  sprite `<img>`) and text-selectable inputs with no exclusion logic at
  all. Fix: move `draggable`/`onDragStart` from the grip-handle icon
  (removed entirely) to the card's outer `data-pokemon-card` div;
  `handleDragStart` bails out (`e.preventDefault()`, no payload set) when
  `e.target` is inside an `input`, `button`, or an element carrying a new
  `data-no-drag` attribute — tag the sprite/swap box and the gender/shiny
  corner badges, and `EditOverlays`' item/ability/move-picker pills with it
  (EV number inputs and Nickname are already native `input`s, covered by
  the selector alone); also set `draggable={false}` explicitly on the
  sprite `<img>` itself as a second guard against the browser's native
  image-drag. `MoveBubbleGrid.tsx`'s own drag handlers already call
  `e.stopPropagation()` on `dragstart` specifically so a move-bubble drag
  won't also fire the card-level one now that it's a real descendant —
  verify that still holds, no new code needed there.

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

- **[Regulation M-C Prep] — Leg 2** *(Last touched: 2026-09-05 · Re-checks:
  0)*
  Blocked: waiting on Reg M-C's actual 2026-09-08 6pm PST release and
  Serebii publishing its regulation/items pages — Leg 1 (roster/mega-stone/
  regulation-selector registration, see COMPLETED.md) was hand-curated
  ahead of release with no official source to check against yet.
  Once live: re-verify `utils/pokemonRules.ts`'s `REG_MC_ADDED_SPECIES` and
  `config/vgcData.ts`'s 6 new Mega Stones against Serebii's own Reg M-C
  pages (replacing the pre-release provenance notes in both files' headers
  with real citations, same as M-A/M-B); spot-check the 3 new ordinary Mega
  abilities (Baxcalibur/Golisopod/Salamence, currently sourced only from
  `@smogon/calc`'s bundled data with no second source) and the 3 Mega Z
  abilities (Absol/Garchomp/Lucario, user-confirmed but not yet
  cross-checked against a published source) in `config/megaAbilities.ts`;
  check whether Rillaboom/Baxcalibur/Salamence/Golisopod gained any Legends
  Z-A-exclusive moves PokeAPI's Gen 9 SV learnset pipeline wouldn't surface
  on its own (Leg 1 deliberately didn't chase this pre-release - see its
  COMPLETED.md entry); add `seasons.ts`'s M-6+ rows once M-C's season dates
  are known.

- **[Team Card Grid Layout Re-check] — Leg 1** *(Last touched: 2026-08-31 ·
  Re-checks: 0)*
  Blocked: waiting on the user to verify live on their physical MacBook —
  everything below was confirmed on a resized Electron window on the dev
  machine, not the actual hardware.
  Fixed and live-verified via `run-desktop` (added a `resize` command to
  `driver.mjs` — sets Electron's content size directly, matching what the
  renderer's CSS/`@container` actually measures). Root cause: not already
  fixed by the carousel rework — that rework is what introduced it.
  `TeamCard.tsx`'s 3-vs-6-column snap required a 1760px container (6*280px +
  5*1rem gaps), unreachable on any MacBook. First attempt (1100px, based on
  a theoretical estimate) still wasn't low enough — measured live at the
  reporter's actual conditions (14" MacBook, sidebar expanded, 2 real teams,
  single-column layout) the container only gets 1043px. Retuned to 1040px
  against that measured number; confirmed live it renders a clean 1x6 with
  no truncation at 1512x982/sidebar-expanded (screenshot:
  `.claude/skills/run-desktop/shots/06-fixed-1512-expanded-sidebar.png`).
  Doesn't cover a 13" MacBook (measured 818px there) — not this fix's
  target device. Also corrected a stale `TeamsPage.tsx` comment describing
  an auto-fill/minmax grid that no longer matches the real implementation.
  Ready to move to COMPLETED.md once the MacBook pass confirms it.

- **[In-App Auto-Update: macOS] — Leg 1** *(Last touched: not recorded ·
  Re-checks: 0)*
  Blocked: user needs a paid Apple Developer account ($99/yr) + notarization.
  Windows shipped in v0.2.1 (see COMPLETED.md). macOS is blocked: Squirrel.Mac
  (what `electron-updater` uses there) requires code signing to auto-update
  at all, and Gatekeeper heavily restricts unsigned builds regardless. Once
  unblocked, `registerAutoUpdater()`'s `process.platform !== 'win32'` guard
  in `main.ts` is the one line to revisit.
  - Separately, a paid Windows code-signing cert (~$100-400+/yr) isn't
    required for Windows auto-update to function, but would remove the
    SmartScreen warning — not yet decided.

- **[TypeScript 7 Upgrade] — Leg 1** *(Last touched: not recorded ·
  Re-checks: 0)*
  Blocked: waiting on real `typescript-eslint` 7.x support.
  `typescript-eslint` doesn't support TypeScript 7.0.2 yet (confirmed
  peer-range rejection + real runtime crash reports). Currently on
  TypeScript ^6.0.3.

## Unscheduled (not yet scoped, highest-to-lowest priority)

(nothing currently unscheduled)
