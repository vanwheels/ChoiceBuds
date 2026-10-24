---
paths:
  - "src/renderer/components/**"
---

# Type-colored UI elements

From Ability-Affects-Move Indicator & Type Matchup Mega Toggle's post mortem
(`docs/postmortems/ability-affects-move-indicator-and-type-matchup-mega-toggle.md`):
two legs each shipped a new visual element onto an already-colorful surface
and only found a problem with it (invisible border, cramped/uneven layout)
after live-testing one example case, not before.

- Before calling a leg live-verified, if it adds a badge, outline, or
  overlay onto a surface colored by `config/pokemonTheme.ts`'s type colors
  (move bubbles in `MoveBubbleGrid.tsx`, sprite cells in `CoverageTable.tsx`,
  etc.), spot-check the new element's contrast against at least one light
  type color (e.g. Electric's `bg-yellow-400`) and one dark one — not just
  whatever species the live test happens to use.
- Before calling a leg live-verified, if it adds a column/row to an
  existing dense table, check the real rendered widths/spacing at the
  actual element count, not just that the data renders correctly.
