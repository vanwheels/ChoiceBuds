# Animated sprite source scoping

Sprite Scoping milestone, Leg 1 (2026-10-26). Scoping only; no code changed.
Question: Showdown's animated set misses some formes, shinies and
Gen 9/Champions Megas. Are Pokéos or Project Pokémon better sources?

## Recommendation

Keep Showdown as the only animated source. Neither candidate fills the gap.

- Pokéos has no animated Mega GIFs for the newer (Z-A / Champions-era) Megas
  that Showdown lacks shinies for, and none for most of them at all.
- Project Pokémon's GIFs are Gen 8 only, with no Megas.
- Both would add a licensing gray area, and Pokéos adds a heavy payload.

Revisit Pokéos only if its HOME archive gains the new Megas (re-run the probe
below), and only after the open questions at the end are answered.

## Showdown baseline (what the gap actually is)

Probed `ani/` and `ani-shiny/` with the hyphenated filenames the app should
use (see `calc-forme-sprite-load-delay.md`):

| Mega | `ani` | `ani-shiny` |
| --- | --- | --- |
| gardevoir, garchomp, charizard-megax, dragonite, clefable, feraligatr | 200 | 200 |
| excadrill, delphox, floette, chandelure, chesnaught | 200 | 404 |
| baxcalibur | 404 | 404 |

So Showdown already has the new Megas as normal-color GIFs. The real gaps are
shinies for the newest Megas and a few outright missing species. Both already
degrade to the static PNG via the existing `onError` fallback. This is
narrower than the TODO item's premise ("misses Gen 9/Champions Megas"); part
of the earlier impression came from the unhyphenated-filename bug, not from
missing sprites. Only a sample of 12 was probed, not the full roster.

## Pokéos

Page: `pokeos.com/archive/assets/home` is a JS-rendered SPA, so plain fetches
return nothing; found by loading it in a browser and reading its requests.

- **URL scheme:** `https://s3.pokeos.com/pokeos-uploads/assets/pokemon/home/animated/{thumbnails/}{shiny/}{dexId}[-form].gif`. Dex-ID keyed, not name keyed.
- **Hotlinking:** the bucket is public, behind Cloudflare, and sends
  `Access-Control-Allow-Origin: *`. Technically hotlinkable. No terms page
  exists (`/terms` is a 404) and the archive page states no license; it only
  credits HiRes Pokémon for scans and Ken Sugimori for art.
- **Format and size:** GIF. `thumbnails/` are 128x105 and 150-900 KB each;
  the full-size files are ~2-2.5 MB. Showdown's equivalent is ~20 KB. This is
  10-40x heavier per sprite, and a team of six shinies would be several MB
  before caching.
- **Coverage, Megas:** probed the 34 Mega stones in `megaEvolution.ts` (up to
  Gardevoir) with `{id}-mega`. Classic Megas (Abomasnow through Camerupt,
  Gallade, Garchomp, Gardevoir) returned 200 for both normal and shiny. All
  Z-A / newer Megas (Clefable, Dragonite, Chandelure, Delphox, Excadrill,
  Chesnaught, Feraligatr, Froslass, Floette, Barbaracle, Baxcalibur, and the
  rest of that run) returned 404 for both. 16 of 34 hit, and every hit is a
  Mega Showdown already has in both colors.
- **Coverage, Gen 9:** species exist (id 1000, 1010 returned 200), but
  Pecharunt (1025) has no shiny.
- **Forms:** naming is inconsistent with what I guessed. `-gmax`, `-wash`,
  `-heat`, `-therian`, `-wellspring`, `-hearthflame`, `-complete`,
  `-rapid-strike`, `-midday`, `-ash` hit; guessed regional suffixes (`-alola`,
  `-alolan`, `-galar`, `-hisui`, `-paldea`) and female suffixes all 404.
  Regional-form naming is unresolved, so a form map could not be built from
  probing alone.
- **Confidence:** the 404s for new Megas use my guessed `-mega` suffix. A
  different suffix could exist, but Pokéos's pattern for classic Megas is
  exactly `-mega`/`-mega-x`/`-mega-y`, so I rate a hidden naming variant
  unlikely. The user's report of "GIFs for modern Megas" is not confirmed.

## Project Pokémon

- The "HOME 3D models GIFs" listing the TODO refers to is
  `3d-models-generation-8-pokémon`, which the author says covers
  Sword/Shield species and forms only, with no plans for earlier Pokémon.
  Normal and shiny per entry, including Galarian and Gigantamax. No Megas,
  and no Gen 9.
- The author credits pkparaiso as the origin and asks for credit. No license
  or hotlinking policy is stated. The site's per-Gen "HOME Sprites" pages
  (Gens 1-8, plus a no-gen page) are listed separately and are static.
- It is a forum/download resource aimed at manual download, not a CDN. Pages
  are huge (a single list is >160K characters). Hotlinking it would put load
  on a community site with no stated permission, and self-hosting would mean
  redistributing someone else's rips, which the project's hotlink-only
  exception policy does not cover.
- Verdict: no coverage of the gap, so there is no reason to take the licensing
  risk.

## What to do about the real gaps

Nothing tracked for new sources. If the shiny gap for the newest Megas gets
annoying, the lower-cost options (neither built here) are:

- Accept the static-PNG fallback (current behavior).
- Check Showdown again after each Champions roster addition; the roster lags
  official reveals, as `animated-sprite-toggle-scope.md` noted.

## Open questions / not verified

- Full-roster Showdown Mega coverage (only 12 probed). A full audit would be
  the first step of any later decision.
- Pokéos regional-form and gender naming (no index found; its SPA API was not
  located).
- Pokéos terms of use: none found. Treat as unlicensed.
