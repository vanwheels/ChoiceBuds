# Ability-affects-move indicator

Deep-dive split out of `ARCHITECTURE.md`; the summary there links here.

`config/abilityMoveBoosts.ts` is a `Record<string, AbilityMoveBoostRule>`
keyed by ability slug, joining the codebase's existing family of curated
per-ability effect tables (`typeChangingAbilities.ts`,
`moveBlockingAbilities.ts`, `hitReactiveAbilities.ts`, `reactiveAbilities.ts`)
with one more: whether the ability boosts a given equipped move's power.
`AbilityMoveBoostRule` is a union over four rule shapes (by move flag, by
effective type via `getEffectiveMoveType`, by base-power threshold, explicit
move-list) plus a fifth `retype-conversion` kind folding in the five
type-changing abilities' own same-type boost (Pixilate/Aerilate/Refrigerate/
Galvanize/Normalize) — modeled separately from a literal effective-type
match since the real mechanic only boosts a move actually *converted* from
Normal, with Normalize as the one unconditional exception. `EditOverlays.tsx`
runs the per-move check once per render (against the Mega-displayed ability)
and feeds the result to `MoveBubbleGrid.tsx`'s corner badge and
`TooltipContent.tsx`'s effect text — the same single-evaluation-point pattern
`EditOverlays` already uses for item/ability tooltips. Out of scope: the Calc
tab (its damage % already reflects every ability-move interaction via
`@smogon/calc`) and static/read-only displays (`TeamPosterTile.tsx`, profile
tiles). The same `getEffectiveMoveType` call also drives the move bubble's
own color and its tooltip's type badge (not just the boost indicator) for a
Mega-aware equipped ability, matching the effective type Offensive Coverage
already shows.
