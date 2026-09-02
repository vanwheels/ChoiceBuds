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
"In progress / up next" and "Backlog / ideas", items are listed
highest-to-lowest priority. Finished work moves to [COMPLETED.md](COMPLETED.md).

## In progress / up next

- **[Regulation M-C Prep] — Leg 1** *(Last touched: 2026-08-31 · Re-checks:
  0)*
  Reg M-C announced, drops 2026-09-08 6pm PST — the nearest hard deadline on
  this list. Confirmed so far: three new Z-Megas — Absol (Sharpness),
  Lucario (Aura Break — new ability, halves incoming damage from
  contact-tagged moves), Garchomp (Levitate) — plus two new non-Mega
  additions, Rillaboom and Baxcaliber (no word yet on a Baxcaliber Mega).
  User is feeding more details as they land; nothing to implement yet — this
  item exists to hold the info until it's complete enough to scope
  config-table/species-roster updates against (Mega eligibility lists,
  `championsAbilityOverrides.ts` for Aura Break, `useInitialSync`'s
  legal-roster diff, `seasons.ts`'s M-6+ rows once M-C's season dates are
  known). Purely additive — no known removals this reg.

- **[Generalize Check-for-Updates Pattern] — Leg 2** *(Last touched:
  2026-09-01 · Re-checks: 0)*
  Leg 1 (scoping) done — this is the scoped build. Extends the Settings
  "Season Data" reminder pattern (`useSeasonDataCheck.ts`/
  `SeasonDataCheckSection.tsx`) to the three actively-consumed hand-authored
  Champions balance tables: `championsMoveOverrides.ts`,
  `championsAbilityOverrides.ts`, `championsMovepoolChanges.ts`.
  `championsMechanics.ts` stays out of scope — nothing in the app reads
  `CHAMPIONS_STATUS_CONDITIONS` yet, so there's nothing to flag stale.
  **Staleness signal differs from seasons.ts** (per user 2026-09-01):
  Champions only patches balance at a Regulation boundary (M-A→M-B→M-C),
  not season-to-season within a regulation, so the trigger is "the latest
  regulation in `seasons.ts` has changed since this file was last verified,"
  not a date window. Concretely:
  - New `AppSettings.championsDataChecks: Partial<Record<ChampionsDataCheckId,
    { regulation: string; checkedAt: number }>>` (nested-object field,
    following the existing `playerProfile` precedent — avoids a new
    top-level `AppSettings` field per tracked file). Missing entries default
    via the existing spread-over-`DEFAULT_SETTINGS` pattern in
    `useSettings.ts`, no migration needed.
  - Seed `DEFAULT_SETTINGS`'s three entries to `{ regulation: 'Reg M-B',
    checkedAt: Date.parse('2026-09-01') }` rather than null/never-checked —
    all three files' headers already record a real 2026-09-01 audit against
    Reg M-B (`docs/investigations/champions-showdown-mod-audit.md`), so
    defaulting to "never checked" would misrepresent already-done work.
  - New `config/championsDataChecks.ts`: `ChampionsDataCheckDef[]` (id,
    label, file path for display) listing the three tracked files.
  - New `useChampionsDataCheck.ts` hook: `isStale` per file = stored
    `regulation` !== `getLatestSeason().regulation`; `markChecked(id)` writes
    `{ regulation: getLatestSeason().regulation, checkedAt: Date.now() }`
    into the map via the existing generic `updateSettings()`. Mirror
    `useSeasonDataCheck.test.ts`'s test shape.
  - New `ChampionsDataCheckSection.tsx`: **one shared Settings section**
    (not three separate ones — the generalization is the point), a row per
    tracked file with its own last-checked date + regulation and per-row
    "Mark as Checked" button, matching `SeasonDataCheckSection.tsx`'s visual
    language. Wire into `SettingsPage` alongside the existing section.
  - Note the interaction with "Regulation M-C Prep" above: once M-C's rows
    land in `seasons.ts`, all three rows here go stale immediately by
    design — that's the intended nudge to re-audit the balance tables
    against M-C, not a bug.
  - `SeasonDataCheckSection`/`useSeasonDataCheck` stay as-is, unchanged —
    genuinely different signal (date-window vs. regulation-change), not
    unified into one hook.

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

- **[Calc Auto Ability-Effect Application] — Leg 3** *(Last touched:
  2026-09-01 · Re-checks: 0)*
  Blocked: waiting on Aura Break's exact mechanic to be confirmed (tracked
  under "Regulation M-C Prep").
  Also folds in "Further Calc UI cleanup," the one sub-item of the now-closed
  "Original Roadmap Leftovers" item (see COMPLETED.md) with real overlap
  here. Leg 1 (rescoping) and Leg 2 (crash-on-zero-damage bug fix) both
  shipped — see COMPLETED.md. Remaining scope is Champions ability
  balance-patch damage math: `@smogon/calc` only knows mainline Scarlet/
  Violet ability mechanics, and `championsAbilityOverrides.ts` today only
  corrects display text, not damage math — its header already flags this gap
  for Unseen Fist's 25%-through-Protect interaction (the one Champions
  ability override with a live damage-math consequence per
  `docs/investigations/champions-showdown-mod-audit.md`). Aura Break will be
  a second case once confirmed. Scoping this leg means deciding how a
  mechanical override reaches `computeSideResults` — most likely via `Move`'s
  existing `overrides` param, the same pattern `championsMoveOverrides.ts`
  uses for moves. One case (Unseen Fist) alone isn't enough to design the
  override shape against with confidence, hence the block on Aura Break.

- **[Limitless Usage Data] — Leg 1** *(Last touched: 2026-09-01 · Re-checks:
  0)*
  Blocked: waiting on Limitless API key approval.
  Spun off from the now-closed "Original Roadmap Leftovers" item (see
  COMPLETED.md) — the one sub-item of that roadmap leftover with real
  remaining scope rather than nothing left to build. No further detail
  beyond the original roadmap ask; needs scoping once the key comes through.

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

## Backlog / ideas (not yet scoped, highest-to-lowest priority)
