---
paths:
  - "src/renderer/services/**"
  - "src/renderer/config/**"
---

# External data sources

Only direct JSON `fetch` calls to `pokeapi.co` are allowed for game data at
runtime — no scraping, no third-party proxy middleware. PokeAPI models
mainline Scarlet/Violet only, with no concept of Pokemon Champions' own
balance patches — see `config/championsMoveOverrides.ts`/
`championsAbilityOverrides.ts`/`championsMovepoolChanges.ts` for how that
gap is hand-corrected. The exceptions below are project policy — a decision
made for this codebase, not a documented grant of permission from any of
the sites involved.

1. **Serebii/Bulbapedia image hotlinks.** `serebii.net` and
   `bulbapedia.bulbagarden.net` may be hotlinked as a static `<img>` source
   for assets PokeAPI doesn't cleanly provide (move category badges, item
   sprite fallbacks like Fairy Feather) — image hotlinking only, never
   fetched/parsed as JSON, never a stand-in for the pokeapi.co endpoints
   above.

2. **Serebii/Bulbapedia manual research.** The same two sites may be read
   manually (a one-off fetch during development, never a live runtime call)
   as a factual reference to hand-author static config in
   `src/renderer/config/`/`utils/` (e.g. VGC-legal item lists, regulation
   legality tables, Mega Stone mappings, Champions balance-patch overrides)
   when no other source has the data. This covers extracting individual
   game-mechanics facts into our own config structures only — never copying
   either site's written text or page layout wholesale, and never a
   live/automated scrape.

3. **Pokepaste read (decided 2026-07-08).** `pokepast.es` may be fetched
   live at runtime, but *only* through its own `/<id>/json` endpoint
   (`services/pokepaste.ts`), and *only* to import a team a user explicitly
   pastes a `pokepast.es/<id>` link for in `ImportTeamModal.tsx` — never
   HTML-scraped, never polled/background-fetched, never a stand-in for the
   pokeapi.co endpoints above. The endpoint returns the paste's own
   `title`/`author`/`notes`/`paste` fields directly as JSON, so there's no
   scraping involved.

4. **GitHub release-check poll (decided 2026-07-09).** `api.github.com`'s
   public `/repos/vanwheels/ChoiceBuds/releases/latest` endpoint
   (`services/github.ts`) may be polled automatically once per app launch,
   read-only, solely to compare the running version
   (`utils/appVersion.ts`, sourced from `package.json`) against the latest
   published GitHub Release, surfacing the result on the Settings page
   (`useUpdateCheck.ts`/`UpdateCheckSection.tsx`). This is the app's only
   *automatic*, non-user-triggered external call — every other external
   fetch here is either on-demand/cached (PokeAPI) or explicitly
   user-initiated (Pokepaste).

   Same endpoint, same `fetchLatestRelease()` call, second consumer
   (decided 2026-10-17): the web Download page
   (`components/DownloadPage.tsx`, mounted at
   `choicebuds.vannyproductions.com/download/`) also calls it, to pick an
   OS-appropriate installer asset off the latest release rather than to
   compare versions.

5. **Champions ladder usage data (decided 2026-07-16).**
   `championsbattledata.com`'s public `/api/*` JSON endpoints (e.g.
   `/api/index`, `/api/battle/:format/:name`, `/api/pokemon/:name`,
   `/api/metadata/:name`) may be fetched for Pokémon Champions ranked-ladder
   usage data (per-species move/held-item/ability/nature ("stat_alignment")
   rankings, EV-equivalent-on-Champions'-own-0-32-scale ("stat_points")
   rankings, and teammate co-occurrence) to power stat-inference features.
   No auth/key required, CORS-enabled, plain JSON (never HTML-scraped, never
   a stand-in for pokeapi.co). It's a fan-made project, not affiliated with
   Game Freak/Nintendo/The Pokémon Company — spot-check individual values
   that look off rather than trusting the feed blindly. Its `stat_points`
   fields are already on this app's native 0-32 Stat Point scale (see
   `utils/championsStats.ts`) — no EV-scale conversion needed.

