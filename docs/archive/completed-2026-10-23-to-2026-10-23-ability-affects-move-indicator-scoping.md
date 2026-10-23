# ChoiceBuds - Completed Work Archive (2026-10-23 to 2026-10-23, Ability-Affects-Move Indicator Scoping)

Archived from `COMPLETED.md`/`TODO.md` at the 2026-10-23 Ability-Affects-Move
Indicator Scoping milestone boundary. See
`docs/postmortems/ability-affects-move-indicator-scoping.md` for the
retrospective.

## Ability-Affects-Move Indicator Scoping

- **[Ability-Affects-Move Indicator Scoping] — Leg 1** (2026-10-23). Scoped
  two related gaps: an in-UI indicator for when a Pokémon's ability
  boosts/affects a specific equipped move, and Type Matchup's missing
  per-Pokémon Mega toggle control. Covered the data shape (a new
  `AbilityMoveBoostRule` table alongside the existing curated ability-effect
  tables), which UI surfaces show the indicator
  (`MoveBubbleGrid.tsx`/`TooltipContent.tsx` via `EditOverlays.tsx`), and
  found the Type Matchup toggle's read-wiring already shipped in Type
  Matchup Rework Leg 3 — the real gap is a missing toggle control, not
  missing resolution logic. All open questions resolved with Vanny the same
  day: Sheer Force hand-curated from Serebii filtered to the Champions
  movepool, the 5 type-changing abilities' retype power boost folded into
  the same table, the badge is a per-move corner dot, and the Type Matchup
  toggle needs independent per-table state rather than reusing the shared
  `usePokemonFormToggle` store — a real scope increase over the doc's
  initial framing. No code changed (scoping-only leg); see
  `docs/investigations/ability-affects-move-indicator.md`. See commit
  `800378d8a689ddc82f903571e26bb7acbc8f87c0`.
