# Team Builder Real Sets Integration — Scoping Session

Scoped 2026-09-15, per `[Team Builder Real Sets Integration] — Leg 1`'s own
text ("Not scoped - needs both a placement decision... and a visual
treatment decision"). Scoping-only, no code touched — see
[[feedback_split_scoping_from_building]].

## Findings

- `PokemonCard.tsx` (Team Builder's roster card) is a fixed-width (~280px)
  always-inline-editing card, not a modal/overlay — `EditOverlays.tsx`
  refers to the floating item/ability/move *pickers* it hosts, not a
  card-level edit mode. There is no per-Pokemon expand/collapse affordance
  today (`expandedCardIds` only exists on `useSavedPokemon.ts`/`BoxPage.tsx`
  for the Saved Builds Box; `TeamCard.tsx`'s own `isExpanded` toggles a whole
  team's roster grid, not one Pokemon's card).
- That card's resting height is a live sensitivity: `[Team Card Grid Layout
  Re-check] — Leg 1` (Blocked, `TODO.md`) hand-tuned the roster grid's
  column-count breakpoints against exact measured card heights on a 14"
  MacBook. Any change that grows a roster card's default height risks
  reopening that tuning.
- The existing "pick a whole set to fill this Pokemon" precedent in Team
  Builder is `SavedSetPicker` — a popover that only appears contextually
  (on Roster Swap, when saved builds exist for the picked species), not an
  always-visible card section.
- The item/ability/move pickers already establish an on-demand
  trigger-button → `FloatingCardPanel` pattern (`EditOverlays.tsx`), with
  zero footprint on the card until opened.
- `realSetBundleToCalcUpdates` (`utils/calcTeamImport.ts`) targets Calc's
  own `CalcPokemonState` shape, not `ShowdownPokemon` — Team Builder needs
  its own small mapper. Trivial: `VgcRealSetBundle.evs` already uses the
  same `hp/attack/defense/specialAttack/specialDefense/speed` field names as
  `ShowdownPokemon.evs` (no SP-scale conversion needed either, same as the
  Calc mapper), so the new mapper is just `{ item, ability, nature, moves,
  evs: bundle.evs }`.
- `useVgcPastesCache`/`useVgcRealSetsCache` are currently mounted once in
  `CalcPage.tsx` and threaded down to both Calc panels as shared props,
  specifically to avoid a persisted-cache write race between independent
  hook instances (see `COMPLETED.md`'s Calc Panel Real Sets UI Leg 4). A
  team's roster can hold up to 6 `PokemonCard`s; the same race applies here
  and needs the same fix — mount once at a shared ancestor (`TeamsPage.tsx`
  is the natural candidate, mirroring `CalcPage.tsx`) and thread down
  through `TeamCard.tsx` to each `PokemonCard`, not one hook instance per
  card.

## Decided (via `AskUserQuestion`)

- **Placement: on-demand floating panel**, not an inline card section and
  not a separate context-menu view. A new small trigger button opens a
  `FloatingCardPanel` over the card, same shape as the existing item/
  ability/move pickers — zero resting footprint, so it can't touch the
  fragile grid-layout tuning above. Rejected the inline-section option
  (matches the Calc tab's own precedent, but adds a label+toggle row to
  every one of up to 6 roster cards at rest and grows card height on
  expand) and the context-menu-view option (fully decoupled from the
  card, but a new UI surface with no reuse of an established pattern).
- **Visual treatment: reuse `CalcRealSetsSection`'s existing bundle-card
  list styling inside the floating panel**, rather than designing a new
  layout. The floating-panel placement makes this close to a direct port —
  `CalcRealSetsSection` already renders a scrollable card list; it just
  needs to live inside a `FloatingCardPanel` anchored to the new trigger
  button instead of always-rendered inline, and its collapsed/expanded
  toggle goes away entirely (the floating panel itself is the on-demand
  affordance now).

## Resulting leg

- **[Team Builder Real Sets Integration] — Leg 2** — build the above:
  - Mount `useVgcPastesCache`/`useVgcRealSetsCache` once in `TeamsPage.tsx`,
    thread down through `TeamCard.tsx` to each `PokemonCard`/`EditOverlays`.
  - New trigger button on the card (styling/placement matching the existing
    item/ability/move triggers) opening a `FloatingCardPanel` containing an
    adapted `CalcRealSetsSection` (drop the collapse/expand toggle - the
    panel's own open/close is that affordance now).
  - New `realSetBundleToShowdownUpdates` mapper (`utils/calcTeamImport.ts`
    or a Team Builder-side equivalent) - trivial field copy, no SP-scale
    conversion, per the Findings above.
  - Regulation for the lookup comes from the team's own `rulesetId` (already
    threaded into `EditOverlays`), same as Calc's `regulationId` - no new
    regulation-selection UI needed.
