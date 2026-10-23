# Ability-Affects-Move Indicator + Type Matchup Mega Toggle — Scope

Scoping only (Ability-Affects-Move Indicator Scoping, Leg 1) — no code in
this leg. Covers two related gaps surfaced 2026-10-22/23: an in-UI signal
for when a Pokémon's equipped ability boosts/affects one of its equipped
moves (e.g. Iron Fist on Fire Punch but not Close Combat), and Type
Matchup's missing per-Pokémon Mega toggle control.

## Part 1: Ability-affects-move indicator

### Data shape

The codebase already has four curated per-ability effect tables in
`config/`, each with its own rule-shape union because the real game
mechanic doesn't fit one shared shape:
`typeChangingAbilities.ts::TypeChangeRule`, `moveBlockingAbilities.ts::BlockRule`,
`hitReactiveAbilities.ts::HitTrigger`, `reactiveAbilities.ts` (flat
stat-stage map). A new table for "ability boosts move X's power" fits this
same pattern — a `Record<string, AbilityMoveBoostRule>` keyed by ability
slug, where `AbilityMoveBoostRule` is a small union over how the rule picks
out which moves qualify:

- **By move flag** (reuses `config/moveFlags.ts`'s existing `MoveFlagKey`
  union — `punch`/`bite`/`pulse`/`contact`/etc. are already tagged per move
  via `MoveData.flags`, including `contact` itself even though it's
  excluded from `VISIBLE_MOVE_FLAGS`'s *displayed* tag set): Iron Fist
  (punch), Strong Jaw (bite), Mega Launcher (pulse), Tough Claws (contact).
- **By move type** (`MoveData.type`, already resolved with ability-based
  type *changes* via `typeChangingAbilities.ts::getEffectiveMoveType` —
  this new rule should check the *effective* type, not the base type, so
  e.g. a Normal-type move under Aerilate still correctly reads as a Flying
  move for any future Flying-boosting ability): Steely Spirit (Steel),
  Transistor (Electric), Dragon's Maw (Dragon), etc.
- **By base-power threshold**: Technician (`power !== null && power <= 60`
  — note this needs the move's power *before* Technician's own boost is
  applied, i.e. read `MoveData.power` directly, not a result already run
  through the boost).
- **Explicit move-list** (same shape `moveBlockingAbilities.ts`'s
  `bulletproof`/`overcoat`/`damp` entries already use, for a move family
  with no existing flag/type grouping that fits).

One real gap found during this scoping pass: **Sheer Force** boosts any
move with a secondary effect while also removing that effect, but
"secondary effect" isn't fully derivable from existing data.
`MoveData.meta` (`gameData.ts:68`) already carries PokeAPI's
`ailment`/`ailmentChance`/`flinchChance`/`critRate` — enough to flag a move
like Flamethrower (burn chance) or Rock Slide (flinch chance) — but not a
chance-based *stat* secondary effect (Rock Smash's 50% Def-1,
`moveStatEffects.ts`'s own header lists these as deliberately excluded from
that file for the same "can't confirm it fired" reason, but that
exclusion was about auto-applying an effect in the Battle Logger, not
about identifying that a move *has* one). A dedicated Sheer Force rule
would need either a new hand-curated move-list (same shape as the
explicit-list rule above) or accepting partial coverage from
`meta` alone — Vanny's call, flagged as an open question below rather than
decided here.

**Decided (2026-10-23):** hand-curate the Sheer Force move list, sourced
from Serebii's dedicated ability page
(`serebii.net/abilitydex/sheerforce.shtml` — covered by this repo's
external-data-sources exception #2, manual research for hand-authoring
static config), filtered down to only the moves that exist in the app's
own Champions movepool data (Serebii's list includes mainline moves not in
Champions).

Also explicitly **out of scope for this new table**: the five type-changing
abilities' own 1.2x same-type power boost (Pixilate/Aerilate/Refrigerate/
Galvanize/Normalize) — `typeChangingAbilities.ts`'s header already
documents this as a known gap in its own narrower "type coverage only"
scope. Folding that boost into this new table (as a by-move-type rule keyed
off each ability's own retype target) is natural and should reuse
`getEffectiveMoveType`'s existing retype logic rather than re-deriving it,
but it's called out explicitly so a build leg doesn't silently skip it
thinking it's someone else's gap.

### UI surface

Every editable Pokémon display in the app (desktop/mobile Team card, Box
card, Team Builder — confirmed via `EditablePokemonCore` import sites:
`PokemonCard.tsx`, `MobilePokemonCard.tsx`, `BoxEntryModal.tsx`,
`MobileBoxPokemonCard.tsx`) renders its item/ability/moves through one
shared `EditOverlays.tsx`, which already holds both the equipped ability
(`selectedAbility`) and the four equipped moves' full `MoveData`
(`moveDataSlots`) in the same component. That's the one place a per-move
"does the current ability affect this move" check can run once and feed
two existing children:

- **`MoveBubbleGrid.tsx`**: a small badge/corner-dot on a bubble whose move
  qualifies (same visual language as `MegaFormToggleBadge`'s corner-badge
  treatment elsewhere in this card) — the "glanceable, no hover needed"
  half of the ask.
- **`TooltipContent.tsx`**: the per-move hover tooltip already renders
  type/category/power/flags/description for whichever move is hovered;
  the specific effect text (e.g. "+20% power — Iron Fist") slots in next to
  the existing flag-tag row, and this component already receives
  `selectedAbility` as a prop (passed for the ability tooltip itself), so no
  new prop plumbing is needed to reach it from `EditOverlays`.

**Explicitly out of scope for this indicator:**

- **The Calc tab** (`CalcMoveGrid.tsx`/`CalcPokemonPanel.tsx`): a
  structurally separate move-row component, not routed through
  `EditOverlays`/`MoveBubbleGrid` at all. More importantly, the Calc's
  damage % already reflects every ability-move interaction through
  `@smogon/calc`'s own engine — the number itself is the answer this
  indicator exists to give on surfaces that *don't* show a damage number.
  Per the original ask ("visible without leaving the app to check... the
  calc"), the Calc is the thing this feature replaces a trip to, not a
  second place to add it.
- **Static/read-only move displays** (`TeamPosterTile.tsx`'s export
  rendering, `ProfilePokemonTile.tsx`/`ProfilePokemonRow.tsx` on profile
  pages): these are presentational snapshots for sharing/export, not the
  in-the-moment team-building context the ask is about. Can be revisited
  later if wanted, but not part of this scope.

### Open questions for Vanny before a build leg is cut — resolved 2026-10-23

1. ~~Sheer Force: accept partial coverage...~~ **Decided: hand-curate from
   Serebii, filtered to Champions movepool** (see above).
2. ~~Fold the 5 type-changing abilities' power boost...~~ **Decided: fold
   into the same table.**
3. ~~Badge visual...~~ **Decided: corner dot/badge on the move bubble
   itself** (`MoveBubbleGrid.tsx`, same visual language as
   `MegaFormToggleBadge`'s corner-badge treatment) — not an ability-level
   checkbox; the per-move distinction (Iron Fist affects Fire Punch but not
   Close Combat) is the point of the feature, so the indicator has to live
   on the move, not the ability.

## Part 2: Type Matchup mega toggle

Re-reading `TypeMatchupPage.tsx`/`CoverageTable.tsx` during this scoping
pass found the gap is narrower than the TODO entry's framing suggested.
**The read-wiring already exists**: both coverage tables resolve a slot's
active Mega form through the same shared `usePokemonFormToggle` store the
Team card writes to (`useActiveFormsForIds` + `resolveActiveMegaSlug` /
`resolveDefensiveSlot`), wired up in Type Matchup Rework Leg 3
(`COMPLETED.md`) — so if a Pokémon's Mega toggle is already flipped on from
its Team card, Offensive/Defensive Coverage already reflect the Mega's
typing/ability correctly today.

**The actual gap**: there's no toggle *control* anywhere on the Type
Matchup page itself. To see a Mega's coverage, a user has to leave this
page, find that Pokémon's Team card, flip its badge there, then come back
— exactly the "leave the app" friction this milestone's framing is about,
just within the app's own tabs instead of out to Serebii.

### Where it plugs in

`CoverageTable.tsx`'s header row already renders each team slot's sprite
in its own `<th>` (`CoverageTable.tsx:60-79`) — the natural anchor point
for a small corner badge, same position `MegaFormToggleBadge` already
occupies on the item sprite box elsewhere. Two cases, mirroring the
existing split in `config/megaEvolution.ts`:

- **Single-form Mega species** (the common case — one stone, one form):
  reuse `MegaFormToggleBadge` as-is, wired to
  `usePokemonFormToggle(pokemon.id).toggleActiveForm(megaSlug)` where
  `megaSlug` comes from `getMegaApiSlug(pokemon.showdownData.item,
  pokemon.showdownData.species)`. Only rendered when that call returns
  non-null (species is holding its own stone) — same gating
  `EditablePokemonCore` already uses.
- **Split-form species** (Charizard X/Y, Raichu X/Y): a plain badge can't
  disambiguate which form to show. `config/megaEvolution.ts::getMegaFormsForSpecies`
  already returns every stone/suffix pair for a species, and
  `resolveOpponentMegaControl`'s `{ kind: 'choice' }` shape (built for the
  Battle Logger's own X/Y picker) is the same disambiguation problem —
  worth reusing that shape (or factoring a shared "has real ambiguity"
  check out of it) rather than inventing a second one. Per
  `.claude/rules/form-toggle-features.md`'s standing guidance, the picker
  must stay open to correction (never collapse to a one-way badge once a
  choice is made) — same reasoning that rule already documents for the
  Battle Logger's own picker.

No changes needed to `useTeamMoveTypes.ts`/`typeCoverage.ts`'s resolution
logic itself — both already consume `activeForms` correctly; this is a
pure UI-affordance addition over already-correct data.

### Open question for Vanny — resolved 2026-10-23

**Decided: per-table control**, with genuinely independent state — Vanny's
chosen option was explicitly "in case there's ever a reason to view one
table mega'd and the other not," not just a duplicated control over the
same shared value. This means this toggle **cannot** be a second read of
`usePokemonFormToggle` as-is (that store is per-Pokémon-id, shared
everywhere, including the Team card badge) — it needs its own
page-local/per-table state dimension for Type Matchup specifically,
separate from the Team card's mega toggle. A build leg needs to design that
state shape (likely a small local store or page-level state keyed by
`(slotId, table)` rather than reusing the global store), not just wire the
existing badge into two places. This is a real scope increase over the
"pure UI-affordance addition over already-correct data" framing earlier in
this doc — flag this explicitly when sizing the build leg.