6. **Showdown animated sprites (decided 2026-08-31).**
   `play.pokemonshowdown.com`'s static sprite CDN (`/sprites/ani/` and
   `/sprites/ani-shiny/`) may be hotlinked as an `<img>` source, same shape
   as exception #1 above — image hotlinking only, never fetched/parsed as
   JSON. This is the animated-GIF source for Settings' "Show Animated
   Sprites" toggle (`utils/spriteUrl.ts::getAnimatedSpriteUrl`), scoped to
   `PokemonCard.tsx`'s main 96px sprite only. Falls back to the static PNG
   (`getPixelSpriteUrl`) via `onError` when Showdown's roster doesn't yet
   have a given species/form.

   Same CDN, a second, separate sub-path (decided 2026-10-22, Mega Team Card
   Flip): `/sprites/misc/mega.png` and `/sprites/misc/shiny.png` are
   hotlinked as static `<img>` icons for `EditablePokemonCore.tsx`'s shiny
   corner badge and `MegaFormToggleBadge.tsx`'s Mega-flip badge
   (`utils/spriteUrl.ts`'s `MEGA_BADGE_ICON_URL`/`SHINY_BADGE_ICON_URL`) —
   Showdown's own UI icons for these two concepts, reused instead of a
   hand-drawn glyph. Still image hotlinking only, resolved through the same
   `resolveSprite()` local-cache path every other hotlinked sprite in the app
   uses.

7. **Showdown `champions` mod source read (decided 2026-09-01).**
   `smogon/pokemon-showdown`'s public GitHub repo, specifically its
   code-level `champions` mod (`data/mods/champions/*.ts`, e.g.
   `moves.ts`/`abilities.ts`/`items.ts`/`scripts.ts`), may be read manually
   (a one-off fetch during development via GitHub's raw-content URLs, never
   a live runtime call) as a factual reference for hand-authoring the same
   static config exception #2 covers — same one-off, dev-time-only shape,
   not a new runtime data source. It's a stronger source than exception #2
   or the Champions usage data above for balance-patch specifics (move
   BP/accuracy/PP/type overrides, ability behavior changes, Mega Stone
   legality): it's the actual simulator code the Showdown ladder runs, not a
   summarized wiki page or a screenshot-relayed community spreadsheet. Still
   spot-check anything non-obvious against exception #2's sources when a
   value looks surprising — e.g. `moves.ts`'s raw `pp` field is a
   pre-transform value (Champions' actual displayed PP runs it through
   `scripts.ts`'s `calculatePP`), not the final number to copy directly.

8. **Pokepaste create (decided 2026-09-01).** `pokepast.es/create` may be
   POSTed to, but *only* from the **main process** (`main.ts`'s
   `pokepaste:create` IPC handler, via Node's raw `https.request()` — not
   `fetch()`, whose redirect handling can't expose the response's
   `Location` header the way a raw request can), and *only* to publish a
   paste the user explicitly triggers an export for
   (`ExportTeamModal.tsx`'s "Create Pokepaste Link" button, through
   `services/pokepaste.ts::createPokepaste`). This is the app's only
   **main-process-initiated** external call: `pokepast.es/create`'s
   response carries no CORS headers at all, so a renderer-side POST would
   succeed server-side but the renderer could never read back the new
   paste's URL. Main-process network calls aren't subject to browser CORS,
   so proxying the POST through IPC (same shape as the existing `file:*`/
   `sprite:download` handlers) sidesteps this cleanly.

9. **VGCPastes catalog bulk-ingestion (decided 2026-09-14).** The public
   VGCPastes Google Sheet
   (`docs.google.com/spreadsheets/d/1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw`,
   community-run, tabs per regulation) may be bulk-fetched via its own
   `gviz/tq?tqx=out:csv&sheet=<tab name>` CSV export endpoint (no auth), and
   each row's linked `pokepast.es` URL may be bulk-fetched through the
   existing `/<id>/json` read endpoint, to power the sample-team catalog.
   Distinct from exception #3 (single user-triggered paste at a time): this
   one is manual, user-triggered refresh only (no scheduled or background
   job — see `useVgcPastesCache.ts`); only rows flagged `EVs == Yes` in the
   sheet are pulled (`services/vgcPastes.ts`); read-only against both
   services. Same crowd-sourced reliability tier as exception #5 — the
   sheet's own header admits most teams are sourced from Twitter, so the
   same spot-check discipline applies. The catalog use case never
   bulk-fetches individual pokepastes itself — a picked row's paste is only
   fetched the normal user-triggered way via `ImportTeamModal.tsx`'s
   prefill path. A future per-species-extraction leg that does bulk-fetch
   individual pastes should fetch them politely/sequentially, never
   parallel-blasted.

## Research methodology

When researching a Bulbapedia/Serebii fact for a config file under
exception #2: for "what's the complete set of X" questions, use
Bulbapedia's category-listing pages (e.g. `Category:Moves_by_stat_modification`)
rather than a freeform-summarized reference page — a category page just
enumerates its members, so there's nothing for a summarizer to drop. For
"what exactly does X do," fetch that entry's own dedicated page individually
and cross-check anything with more than one effect or a non-obvious
percentage before hardcoding it — a shared prose reference page condensed
into a summary has silently dropped stat/effect count and mislabeled
chance-based vs. guaranteed effects before.

When confirming or closing a rumor about an external tool/service's
behavior or format (e.g. "is Pokepaste being deprecated"), check any beta/
in-transition version of that tool, not just its current default/stable
behavior, before concluding the question is answered — a 2026-10-17 pass on
the Pokepaste format-deprecation rumor closed it as false by checking only
Showdown's default client, then had to self-correct same-day once the
in-beta new client's actual behavior (replacing Pokepaste outright) came to
light.

## Request bursts and sprite CDNs

Added from the Sprite, Filter & Search Fixes post mortem
(`docs/postmortems/sprite-filter-and-search-fixes.md`).

- Before adding any code that fires several PokeAPI requests at once, check
  it has retry with backoff and never caches a failed fetch. An ~81-slug
  Mega prefetch drew 429s and pinned cards to the base sprite. Prefetch only
  what the visible component needs.
- Showdown's animated-sprite CDN can hang on a file it lacks, so never render
  the GIF as the only sprite. Show the static sprite and swap to the GIF on
  load.

## Keeping this current

Any new external data or asset source (a new site to hotlink from, a new
npm package supplying game data, a new API) needs a matching entry added to
README.md's Credits section in the same change that introduces it. The
GitHub-release poll (exception #4) is exempt from *that* sub-rule: it
checks the app's own release history, not a third-party data/asset source.
