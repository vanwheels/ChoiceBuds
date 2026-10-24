# Ability-Affects-Move Indicator & Type Matchup Mega Toggle — Post Mortem

Milestone ran 2026-10-23, three legs, same day start to finish. Scoping was
done as its own prior milestone (Ability-Affects-Move Indicator Scoping,
`docs/investigations/ability-affects-move-indicator.md`).

## What shipped

- `config/abilityMoveBoosts.ts`: a new `AbilityMoveBoostRule` table covering
  all four rule shapes identified in scoping (by-flag, by-effective-type,
  by-base-power-threshold, explicit move-list), plus the five type-changing
  abilities' same-type boost folded in as a distinct `retype-conversion`
  rule kind, and a hand-curated, Champions-filtered Sheer Force move list.
  Commit abcb7d9.
- The indicator wired into every `EditOverlays`-based card
  (`MoveBubbleGrid.tsx`'s corner badge, `TooltipContent.tsx`'s effect text),
  evaluated against the Mega-displayed ability. Commit e156367.
- Independent per-table Mega preview toggles on Type Matchup's Offensive and
  Defensive Coverage tables, with page-local state so toggling one table
  never leaks into the other or into the Team card's own toggle; split-form
  badges gated to the real held stone. Commit 98f8278.

Both `TODO.md` done-when bullets are met — confirmed against the COMPLETED.md
entries above, all three hashes resolve (`git cat-file -e`). Full suite green:
93 test files / 929 tests passing, lint clean, type-check clean.

## What went well

- The prior scoping milestone did real work, not just a restatement of the
  ask: it caught that the Type Matchup toggle needed genuinely independent
  per-table state (not a second read of the shared `usePokemonFormToggle`
  store) *before* Leg 3 started, flagging it explicitly as "a real scope
  increase." Leg 3 then sized and built it as a known cost instead of
  discovering it mid-leg.
- Leg 3 proactively applied `.claude/rules/form-toggle-features.md`'s
  standing guidance (gate a split-form badge to the real held stone so a
  toggle never looks active without changing anything) — a lesson written
  down after Mega & Alt-Form Representation's post mortem was followed
  before live testing this time, not rediscovered by it.
- Each leg stayed single-purpose (data/logic, then card UI, then Type
  Matchup UI) and shipped same-day with its own live verification recorded
  in COMPLETED.md the same session, per the "record live verification when
  it happens" convention.
- A real adjacent bug (Type-Changing Ability Move Badge Color, surfaced
  during Leg 3) was correctly *not* folded into this milestone — it was
  split out to `TODO.md`'s Unscheduled section as its own item instead,
  matching the split-scoping-from-building convention.

## What didn't / friction points

- Leg 2: the ability-boost badge's `accent-gold` border was invisible
  against Electric-type move bubbles (`bg-yellow-400`) — caught only by
  live-testing against one specific Pokémon (Infernape/Iron Fist), not by
  checking the new visual element against the type-color palette ahead of
  time. Fixed same-session (`border-zinc-900`).
- Leg 3: the sprite row read as cramped and the two aggregate-count columns
  had uneven widths — again caught only after live feedback, not
  anticipated during layout.
- Same underlying gap both times: a new visual element added to an
  already-colorful surface (move bubbles, a dense table header) wasn't
  checked against the full range of colors/widths it would actually sit
  next to before being called live-verified. Live verification against one
  example case isn't the same as checking the element against its full
  range of contexts.

## Scope creep observed

None. The one adjacent finding (move badge color using raw type instead of
effective type) was correctly deferred rather than absorbed.

## What changes for the next milestone

1. Before closing any leg that adds a badge, outline, or overlay onto a
   type-colored surface (`config/pokemonTheme.ts`'s type colors, used by
   `MoveBubbleGrid.tsx` and others), spot-check the new element's contrast
   against at least the lightest type color (Electric/Steel-ish yellows)
   and one dark one, not just whatever species the live-verification pass
   happened to use. This is an active check, not just a note — add it to
   the relevant rule file so it's asked every time, not just remembered.
2. When a leg adds a new column or row to an existing dense table
   (`CoverageTable.tsx` and similar), check real rendered widths at the
   actual column count before calling it live-verified — a table laid out
   and tested with the same data it already had doesn't surface spacing
   regressions from a newly added element.

## Rule promotion

Both lessons are the same pattern (visual elements under-checked before
live verification) and scoped to specific file types, so they fit a new
project-level rule file rather than `CLAUDE.md` itself:

- New `.claude/rules/type-colored-ui-elements.md`, scoped to
  `src/renderer/components/**` files that render against
  `config/pokemonTheme.ts` type colors: before calling a leg
  live-verified, spot-check new badges/overlays against at least one light
  and one dark type-background color, not just the live-test species.

This is project-specific (ChoiceBuds' type-color palette), so it doesn't
promote to the global CLAUDE.md or a cross-project rule.
