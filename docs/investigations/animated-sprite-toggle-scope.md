# Animated Sprite Toggle — Scoping Pass (2026-08-31)

Leg 1 of the Animated Sprite Toggle backlog item. This session was scoping
only, per project convention (scoping and building are always separate
sessions) — no implementation happened here. See `TODO.md`'s Leg 2 entry for
the resulting build plan.

## What the original backlog note got wrong

The item's step-3 render-site list (`PokemonCard`, `EditOverlays`,
`ItemSpriteBox`, `ItemPickerPanel`, `BattlefieldSlot`, `RosterRow`) turned
out to be copy-pasted from commit `37f984e`'s (`fix: item/mega sprites
hitting the network instead of the local sprite cache offline`) file list —
not from an actual audit of where Pokémon sprites render. Checked each:

- `ItemSpriteBox.tsx` / `ItemPickerPanel.tsx` — render *item* sprites
  (`itemData.spriteUrl`), not Pokémon sprites. Irrelevant to this toggle.
- `BattlefieldSlot.tsx` / `RosterRow.tsx` — moved to
  `src/renderer/_archived/battle-logger/` by commit `d5cf96e` (Battle Logger
  Retirement, 2026-08-31, four days before this scoping pass). Dead code,
  never rendered.

## Actual render-site audit

Searched for every call site of `getPixelSpriteUrl` (`utils/spriteUrl.ts`)
plus every component receiving a `spriteUrl`/`resolveSprite` prop, and
checked each one's actual `<img>` size class:

| Component | Sprite size | Context |
|---|---|---|
| `PokemonCard.tsx` | `w-24 h-24` (96px) | Main team-roster card — the only large/primary display |
| `TeamCoverflow.tsx` | `w-[38px] h-[38px]` | Auto-cycling carousel strip on `TeamCard` |
| `SpeciesPickerCard.tsx` | `w-8 h-8` (32px) | Species-add picker list |
| `CalcTeamTray.tsx`, `CalcSavedSetPicker.tsx`, `CalcSavedSetsModal.tsx` | icon-scale | Calc panels/pickers |
| `CoverageTable.tsx` | icon-scale | Type coverage table cells |
| `TeamPosterTile.tsx`, `TeamPosterMiniSprite.tsx` | n/a | Poster/image export — static raster output, animation would freeze to one frame |
| `TypeMatchupPage.tsx`, `StatisticsPage.tsx`, `PokemonUsagePanel.tsx`, `OpponentFacedPanel.tsx`, `TooltipContent.tsx` | icon-scale | Stats/analysis pages, sourced from `spriteUrl` field rather than direct `getPixelSpriteUrl` calls in most cases |
| `TeamCard.tsx`, `EditOverlays.tsx`, `CalcPokemonPanel.tsx`, `TeamsPage.tsx` | — | Containers/delegators — don't render a Pokémon sprite themselves, only thread `resolveSprite` down to children (item sprites, `TeamCoverflow`, etc.) |

`useSpriteCache`'s `resolveSprite`/`downloadSprite` are keyed by URL, not by
species — no cache-layer changes are needed to support a second URL family;
whatever URL a call site passes in gets cached/downloaded the same way.

## Scope decisions (both via `AskUserQuestion`, both live in this session)

1. **First pass** (before the size audit above): asked whether the toggle
   should cover all ~18-20 render sites, "primary views only," or all
   interactive UI except exports. User chose **primary views only**.
2. **Second pass** (after discovering the actual size numbers — the first
   question had been framed assuming `TeamCoverflow`/`SpeciesPickerCard`
   were also primary-sized, which the size audit disproved): asked whether
   "primary views" should mean `PokemonCard` alone, `PokemonCard` +
   `TeamCoverflow`, or widen back to all interactive UI. User chose
   **`PokemonCard` only**.

Net result: this toggle touches exactly one render site. Every other sprite
in the app — including the team-card coverflow strip — stays static PNG
regardless of the setting.

## Showdown CDN naming, why it needs its own normalization map

`getPixelSpriteUrl` is dex-ID-keyed (`.../pokemon/{id}.png`), so its only
naming exceptions are the handful of cosmetic-gender-form species where the
filename needs a `female/` folder segment. Showdown's animated CDN
(`play.pokemonshowdown.com/sprites/ani/{name}.gif`,
`.../ani-shiny/{name}.gif`) is name-keyed for *every* species — regional
forms, Megas, and punctuation-bearing names (Farfetch'd, Mr. Mime, Ho-Oh,
Nidoran♀/♂) all need name-mangling, not just the 4 gender-divergent species
`normalizeSpeciesForAPI` already special-cases for PokeAPI. Confirmed the
general rule is mechanical (lowercase, strip hyphens/apostrophes/periods/
spaces — e.g. `landorus-therian` → `landorustherian`, `tapu-koko` →
`tapukoko`), but a comprehensive exception table still needs building against
Showdown's own sprite list/Bulbapedia per CLAUDE.md's "what's the complete
set of X" research rule, not asserted from a small sample — left as build-leg
work, not resolved here.

## Fallback behavior (design default, not asked)

Showdown's sprite roster can lag official reveals (relevant given the
concurrent Regulation M-C Prep item's incoming new Megas). The build plan
calls for an `onError` fallback from the animated GIF to the existing static
PNG URL, so a missing Showdown sprite degrades to "shows the static sprite"
rather than a broken image — same non-breaking posture `resolveSprite`
already guarantees for the offline-cache path.
