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

- **[EV Grid / Move Bubble Overflow at Extreme Narrow Widths] — Leg 1**
  *(Last touched: 2026-09-08 · Re-checks: 0)*
  Surfaced while `run-desktop`-verifying [Card Content Overflow at Mid
  Widths] (see COMPLETED.md): forcing a `PokemonCard`'s `@container` width
  down to ~550px (3-col track, ~183px/card) showed `StatsColumn.tsx`'s
  bottom EV stat grid (`repeat(3, 1fr)` in the component's inline style,
  around `StatsColumn.tsx:140`) and `EditOverlays.tsx`'s move-bubble grid
  bleeding into the neighboring card - same root gotcha (grid items'
  default `min-w-0` missing up the chain) as the two rows just fixed, just
  a different pair of rows, not scoped/audited in that leg. Not yet
  confirmed reachable through any real window-size/layout combination
  today (`main.ts`'s enforced `minWidth: 1280` plus `TeamsPage.tsx`'s own
  `@[1360px]:grid-cols-2` breakpoint put the realistic floor for a single
  team card's container around ~670-1000px, comfortably above 550px) - the
  precedent Team Card Grid Layout Re-check item did measure narrower reals
  numbers on macOS (818px on a 13" MacBook) than this Windows dev machine
  can reach, so treat "not reachable" as unconfirmed rather than settled.
  Needs the same live resize-pass treatment before deciding whether it's
  worth fixing.
