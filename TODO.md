# ChoiceBuds TODO

Working task list for ongoing/planned work. Every item is titled
`[Item/Sweep Name] — Leg N` (say "Start [title]" to kick off a session on
it). Bodies stay short — commit-message-body length, not an investigation
log; deep cross-checks/history belong in `docs/investigations/<topic>.md`,
linked from the item. `Last touched` + `Re-checks` are tracked per item; no
status enum otherwise — absence of a `Blocked:` line means open. Blocked
items are exempt from the re-check counter. This file adopts that format as
of 2026-08-31 — all re-check counters below start at 0 regardless of how
long an item has been sitting, since none were being counted before now.
Finished work moves to [COMPLETED.md](COMPLETED.md).

## In progress / up next

- **[Regulation M-C Prep] — Leg 1** *(Last touched: 2026-08-31 · Re-checks:
  0)*
  Reg M-C announced, drops 2026-09-08 6pm PST. Confirmed so far: three new
  Z-Megas — Absol (Sharpness), Lucario (Aura Break — new ability, halves
  incoming damage from contact-tagged moves), Garchomp (Levitate) — plus two
  new non-Mega additions, Rillaboom and Baxcaliber (no word yet on a
  Baxcaliber Mega). User is feeding more details as they land; nothing to
  implement yet — this item exists to hold the info until it's complete
  enough to scope config-table/species-roster updates against (Mega
  eligibility lists, `championsAbilityOverrides.ts` for Aura Break,
  `useInitialSync`'s legal-roster diff, `seasons.ts`'s M-6+ rows once M-C's
  season dates are known). Purely additive — no known removals this reg.

- **[Mega Eligibility Team Builder vs Calc Mismatch] — Leg 1** *(Last
  touched: 2026-08-28 · Re-checks: 0)*
  Regulation Z-A Megas don't show as mega-eligible in the team builder but
  do in Calc — the two surfaces likely read eligibility from
  different/out-of-sync sources; needs investigation. Split out of the
  former "Manual-Testing Batch Fixes" item (see COMPLETED.md for the
  UI/UX-overhaul portion of that batch).

- **[Offline Item/Mega Sprite Caching] — Leg 1** *(Last touched: 2026-08-28
  · Re-checks: 0)*
  Item/Mega sprites don't load offline — likely a gap in what
  `useInitialSync`/`pokeapi-cache.json` actually caches; needs investigation
  into whether these URLs are cached at all. Split out of the former
  "Manual-Testing Batch Fixes" item.

- **[Team Card Grid Layout Re-check] — Leg 1** *(Last touched: 2026-08-31 ·
  Re-checks: 0)*
  Root cause found: not already fixed by the carousel rework — that rework
  is what introduced it. `TeamCard.tsx`'s 3-vs-6-column snap required a
  1760px container (6*280px + 5*1rem gaps), unreachable on any MacBook's
  built-in display once the sidebar/page padding is subtracted (~1128px
  available on a 14" MacBook fullscreen, sidebar expanded). Lowered the
  breakpoint to 1100px, computed against that real 14"-MacBook budget (see
  `TeamCard.tsx`'s updated comment for the math); cards render narrower than
  their 280px cap near that threshold but stay well above the ~158px content
  floor. Also corrected a stale comment in `TeamsPage.tsx` describing an
  auto-fill/minmax grid that no longer matches the actual implementation.
  Not yet live-verified on the reporter's actual 14" MacBook — per this
  project's manual-UI-testing convention, needs a real check before this can
  move to COMPLETED.md.

- **[Pokemon Picker Move-Name Search] — Leg 1** *(Last touched: 2026-08-28
  · Re-checks: 0)*
  Pokemon picker search by move name should surface every Pokemon that can
  learn it, not just exact species-name matches. Split out of the former
  "Manual-Testing Batch Fixes" item.

- **[Add Pokemon Box Width Match] — Leg 1** *(Last touched: 2026-08-28 ·
  Re-checks: 0)*
  "Add Pokemon" box is wider than an actual Pokemon card once one's added —
  should match card width. Split out of the former "Manual-Testing Batch
  Fixes" item.

- **[Calc Mega Toggle Ability Revert] — Leg 1** *(Last touched: 2026-08-28
  · Re-checks: 0)*
  Calc: toggling a Mega off doesn't revert the Pokemon's ability back to
  whatever was selected pre-Mega. Split out of the former "Manual-Testing
  Batch Fixes" item.

- **[Config-Table Audit Script] — Leg 1** *(Last touched: 2026-08-29 ·
  Re-checks: 0)*
  Everything else from the GW2-Squaded testing-workflow adoption is done —
  Vitest is wired up and every hook has coverage except the 3
  Battle-Logger-only ones, deliberately skipped pending its retirement (see
  below). Remaining piece: a standalone audit script (GW2 Squaded's
  `scripts/audit-data-completeness.ts` mold) that scans this repo's
  hand-curated config tables (`config/championsMoveOverrides.ts`,
  `config/moveStatEffects.ts`, `config/onSwitchInAbilities.ts`, etc.) for
  structural gaps, complementing the comprehensive-coverage rule already in
  CLAUDE.md. Not started.

- **[Battle Logger Retirement] — Leg 1** *(Last touched: 2026-08-29 ·
  Re-checks: 0)*
  Decision made: drop live turn-by-turn logging + stat-inference
  (`BattlefieldSlot`, `TurnLog`, `LikelySetsPopover`, `useBattleLogActions`,
  the championsbattledata.com inference layer) from active use but archive
  rather than delete it, in case Champions ever exposes real match
  data/replays. Replace it with a ~30-second post-match record (final
  teams, result, freeform notes) feeding only the Statistics page, not
  in-battle assistance. Not yet scoped — needs its own planning pass to
  define (a) what "archive" means concretely and stays recoverable, and (b)
  the new record feature's design (placement, fields, what happens to
  existing Battle Log data under the old shape).

