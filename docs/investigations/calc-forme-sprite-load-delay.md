# Calc forme sprite load delay

Found verifying Sprites & Icons Leg 2: some forme sprites (Castform Snowy)
take 5-10+ seconds to appear in `CalcSideSprite.tsx`. Investigated
2026-10-26; no code changed.

## Cause

`getAnimatedSpriteUrl` (`utils/spriteUrl.ts`) builds the Showdown filename
with `toShowdownSpriteId`, which strips every non-alphanumeric character.
That is right for base species (`farfetchd`, `hooh`, `typenull`) but wrong
for formes: Showdown's animated sprite files keep the hyphen between species
and forme.

| URL | Result |
| --- | --- |
| `ani/castformsnowy.gif` (what the app requests) | 404 |
| `ani/castform-snowy.gif` | 200 |
| `ani/landorustherian.gif` (app) / `ani/landorus-therian.gif` | 404 / 200 |
| `ani/charizardmegax.gif` (app) / `ani/charizard-megax.gif` | 404 / 200 |

So every forme (regional forms, Therian/Incarnate, Megas, Castform weather
formes) misses the GIF path. `CalcSideSprite` then takes its designed
404-then-static-fallback path, which is why the sprite does eventually
appear - as the static PokeAPI image, not the animation.

## Why it is slow

Showdown's CDN answers a cold 404 slowly: measured with curl, first-hit 404s
took 7-20s (including for a nonsense filename), and a repeat of the same URL
came back in ~40ms. Successful 200s are fast. `CalcSideSprite` waits for
`onError` before switching to the static sprite, so the user sees nothing for
the full cold-404 time. The static fallback's own load (PokeAPI via
raw.githubusercontent.com, through `useSpriteCache`) is not the bottleneck
and the sprite cache cannot help: a 404 is never cached, and each new
species/forme is a fresh cold miss.

Ruled out: sprite-cache miss (the failing request is the first GIF, before
any cache path is involved).

## Fix options (not built)

1. Preserve the hyphen for forme names in `getAnimatedSpriteUrl` (needs the
   base-species/forme split rule; Megas use `-mega`/`-megax` with no inner
   hyphen, Nidoran-F style gender suffixes and the gender-divergent list need
   to keep working). Fixes the delay and gives formes their real animation.
   Existing tests `spriteUrl.test.ts` "mechanically strips hyphens..." and
   "mangles a Mega API slug..." assert the buggy output and would need
   changing with confirmation.
2. Independent of 1, render the static sprite immediately and swap to the GIF
   on its `onLoad`, so a missing/slow GIF never blanks the sprite.

Option 1 also affects `EditablePokemonCore.tsx` and the bulk download in
`useInitialSync.ts`, which request the same wrong URLs.
