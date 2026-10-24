# ChoiceBuds - Completed Work Archive (Display Bug Fix Sweep)

Archived from `COMPLETED.md` at the 2026-10-24 Display Bug Fix Sweep
milestone boundary. Named with the milestone slug since it shares its date
range with the Search & Filter: Tag-Chip Redesign archive.

**[Type-Changing Ability Move Badge Color] — Leg 2** (2026-10-24): Move
bubbles on Team/Box/Builder cards (`MoveBubbleGrid.tsx`) and the shared move
tooltip (`TooltipContent.tsx`) now color via
`config/typeChangingAbilities.ts`'s `getEffectiveMoveType` instead of the
move's raw listed type, so an equipped type-changing ability (Aerilate/
Pixilate/Refrigerate/Galvanize/Normalize/Liquid Voice) retints both to the
ability-transformed type, matching Type Matchup's Offensive Coverage.
`MoveBubbleGrid` takes the same Mega-aware ability `EditOverlays.tsx`
already resolved for the move-boost indicator. Live-verified in the running
app: confirmed both the bubble color and tooltip type badge update for a
Pokémon holding one of the six abilities. See commit
bf08e2edd692087e04fed3b4e2c2b4376a5cf201.

**[Mega Form List Ordering] — Leg 1** (2026-10-24): Mega-Stone rows in
`AddPokemonStatTable.tsx` now splice in directly below their own base
species (grouped by species name into a Map) instead of all trailing the
full base-species list. Live-verified in the running app: confirmed Mega
rows now render immediately under their base species. See commit
b17f9405a1e807f97d810ad0ee8db8228a371ad8.
