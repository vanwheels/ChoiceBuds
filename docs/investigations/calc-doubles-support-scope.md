# Calc Doubles Support — Scoping Session (Killed)

Scoped 2026-09-15, per the flag left 2026-09-14 to revisit once VGCPastes
Real-Set Sourcing's two legs were done. Outcome: **killed**, not deferred —
this is a decision, not a re-check.

## History

Raised 2026-09-11 as "Live Calc Doubles Support" (2 simultaneously-unknown
opponents plus ally-side interactions) alongside Live Calc's own layout
scoping — see `live-calc-layout-rework-scope.md`, which called it out of
scope for that milestone ("we aren't there yet"). Retargeted 2026-09-13 at
the regular Calc/popup once Live Calc was ripped in favor of that popup —
see `regular-calc-popup-scope.md`. Never scoped into legs at either point.

## The call (2026-09-15, Vanny's)

Doubles support for the Calc doesn't get built. Not "not now" — killed as a
feature, on the reasoning that a reliable doubles damage calc doesn't
widely exist for good reason: too much simultaneous variable state to
represent legibly on one screen, and that isn't a UI polish problem you
tune your way out of.

Specific to how this app's calc is built, confirmed during this session:

- `CalcPage`/`useDamageCalc` are a symmetric 1v1 model (`pokemon1`/
  `pokemon2`). Doubles needs 2 attacker slots × 2 defender slots × an ally
  on each side — "which Pokémon is even being asked about" stops having a
  single answer, which isn't a field-state addition, it's a different
  targeting model.
- Redirection (Follow Me/Rage Powder, Lightning Rod/Storm Drain) means the
  move being calculated might not even hit the selected target — no amount
  of extra inputs on today's target-picker model captures that.
- Protect variants are per-target and per-move-category (Wide Guard blocks
  spread moves only; Quick Guard/Crafty Shield gate by category) — no
  equivalent in today's field-state shape.
- Ally-side state (an ally's Intimidate/Tailwind/Aurora Veil/Follow Me
  commitment) changes what's "correct" to calculate even when the ally
  isn't the target — so a correct doubles calc needs a second, non-target
  Pokémon's state represented at all, which today's engine has no concept
  of.

`@smogon/calc` itself only closes the easy part of this gap (a
`field.gameType = 'doubles'` flag drives the 0.75x spread-move reduction
automatically) — the hard part is entirely the representational/targeting
problem above, which is UI and interaction-model work, not something the
underlying library solves by being told the game type.

## Considered and also rejected: the narrow slice

A much smaller, tractable slice was raised — exposing just the spread-move
0.75x damage reduction as a toggle on the existing 1v1 popup, with no ally
modeling, no redirection, and no second defender. Technically buildable
without any of the above problems. Not pursued: Vanny's call was to kill
doubles support as a feature outright rather than ship a partial slice,
so this narrower version wasn't scoped either.

## Disposition

Removed from `TODO.md` entirely (was Unscheduled, not yet scoped). Not a
"Known Exception" — this isn't a stalled investigation, it's a decided
non-feature. Revisit only on a genuine new signal (e.g., a concrete,
specific proposal that resolves the targeting-model problem above), not on
a schedule.
