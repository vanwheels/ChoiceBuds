# Add Pokémon Table: Mega Form Rows — Scoping (Leg 1)

Scoping pass for the item deferred out of Add Pokémon: Sortable Base-Stat
Table's Leg 1 (see `COMPLETED.md`). Extends `AddPokemonStatTable.tsx` to
also list Mega forms as their own sortable rows.

## Key finding: no PokeAPI blocker, no hand-typed stats needed

The original TODO note assumed base stats would come from extending
`useMegaSprite.ts`'s per-slug PokeAPI fetch, and that 6 Reg M-C Mega species
(Baxcalibur, Golisopod, Salamence, and the "Mega Z" forms for
Absol/Garchomp/Lucario) were blocked because PokeAPI has no resource for
them yet.

Checked live in `node_modules/@smogon/calc/dist/data/species.js` (already a
project dependency, already used by `SpeedTiersPage.tsx` for Mega
types/base-stats the same way) — it has full `bs` (base stat) entries for
all 6:

| Slug | HP | Atk | Def | SpA | SpD | Spe |
|---|---|---|---|---|---|---|
| baxcalibur-mega | 115 | 175 | 117 | 105 | 101 | 87 |
| golisopod-mega | 75 | 150 | 175 | 70 | 120 | 40 |
| salamence-mega | 95 | 145 | 130 | 120 | 90 | 120 |
| absol-mega-z | 65 | 154 | 60 | 75 | 60 | 151 |
| garchomp-mega-z | 108 | 130 | 85 | 141 | 85 | 151 |
| lucario-mega-z | 70 | 100 | 70 | 164 | 70 | 151 |

So every Mega row's base stats + types can come from `gen.species.get(toID(slug))`
(same `gen` object `SpeedTiersPage.tsx` already holds) — no PokeAPI fetch
extension, no new cache, no user-supplied data. This removes the blocker
entirely.

## Row generation

One row per Mega Stone entry in `config/megaEvolution.ts`'s
`MEGA_STONE_TO_SPECIES` (not one per species) — Charizard X/Y and
Absol/Absol-Z each get separate rows, matching how `getMegaFormsForSpecies`
already models it. Scoped to species already present in the roster prop
`AddPokemonStatTable` receives (already regulation- and
already-on-team-filtered by `TeamCard.tsx`) — same gate
`SpeedTiersPage.tsx`'s `rosterCandidates` loop uses, so a Mega row never
outlives its base species' own legality/dedupe rules.

- **Label:** `Mega {Species}` / `Mega {Species} X` / `Y` / `Z` (matches
  `megaAbilities.ts`'s existing "Mega Absol Z" naming).
- **Stats/types:** `gen.species.get(toID(slug))` (`.bs`, `.types`).
- **Sprite:** existing `useMegaSprite`/`getCachedMegaSprite` cache, same
  fallback-to-base-sprite behavior already established there.

## Selection behavior

Selecting a Mega row creates the **base** species holding that row's Mega
Stone (per Vanny's note) — everything else (ability/moves) stays the normal
usage-based default `buildSlot` already computes; only `item` changes.

Needs a small signature extension:
- `useRosterActions.ts`'s `buildSlot`/`addSlot` gain an optional
  `itemOverride?: string` param (defaults preserve current `item: undefined`
  behavor for every existing caller).
- `AddPokemonStatTable`'s `onSelect` prop gains an optional second arg
  (`itemOverride?: string`) that `TeamCard.tsx`'s `handleAddSpecies` threads
  through to `addSlot`.
- A Mega row's synthetic `SpeciesRosterEntry`-shaped row data carries the
  underlying base species (for `onSelect`) and the stone's item name (for
  the override) — not a new roster entry, just enough to route the click.

## #mega tag (full type/ability integration, per 2026-09-11 decision)

`#mega` is a standalone-filterable tag (only Mega rows shown when active),
and also combines correctly with type/move/ability tags against the Mega
form's **own** stats where those differ from the base species':

- **Type tags** (`#fire` etc.): checked against the Mega slug's own
  `gen.species.get(toID(slug)).types` — synchronous, no new hook/fetch,
  since `@smogon/calc`'s dex is already loaded. Needed because some Megas
  retype (e.g. Mega Gyarados is Water/Dark, not Water/Flying).
- **Ability tags:** checked against `config/megaAbilities.ts`'s
  `MEGA_ABILITIES[slug]` first (the form's actual guaranteed Mega ability,
  which can differ from anything in the base species' normal ability list —
  e.g. `baxcalibur-mega` → Thermal Exchange). Falls back to the base
  species' normal ability-tag membership for the ~1/3 of Mega forms with no
  confirmed override yet (see that file's header) — matches its own
  documented "sprite still swaps, ability untouched" fallback.
- **Move tags:** unchanged — Mega Evolution doesn't alter a species'
  learnset, so a Mega row matches whatever the base species' own move-tag
  membership already says.

No new async hook needed for any of this — both the type and ability lookups
above are synchronous (calc's bundled dex, and a plain config table), so
Mega-row tag filtering doesn't have its own loading state distinct from the
base roster's.

## Legs

- **Leg 2:** Core Mega rows — data source, row generation/labels/sprites,
  `buildSlot`/`addSlot` item-override plumbing, click-to-add behavior.
- **Leg 3:** `#mega` tag + type/ability-aware matching for Mega rows (above).
