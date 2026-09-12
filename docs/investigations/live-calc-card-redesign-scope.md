# Live Calc Player/Opponent Card Redesign — Scoping Session

Design-questions pass for the mockup Vanny sent 2026-09-11 (hand-drawn sketch
of the redesigned Player/Opponent panels), unblocking `TODO.md`'s
`[Live Calc Player/Opponent Card Redesign] — Leg 1`. Resolves into that leg's
now-current spec, and absorbs two previously-separate open items
(`Live Calc Feedback Pass 2` Legs 4 and 6 - see below).

## The mockup

Both panels get a unified stat table: Base / SP / Boost / Total columns,
one row per stat (HP/Atk/Def/SpA/SpD/Spe), with a running SP-total footer
(`66/66` for the fully-known Player side). The Base/Mega forme toggle moves
to sit beside the species field. Level and Gender fields make room for it.
Opponent's SP column shows `0-32` per stat until an observation narrows it
(e.g. `10-32`), and Opponent's Total column shows the *range* from absolute
min to absolute max rather than a single number. A Status field appears on
the Opponent card for the first time.

## Resolved (2026-09-11, Vanny's calls)

- **HP Stat Points never assume a nonzero default.** The engine's existing
  `HP_SP_DEFAULT = 16` (`utils/liveCalcEngine.ts`) was a deliberate v1
  approximation (see `live-calc-stat-inference-scope.md`), flagged as its own
  open item (`Live Calc Feedback Pass 2` — Leg 6). Vanny's call: HP should
  always start the calc at 0 SP, not 16, in both the inference engine's
  internal candidate-building AND the actual/known-Pokémon default state.
  This **fully resolves Leg 6** — not with the "hybrid brute-force" fallback
  that doc's header flagged as the eventual fix, just a constant change.
  Checked: `damageCalcEngine.ts::defaultPokemonState()` already zeroes `sps`
  (including HP) for the actual/known side, so only `liveCalcEngine.ts`'s 4
  internal `HP_SP_DEFAULT` usages need to change (effectively drop the `hp:`
  override since `ZERO_SPS` already has `hp: 0`). Leg 6 can be deleted from
  TODO.md once this ships as part of this leg.
  This does NOT make HP an inferred/narrowed range - there's still no
  HP-based observation mechanism. The Opponent card's HP row's Total column
  reads `0-32 SP factored` (no nature effect on HP) same as the mockup shows,
  but that span reflects "we assume 0 SP, this row's max is just the
  theoretical ceiling for context" rather than a real narrowing state - it's
  the one row that's always fully un-narrowed.
- **Total range narrows once nature locks in.** For any stat still spanning
  the full min/max, the formula is (-nature multiplier, 0 SP) to (+nature
  multiplier, 32 SP) while nature is unknown. Once Known Nature is set, every
  stat's Total range uses that nature's actual multiplier (1.0 neutral, 1.1
  boosted, 0.9 lowered) instead of continuing to span both — even for stats
  the known nature doesn't directly affect.
- **Total factors in a known stage Boost.** If the Opponent panel's Boost
  field for a stat is nonzero (an observed Intimidate, Swords Dance, etc.),
  the Total range includes that stage multiplier the same way the existing
  Player-side `CalcStatRows.tsx` already does (`boostedStats` = base + SP +
  nature + stage boost). No inconsistency between the two panels' definition
  of "Total."
- **Atk/SpA rows get surfaced, not newly computed.** `atkBound`/`spaBound`
  already exist in `LiveCalcInference` (Bidirectional Inference Engine,
  earlier rework leg) - the panel just never rendered them. This leg adds
  their `StatBoundBar`s alongside the existing Def/SpD/Speed ones; no engine
  work needed here.
- **Gender field stays, just repositioned.** Not dropped - it feeds
  `@smogon/calc`'s Rivalry ability calc
  (`damageCalcEngine.ts` → `gender: state.gender || undefined`), so removing
  it outright would silently break Rivalry matchups. Fix is layout: shrink
  the species search box's width slightly so the existing gender toggle fits
  next to it alongside the forme toggles, instead of removing it. Level does
  get dropped from the visible panel (VGC is always Lv50).
- **Opponent Status field absorbs `Live Calc Feedback Pass 2` — Leg 4**
  wholesale (add a Status select to `LiveCalcDefenderPanel`, same shape as
  `CalcPokemonPanel`'s existing one) - **but this isn't just a UI field.**
  Vanny flagged that status has real damage/speed effects (burn halves
  physical damage, paralysis cuts Speed, Hex/Facade care whether any status
  is present, etc.) that must actually apply once the Opponent can be marked
  Burned/Paralyzed/etc., not just display cosmetically.
  Checked: `@smogon/calc` already implements all of this internally once a
  Pokémon object's `status` field is set (confirmed `applyBurn`,
  `hasStatus('par')` doubling, `Facade`'s status check, etc. in
  `node_modules/@smogon/calc/dist/mechanics/gen789.js`) - the Player/Attacker
  side already benefits from this today via its own Status field. So this is
  wiring work, not new calc logic: add `defenderStatus`/`setDefenderStatus`
  state to `useLiveCalc.ts` and thread it into every place the Opponent gets
  built as a `Pokemon` object for a calc (both move-range grids' directions,
  and the inference engine's own candidate builds where relevant) - confirmed
  no `status` reference exists anywhere in `liveCalcEngine.ts`/`useLiveCalc.ts`
  today, so this genuinely isn't wired at all yet.

## Not in scope for this leg

- **Real VGC usage data (common spreads/natures/movesets) as an inference
  input.** Vanny raised this as a good future tie-in while discussing the
  mockup, not as part of this leg's ask - flagging it here as scope creep
  caught during scoping rather than folded in. `CalcPokemonPanel` already
  auto-fills the *Player* side's ability/item/nature/SPs/moves from
  Champions ranked-ladder usage data (`services/championsBattleData.ts`) as
  a starting point a user can override - the open question is whether the
  same idea for Live Calc's Opponent side means (a) a similar one-time
  auto-fill suggestion once a species is picked (small, mirrors existing
  Player-panel behavior), or (b) using usage frequency as a weighted prior
  inside the narrowing/candidate-elimination math itself (a materially
  larger change to `liveCalcEngine.ts`'s current deterministic
  elimination-based approach). Logged as its own unscoped item in TODO.md's
  Unscheduled section pending that answer.
