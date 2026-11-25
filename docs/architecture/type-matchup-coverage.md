# Type Matchup coverage

Deep-dive split out of `ARCHITECTURE.md`; the summary there links here.

`components/typematchup/TypeMatchupPage.tsx` picks a saved team and renders
two tables (`CoverageTable.tsx`, one each for Offensive/Defensive), modeled
on vgcmulticalc.com's type-calc tool. No third panel exists below them —
Type Matchup Rework removed the former ladder-usage Team Gap Analysis panel
outright rather than replacing it; a same-leg attempt at a "Coverage Gaps"
replacement was dropped as redundant with the Defensive table's own Weak/
Resist columns (see
`docs/postmortems/type-matchup-rework.md`).

- **Cell coloring** (`CoverageCell.tsx`): color encodes favorability to the
  viewing team (caller passes `favorableWhenAbove1`, since a 2x is good
  offensively but bad defensively), and intensity grades by magnitude within
  that direction — mild (2x/0.5x) vs. extreme (4x/0.25x) get distinct
  shades, with immune always a neutral gray badge regardless of direction.
  `CoverageTable.tsx`'s own aggregate Weak/Resist and Not Very Effective/
  Super Effective count badges threshold-color by count (0 / 1-2 / 3+).
- **Offensive Coverage** uses each member's actual damaging moves
  (`hooks/useTeamMoveTypes.ts`), accounting for type-changing abilities
  (`config/typeChangingAbilities.ts`, e.g. Pixilate). **Defensive Coverage**
  uses each member's own typing, accounting for type-immunity abilities
  (`config/typeImmunityAbilities.ts`) via `utils/typeCoverage.ts`'s
  `getDefensiveMultiplier`.
- **Mega/alt-form awareness, independent per table**: each table has its
  own Mega *preview* toggle, deliberately **not** a read of the shared
  `usePokemonFormToggle` store the Team card uses (see `mega-alt-form-toggle.md`).
  `TypeMatchupPage.tsx` holds page-local
  `megaFormsByTable` state keyed by table (`offensive`/`defensive`) then by
  slot id, so flipping a Mega preview in one table never affects the other
  table or the Team card's own toggle. `CoverageTable.tsx`'s header `<th>`
  wires the control in (single-form species reuse `MegaFormToggleBadge`;
  Charizard/Raichu's X/Y split renders one letter badge per form, gated to
  the slot's real held stone so a toggle can never look active without
  changing anything downstream). The shared, tested pure functions —
  `megaEvolution.ts::resolveActiveMegaSlug`,
  `megaAbilities.ts::resolveActiveAbility`,
  `typeCoverage.ts::resolveDefensiveSlot` (typing/ability sourced from
  `@smogon/calc`'s species dex, the only in-repo source for a Mega form's
  own types) — still do the actual resolution once a slug is picked, same
  as `EditablePokemonCore.tsx`'s Mega Team Card Flip; only *which* toggle
  state feeds them differs here. `useTeamMoveTypes.ts`/`typeCoverage.ts`'s
  resolution logic itself was unchanged by this — this is a pure
  UI-affordance/state-shape addition over already-correct data. Aegislash
  needs no equivalent handling here since its Blade/Shield toggle never
  changes typing or ability.
