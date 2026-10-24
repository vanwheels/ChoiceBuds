# Completed work archive: 2026-10-23 to 2026-10-23 (Ability-Affects-Move Indicator & Type Matchup Mega Toggle)

Split out of `COMPLETED.md` at the 2026-10-23 Ability-Affects-Move Indicator
& Type Matchup Mega Toggle milestone boundary. The three legs below shipped
that milestone — see
[docs/postmortems/ability-affects-move-indicator-and-type-matchup-mega-toggle.md](../postmortems/ability-affects-move-indicator-and-type-matchup-mega-toggle.md).

## [Ability-Affects-Move Indicator & Type Matchup Mega Toggle] — Leg 3 (2026-10-23)

`TypeMatchupPage.tsx` gained its own page-local `megaFormsByTable` state
(keyed by table then by `ImportedPokemonInfo.id`) instead of a second read
of the shared `usePokemonFormToggle`/`useActiveFormsForIds` store the Team/
Box card uses - so toggling a Mega in one coverage table never affects the
other table or the card's own toggle. `CoverageTable.tsx`'s header `<th>`
sprite wires it in: a single-form Mega-capable species reuses
`MegaFormToggleBadge` exactly as the card does; Charizard/Raichu's X/Y split
renders one small letter badge per form, but - since this is a team's
already-known, fixed held item rather than an opponent's unconfirmed one,
and `useTeamMoveTypes.ts`'s own held-item gate was out of scope to change -
only the letter matching the real held stone can ever light up, avoiding a
toggle that looks active but silently changes nothing downstream (the
form-toggle-features.md check this leg called for). The sprite itself also
swaps to the Mega form while genuinely active (`getCachedMegaSprite`, cache
warmed via a new `useMegaSpritePrefetch()` call), and all header `<th>`s
were given a uniform `w-20` with the two aggregate-count columns' text
wrapping instead of forcing `whitespace-nowrap` width, both fixed same-
session after live feedback that the sprite row felt cramped and the
columns uneven. Live-verified: Mega toggle isolation between tables and the
Team card, split-form re-toggling, sprite swap, and the widened/uniform
column layout. See commit 98f8278.

## [Ability-Affects-Move Indicator & Type Matchup Mega Toggle] — Leg 1 (2026-10-23)

New `config/abilityMoveBoosts.ts` (`AbilityMoveBoostRule`, keyed by ability
slug) covering all four rule kinds from the scope doc - by-flag (Iron
Fist/Strong Jaw/Mega Launcher/Tough Claws), by-effective-type (Steely
Spirit/Transistor/Dragon's Maw), by-base-power-threshold (Technician), and
move-list (Sheer Force, hand-curated from Serebii and filtered against
`championsMovepoolChanges.ts`'s `GLOBALLY_REMOVED_MOVES`) - plus the 5
type-changing abilities' folded-in same-type boost (Pixilate/Aerilate/
Refrigerate/Galvanize/Normalize), modeled as a distinct `retype-conversion`
kind rather than a literal effective-type match, since the real mechanic
only boosts a move actually *converted* from Normal (Normalize is the one
exception, boosting every move unconditionally). Pure data/logic, no UI
wiring. See commit abcb7d9.

## [Ability-Affects-Move Indicator & Type Matchup Mega Toggle] — Leg 2 (2026-10-23)

`EditOverlays.tsx` runs Leg 1's per-move ability-boost check once (against
the Mega-displayed ability, so the indicator follows a Mega's forced
ability the same way the ability capsule already does) and feeds it to
`MoveBubbleGrid.tsx`'s corner badge and `TooltipContent.tsx`'s effect text
next to the flag-tag row. Live-verified against Iron Fist + Fire
Punch/Thunder Punch on Infernape across desktop Team card, Box card, and
Builder; that pass caught the badge's `accent-gold` border disappearing
against Electric's `bg-yellow-400` move bubble, fixed same-session by
switching the badge's outline to `border-zinc-900` so it reads against
every type color, not just the darker bubble backgrounds. See commit
e156367.