- **[2026-07-07 Review-Pass Leftovers] — Leg 1** *(Last touched: 2026-07-14 ·
  Re-checks: 0)*
  Four items outstanding from three earlier review-pass batches (everything
  else from them is done — see COMPLETED.md):
  1. Battle Log page still scrolls at the 1280x720 minimum window size —
     `Battlefield.tsx` + turn controls + turn log total 808.5px, taller
     than the roster column. Needs its own sizing pass; may become moot if
     the Battle Logger retirement above replaces this UI — check first.
  2. Calc page still scrolls slightly at 1280x720 after the 2026-07-14
     tightening pass (~209px short) — stopped deliberately to protect
     legibility/click comfort. Fits fine at 1920x1080. Revisit if wanted.
  3. Battle Logger's move-stat-effects table: waiting on the user to name a
     move with a weather-conditional stage *amount* like Growth's — no
     second example found in research so far.
     Blocked: needs the user to name a candidate move.
  4. Stretch/uncertain: export a team *to* a new Pokepaste via its write
     API — unconfirmed whether pokepast.es exposes one; needs research
     before scoping.

- **[Original Roadmap Leftovers] — Leg 1** *(Last touched: not recorded,
  predates leg-tracking · Re-checks: 0)*
  Remaining items from the original 9-item roadmap (Statistics page,
  Settings shell, cross-device sync, Teams/Battle Log list-row redesign,
  team-notes/image export are all done — see COMPLETED.md):
  1. Further Calc UI cleanup (#3) — overlaps with Calc work already in
     flight elsewhere in this file.
  2. General UI polish (#1) — nothing further scoped beyond what's shipped.
  3. Limitless usage data (#7) — blocked externally on API key approval.
     Blocked: waiting on Limitless API key approval.

## Backlog / ideas (not yet scoped, reordered highest-to-lowest priority)

- **[In-App Auto-Update: macOS] — Leg 1** *(Last touched: not recorded ·
  Re-checks: 0)*
  Windows shipped in v0.2.1 (see COMPLETED.md). macOS is blocked: Squirrel.Mac
  (what `electron-updater` uses there) requires code signing to auto-update
  at all, and Gatekeeper heavily restricts unsigned builds regardless. Once
  unblocked, `registerAutoUpdater()`'s `process.platform !== 'win32'` guard
  in `main.ts` is the one line to revisit.
  Blocked: user needs a paid Apple Developer account ($99/yr) + notarization.
  - Separately, a paid Windows code-signing cert (~$100-400+/yr) isn't
    required for Windows auto-update to function, but would remove the
    SmartScreen warning — not yet decided.

- **[TypeScript 7 Upgrade] — Leg 1** *(Last touched: not recorded ·
  Re-checks: 0)*
  `typescript-eslint` doesn't support TypeScript 7.0.2 yet (confirmed
  peer-range rejection + real runtime crash reports). Currently on
  TypeScript ^6.0.3.
  Blocked: waiting on real `typescript-eslint` 7.x support.

- **[set-state-in-effect Lint Rule Fix] — Leg 1** *(Last touched: not
  recorded · Re-checks: 0)*
  The rule is disabled on `useTeams.ts`/`useSettings.ts`/
  `useSavedPokemon.ts`/`useBattles.ts`/`useDatabase.ts`'s shared
  load-on-mount-and-reused-by-refresh idiom, plus `useSync.ts`'s
  `refreshStatus`. A real fix means splitting each into an effect-safe
  silent variant and a refresh variant — bigger than a routine cleanup
  pass. Not started.

- **[Generalize Check-for-Updates Pattern] — Leg 1** *(Last touched: not
  recorded · Re-checks: 0)*
  The "Check for Updates" reminder-tool pattern (see COMPLETED.md) could
  extend to other hand-authored Champions balance-patch config tables
  (`championsMoveOverrides.ts`/`championsAbilityOverrides.ts`/etc.) if
  useful later. No concrete driver yet beyond the original season/regulation
  use case. Not started.
