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
  Lucario (Aura Guard — new ability, halves incoming damage from
  contact-tagged moves; corrects the earlier "Aura Break" placeholder name),
  Garchomp (Levitate) — plus two new non-Mega additions, Rillaboom and
  Baxcaliber (no word yet on a Baxcaliber Mega). User is feeding more
  details as they land; nothing to implement yet — this item exists to hold
  the info until it's complete enough to scope config-table/species-roster
  updates against (Mega eligibility lists, `megaAbilities.ts` for Aura
  Guard, `useInitialSync`'s legal-roster diff, `seasons.ts`'s M-6+ rows once
  M-C's season dates are known). Purely additive — no known removals this
  reg. Aura Guard's damage-math side (not just its display text) is now
  designed under [Calc Auto Ability-Effect Application] — Leg 3 below; this
  item still owns the roster/config registration itself once M-C ships.

- **[Calc Auto Ability-Effect Application] — Leg 3** *(Last touched:
  2026-09-05 · Re-checks: 0)*
  Unblocked 2026-09-05: second case confirmed as Mega Lucario Z's Aura Guard
  (halves damage taken from contact moves) — the design below was waiting on
  this to have two real cases to design the override shape against, not just
  Unseen Fist alone.
  Also folds in "Further Calc UI cleanup," the one sub-item of the now-closed
  "Original Roadmap Leftovers" item (see COMPLETED.md) with real overlap
  here. Leg 1 (rescoping) and Leg 2 (crash-on-zero-damage bug fix) both
  shipped — see COMPLETED.md. Remaining scope is Champions ability
  balance-patch damage math: `@smogon/calc` only knows mainline Scarlet/
  Violet ability mechanics, and `championsAbilityOverrides.ts` today only
  corrects display text, not damage math — its header already flags this gap
  for Unseen Fist's 25%-through-Protect interaction (the one Champions
  ability override with a live damage-math consequence per
  `docs/investigations/champions-showdown-mod-audit.md`).

  Design decided, ready to build next session:
  - New `config/championsAbilityDamageEffects.ts` (sibling to
    `championsAbilityOverrides.ts`, which its own header scopes to
    display-text-only) — `Record<string, { throughProtectMultiplier?:
    number; contactDamageTakenMultiplier?: number }>` keyed by ability slug:
    `'unseen-fist': { throughProtectMultiplier: 0.25 }`, `'aura-guard': {
    contactDamageTakenMultiplier: 0.5 }`.
  - Applied in `damageCalcEngine.ts::computeSideResults`, after
    `calculate()` returns and after the existing `isFullyBlocked` check (an
    immunity/full Protect block still short-circuits to `blockedEntry`
    first, unchanged):
    - Attacker-side: `defenderSide.isProtected && move.flags.contact &&`
      attacker's ability slug is `unseen-fist` → scale the resulting
      range/possibleDamages by `throughProtectMultiplier`. Mirrors
      `@smogon/calc`'s own bundled `breaksProtect` condition
      (`gen789.js`'s `attacker.hasAbility('Unseen Fist') &&
      move.flags.contact`, confirmed live in `node_modules`) that already
      lets Unseen Fist through Protect at mainline's un-nerfed 100% — we
      only need to correct the multiplier, not the pass-through itself.
    - Defender-side: `move.flags.contact &&` defender's ability slug is
      `aura-guard` → scale by `contactDamageTakenMultiplier`. Same shape as
      `@smogon/calc`'s own bundled Fluffy handling (`gen789.js`), just for
      an ability the bundled Gen 9 data has no idea exists.
    - Both checks are independent and compose multiplicatively if they were
      ever both true at once (not a real matchup today — just means the
      code doesn't need to special-case it away).
    - `move.flags.contact` read via `gen.moves.get(toID(slot.name))
      ?.flags?.contact` — same `gen.moves.get` shape `getMultihitRange`
      already uses.
  - **Known limitation, accepted rather than solved**: `result.desc()`/
    `result.kochance()` compute their text from `@smogon/calc`'s own
    internal (un-scaled) numbers, so once we scale `range`/
    `possibleDamages` ourselves those two strings would describe the wrong
    number if left alone. Same fix shape as the existing `blockedEntry()`
    helper (hand-written `desc`, no call to `result.desc()`): add a sibling
    `adjustedEntry()` that builds its own short desc from the scaled
    percent (e.g. "hits through Registeel's Protect for 25% damage (Unseen
    Fist)" / "Lucario-Mega-Z's Aura Guard halves the damage from Close
    Combat") and sets `kochanceText: null`. `percent`/`range`/
    `possibleDamages` stay numerically correct either way since those are
    already computed by us, not read from calc's strings — only the two
    calc-native prose strings lose their normal narration for these two
    abilities.
  - Scaled values are floored per-element, matching how the real games
    truncate fractional HP and how calc's own internal reductions round.
  - Getting "Aura Guard" selectable at all needs no new work:
    `CalcPokemonState.ability` is a plain `string` (not constrained to
    `gen.abilities`), and `CalcPokemonPanel.tsx`'s Mega-evolve flow already
    sets it directly from `megaAbilities.ts::getMegaAbility()` for other
    Champions-invented, calc-unknown ability strings (Eelevate, Dragonize,
    Mega Sol, etc.) — Aura Guard reaches `state.ability` the same way once
    Mega Lucario Z gets a `megaAbilities.ts` entry (that entry is
    [Regulation M-C Prep]'s job, not this leg's).
  Next session: implement the above (new config file +
  `computeSideResults`/`adjustedEntry` changes + a `damageCalcEngine` unit
  test covering both cases) and commit.

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

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

- **[Damage Calc Engine Test Coverage] — Leg 1** *(Last touched: 2026-09-01 ·
  Re-checks: 0)*
  Surfaced by the File Size Cap Cleanup post-mortem
  ([docs/postmortems/file-size-cap-cleanup.md](docs/postmortems/file-size-cap-cleanup.md)):
  `utils/damageCalcEngine.ts` (state factories, boost/stat-multiplier math,
  `buildPokemon`, `computeSideResults`) was pulled out of `useDamageCalc.ts`
  specifically because it's pure and "independently unit-testable," but no
  test file was added in that leg. Still untested.
