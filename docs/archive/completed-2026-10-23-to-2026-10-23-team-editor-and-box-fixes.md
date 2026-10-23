# ChoiceBuds - Completed Work Archive (2026-10-23 to 2026-10-23)

Team Editor & Box Fixes milestone's five legs, split out of `COMPLETED.md`
at the 2026-10-23 Team Editor & Box Fixes boundary - named with the
milestone slug since it shares its date range with the Type Matchup Rework
archive.

## Team Editor & Box Fixes — Leg 5 (2026-10-23)

`reconcileSyncedSavedPokemon` never ran an incoming sync record through
`normalizeSavedPokemon`/`bumpUpdatedAtForFixedEntries` before it could win a
merge or get appended, unlike `reconcileSyncedTeams`'s
`normalizeIncomingSyncTeam` step (the gap `.claude/rules/sync-merge-
migration-parity.md` flags). Fixed by adding
`normalizeIncomingSyncSavedPokemonEntry` to `savedPokemonMigrations.ts`,
mirroring `normalizeIncomingSyncTeam`: runs the gender-split-species fix
and bumps `updatedAt` only when that changed something sync-relevant, so
the corrected copy can out-rank the stale sender on the next push. Wired
into `reconcileSyncedSavedPokemon`'s merge-win and append paths. Covered by
new `savedPokemonMigrations.test.ts`/`savedPokemonSyncReconciliation.test.ts`;
full suite (907 tests), lint, and type-check all pass. Passed `/leg-review`
(no findings - confirmed the mirror is faithful to the team-side original,
confirmed the single-Pokemon-per-entry comparison is correct rather than a
shortcut, confirmed no second `applySyncedState` call site was missed).
See commit f5c52d585bbd8734d22118ac50b1f34ac39c15cd.

## Team Editor & Box Fixes — Leg 4 (2026-10-23)

Gated `EditablePokemonCore.tsx`'s Mega sprite (`staticSpriteUrl`/
`animatedSpeciesSlug`) on `activeMegaSlug`, matching how
`displayedTypes`/`displayedBaseStats`/`megaAbilityName` already worked -
previously the sprite swapped to the Mega form as soon as a Mega Stone was
held, before the toggle, while those other properties correctly waited for
it. Live-verified: holding a Mega Stone now shows the base sprite/types/
stats until the toggle is switched on, then sprite/types/stats/Type
Matchup coverage all switch together, checked against both Golisopod
(previously broken) and Aegislash (Blade/Shield toggle unaffected). See
commit 2e52eec101ab5d8b90947858fd7224998a443fc5.

## Team Editor & Box Fixes — Leg 3 (2026-10-23)

Removed the Aegislash Blade/Shield and Maushold Family-Of-Four/-Three form
picker noise from the battle logger's opponent-roster species picker.
`useSpeciesRoster`'s PokeAPI-sourced list surfaces both forms of each as
independently selectable rows - useful in the team builder's own pickers,
where the exact forme matters, but just noise when logging what you saw an
opponent bring. Added `utils/opponentFormNoise.ts` (with unit tests) and
filtered `RecordMatchForm.tsx`'s `opponentPickerRoster` through it only,
collapsing each pair to its canonical default (Aegislash-Shield,
Maushold-Family-Of-Four) without touching the shared `useSpeciesRoster`
hook or any other picker. Live-verified: searching "aegislash" or
"maushold" in Record a Match's opponent picker now shows one entry each.
See commit b83deb9.

## Team Editor & Box Fixes — Leg 2 (2026-10-23)

Replaced the Box's expand-in-place interaction (reflowed the whole grid)
with a `Modal.tsx` popup - the grid slot now always stays the collapsed
tile. Expanded-entry editing moved into its own `BoxEntryModal.tsx`,
mounted once by `BoxPageGrid.tsx` rather than per-card, since live
feedback during the leg asked for prev/next navigation between entries and
a per-card modal instance made cycling visibly close one card's popup and
reopen the next one's; a single instance swapping its `entry` prop instead
avoids that flicker. Also added from the same feedback pass: Escape and
click-outside-the-card both close the popup (`Modal.tsx` gained an opt-in
`onOverlayClick` prop, inert by default for every other modal), and
Left/Right arrow keys or flanking sprite-preview buttons cycle prev/next
within the box's current search-filtered order. `ContextMenu.tsx`'s
z-index moved above `Modal.tsx`'s so a right-click inside the new popup
still opens on top of it instead of behind its overlay. Live-verified
across all of the above (padding/clipping, Escape, click-outside,
prev/next cycling without flicker) on the desktop Box tab. See commit
5f14bf4.

## Team Editor & Box Fixes — Leg 1 (2026-10-23)

Fixed Roster Swap's sprite-box picker never showing Box Pokémon: it called
`AddPokemonStatTable` without the `savedPokemon`/`onSelectSaved` pair
`TeamCard.tsx`'s own "+ Add Pokémon" picker already passed, so its "From
Box" section never rendered there. Mirrored that picker's Species
Clause-filtered saved-pokemon list and wired it through
`rosterActions.loadSavedSet`. Live-verified: swapping via the sprite box
now shows a "From Box" section with Box Pokémon, same as adding a new
slot. See commit c143a34.
