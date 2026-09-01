# ChoiceBuds TODO

Working task list for ongoing/planned work. Every item is titled
`[Item/Sweep Name] — Leg N` (say "Start [title]" to kick off a session on
it). Bodies stay short — commit-message-body length, not an investigation
log; deep cross-checks/history belong in `docs/investigations/<topic>.md`,
linked from the item. `Last touched` + `Re-checks` are tracked per item; no
status enum otherwise — absence of a `Blocked:` line means open. Blocked
items are exempt from the re-check counter and live in their own tier below
rather than mixed into the active list. This file adopted that format as of
2026-08-31 — all re-check counters started at 0 then regardless of how long
an item had been sitting. Reordered into priority order 2026-08-31; within
"In progress / up next" and "Backlog / ideas", items are listed
highest-to-lowest priority. Finished work moves to [COMPLETED.md](COMPLETED.md).

## In progress / up next

- **[Team Gap Analysis] — Leg 1** *(Last touched: 2026-08-31 · Re-checks: 0)*
  Came out of a 2026-08-31 strategic discussion on differentiation vs.
  Showdown/calc.pokemonshowdown.com/PokeDD (see chat — worth writing up in
  a design doc if this becomes a real multi-leg push): the Type Matchup
  page's existing offensive/defensive coverage tables (`CoverageTable.tsx`)
  are a raw 18-row multiplier grid the user has to interpret themselves,
  identical in spirit to vgcmulticalc.com's own tool. The differentiated
  version is one ranked "threats your team can't answer" list, weighted by
  actual Champions ladder usage rather than showing every type equally.
  Researched championsbattledata.com's API live: no bulk usage-ranking
  endpoint exists (`/api/index` is name-normalization only, `/api/metadata`
  is base stats/typing only). Every row returned by the existing
  `/api/battle/:format/:name` endpoint (already called by
  `fetchChampionsUsage`) carries a `column_position` field, constant per
  species - confirmed by user to be the site's own usage ordering (lower =
  more used), sourced from its underlying wide-format usage CSV.
  Leg 1 scope: a batched sync (shape of `useInitialSync`) that fetches
  `column_position` for every species in the legal roster and caches it,
  refreshed on a cadence - reuse `ChampionsUsageEntry`'s existing 5-day TTL
  rather than inventing a new one. No UI change in this leg. Leg 2 (not yet
  scoped) is the actual ranked-gap-list feature on the Type Matchup page,
  consuming this leg's data - design that once the ranking data is actually
  in hand rather than speculating now. Not started.

- **[Regulation M-C Prep] — Leg 1** *(Last touched: 2026-08-31 · Re-checks:
  0)*
  Reg M-C announced, drops 2026-09-08 6pm PST — the nearest hard deadline on
  this list. Confirmed so far: three new Z-Megas — Absol (Sharpness),
  Lucario (Aura Break — new ability, halves incoming damage from
  contact-tagged moves), Garchomp (Levitate) — plus two new non-Mega
  additions, Rillaboom and Baxcaliber (no word yet on a Baxcaliber Mega).
  User is feeding more details as they land; nothing to implement yet — this
  item exists to hold the info until it's complete enough to scope
  config-table/species-roster updates against (Mega eligibility lists,
  `championsAbilityOverrides.ts` for Aura Break, `useInitialSync`'s
  legal-roster diff, `seasons.ts`'s M-6+ rows once M-C's season dates are
  known). Purely additive — no known removals this reg.

- **[Champions Data: Adopt Showdown's `champions` Mod as Primary Reference] —
  Leg 4** *(Last touched: 2026-09-01 · Re-checks: 0)*
  Leg 2 (`championsMoveOverrides.ts` audit) and Leg 3
  (`championsAbilityOverrides.ts` audit + the Mega-ability cross-reference)
  are both done — see COMPLETED.md. Leg 4 scope:
  `championsMovepoolChanges.ts`/`learnsets.ts` audit — larger scope than a
  learnset-only pass, see
  `docs/investigations/champions-showdown-mod-audit.md`'s "Leg 4 heads-up"
  section: roughly 200 of `moves.ts`'s 259 entries are
  `isNonstandard: "Past"`-only, a candidate source for a much bigger
  `GLOBALLY_REMOVED_MOVES` list than our current 3-move one. Leg 5 (evaluate
  `formats-data.ts`/`items.ts` as a roster/tier source, likely its own
  scoping pass) follows. Not started.

- **[2026-07-07 Review-Pass Leftovers] — Leg 2** *(Last touched: 2026-08-31 ·
  Re-checks: 0)*
  Three items outstanding from three earlier review-pass batches (everything
  else from them is done — see COMPLETED.md):
  1. Calc page still scrolls slightly at 1280x720 after the 2026-07-14
     tightening pass. **Re-measured 2026-08-31 with the now-fixed
     `run-desktop` `resize` command (sets Electron content size directly,
     per the Team Card Grid Layout fix) — actual gap is 144px** (main's
     `scrollHeight` 864 vs. a full 720px `clientHeight`/`innerHeight`, no
     title-bar chrome eating into it), not the previously recorded ~209px,
     which was measured against an outer-window-frame size before that fix
     existed. Fits fine at 1920x1080. Options to close it further (reversing
     `CalcSideConditions.tsx`'s deliberate one-row-per-condition layout, or
     trimming padding/gaps further toward a click-comfort/legibility risk)
     were presented again; user chose to stop here and just bank the
     corrected number. Revisit if wanted.
  2. Battle Logger's move-stat-effects table: waiting on the user to name a
     move with a weather-conditional stage *amount* like Growth's — no
     second example found in research so far. This table lives in
     `config/moveStatEffects.ts`, which is unaffected by the Battle Logger
     Retirement (see COMPLETED.md) — still active, just no longer consumed
     by an in-battle UI.
     Blocked: needs the user to name a candidate move.
  3. Stretch/uncertain: export a team *to* a new Pokepaste via its write
     API — unconfirmed whether pokepast.es exposes one; needs research
     before scoping.
  (The former item 1, Battle Log page scrolling at 1280x720, is moot — the
  live-battle view it was about no longer exists, see COMPLETED.md.)

- **[Original Roadmap Leftovers] — Leg 1** *(Last touched: not recorded,
  predates leg-tracking · Re-checks: 0)*
  Remaining items from the original 9-item roadmap (Statistics page,
  Settings shell, cross-device sync, Teams/Battle Log list-row redesign,
  team-notes/image export are all done — see COMPLETED.md):
  1. Further Calc UI cleanup (#3) — overlaps with Calc work already in
     flight elsewhere in this file.
  2. General UI polish (#1) — nothing further scoped beyond what's shipped.
  3. Limitless usage data (#7) — blocked externally on API key approval.
     Blocked: waiting on Limitless API key approval.

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

- **[Team Card Grid Layout Re-check] — Leg 1** *(Last touched: 2026-08-31 ·
  Re-checks: 0)*
  Blocked: waiting on the user to verify live on their physical MacBook —
  everything below was confirmed on a resized Electron window on the dev
  machine, not the actual hardware.
  Fixed and live-verified via `run-desktop` (added a `resize` command to
  `driver.mjs` — sets Electron's content size directly, matching what the
  renderer's CSS/`@container` actually measures). Root cause: not already
  fixed by the carousel rework — that rework is what introduced it.
  `TeamCard.tsx`'s 3-vs-6-column snap required a 1760px container (6*280px +
  5*1rem gaps), unreachable on any MacBook. First attempt (1100px, based on
  a theoretical estimate) still wasn't low enough — measured live at the
  reporter's actual conditions (14" MacBook, sidebar expanded, 2 real teams,
  single-column layout) the container only gets 1043px. Retuned to 1040px
  against that measured number; confirmed live it renders a clean 1x6 with
  no truncation at 1512x982/sidebar-expanded (screenshot:
  `.claude/skills/run-desktop/shots/06-fixed-1512-expanded-sidebar.png`).
  Doesn't cover a 13" MacBook (measured 818px there) — not this fix's
  target device. Also corrected a stale `TeamsPage.tsx` comment describing
  an auto-fill/minmax grid that no longer matches the real implementation.
  Ready to move to COMPLETED.md once the MacBook pass confirms it.

- **[In-App Auto-Update: macOS] — Leg 1** *(Last touched: not recorded ·
  Re-checks: 0)*
  Blocked: user needs a paid Apple Developer account ($99/yr) + notarization.
  Windows shipped in v0.2.1 (see COMPLETED.md). macOS is blocked: Squirrel.Mac
  (what `electron-updater` uses there) requires code signing to auto-update
  at all, and Gatekeeper heavily restricts unsigned builds regardless. Once
  unblocked, `registerAutoUpdater()`'s `process.platform !== 'win32'` guard
  in `main.ts` is the one line to revisit.
  - Separately, a paid Windows code-signing cert (~$100-400+/yr) isn't
    required for Windows auto-update to function, but would remove the
    SmartScreen warning — not yet decided.

- **[TypeScript 7 Upgrade] — Leg 1** *(Last touched: not recorded ·
  Re-checks: 0)*
  Blocked: waiting on real `typescript-eslint` 7.x support.
  `typescript-eslint` doesn't support TypeScript 7.0.2 yet (confirmed
  peer-range rejection + real runtime crash reports). Currently on
  TypeScript ^6.0.3.

## Backlog / ideas (not yet scoped, highest-to-lowest priority)

- **[Calc Auto Ability-Effect Application] — Leg 1** *(Last touched:
  2026-08-31 · Re-checks: 0)*
  Today the Calc page's ability-based outcomes (e.g. a move blocked by
  Levitate/Bulletproof/Wonder Guard/etc.) are manual - the user has to pick
  `blocked-ability` on the outcome dropdown themselves; nothing in
  `useDamageCalc.ts` inspects the defender's ability against the move being
  used. User: this is the actual goal the Battle Logger's stat-inference
  feature was originally reaching for before its retirement (see COMPLETED.md's
  Battle Logger Retirement entry) - auto-applying ability effects instead of
  requiring the user to already know/flag them. Confirmed worth building.
  Surfaced by looking at github.com/Seancheey/PokeDD (a similar Champions
  companion app) for architecture ideas: its `src/lib/damage.ts` hand-rolls
  the full formula with ~25 ability modifiers baked in, rather than
  delegating to `@smogon/calc` like this project does - closing this gap
  here likely means either extending how `@smogon/calc` is driven or
  layering a comparable ability-modifier pass on top of it, either of which
  is a real design decision, not a small patch. Needs scoping: which
  abilities to cover first (start from the existing curated tables -
  `moveBlockingAbilities.ts`, `reactiveAbilities.ts`, `hitReactiveAbilities.ts`,
  `onSwitchInAbilities.ts` - already hold researched ability-effect data
  that could feed this), where in `useDamageCalc.ts`'s pipeline the check
  belongs, and whether it replaces or supplements the manual outcome picker.
  Not started.

- **[Remaining Champions Mega Ability Audit] — Leg 1** *(Last touched:
  2026-09-01 · Re-checks: 0)*
  `config/megaAbilities.ts` still deliberately excludes ~25 Champions-
  invented Mega forms (Raichu X/Y, Meowstic, Barbaracle, Chimecho, Golurk,
  Falinks, Crabominable, Emboar, Drampa, Dragalge, Audino, Glimmora,
  Malamar, Skarmory, Starmie, Chandelure, Delphox, Greninja, Hawlucha,
  Clefable, Dragonite, Floette, Froslass, Scolipede, Scrafty, Staraptor,
  Victreebel, Chesnaught) pending a verified post-Mega ability. 2026-09-01:
  the "Champions Data" item's Leg 3 resolved 5 species by reading each Mega
  forme's `abilities.0` field directly out of Showdown's `pokedex.ts`
  (Excadrill/Piercing Drill, Feraligatr/Dragonize, Meganium/Mega Sol,
  Pyroar/Fire Mane, Scovillain/Spicy Spray — see
  `docs/investigations/champions-showdown-mod-audit.md`'s Leg 3 update and
  COMPLETED.md), on top of Eelektross/Eelevate confirmed the prior session.
  That leaves ~25 species with no Showdown-mod ability entry at all (the mod
  only lists 13 ability overrides total, all already accounted for) — for
  those, Showdown's data has nothing further to check, so this item now
  needs Insider Gaming's "All New Mega Pokémon & Abilities in Pokémon
  Champions Regulation M-B" article or Serebii's Champions Pokedex
  (per this project's cross-check rule) instead. Not started.

- **[set-state-in-effect Lint Rule Fix] — Leg 1** *(Last touched: not
  recorded · Re-checks: 0)*
  The rule is disabled on `useTeams.ts`/`useSettings.ts`/
  `useSavedPokemon.ts`/`useBattles.ts`/`useDatabase.ts`'s shared
  load-on-mount-and-reused-by-refresh idiom, plus `useSync.ts`'s
  `refreshStatus`. A real fix means splitting each into an effect-safe
  silent variant and a refresh variant — bigger than a routine cleanup
  pass. Not started.

- **[Generalize Check-for-Updates Pattern] — Leg 1** *(Last touched: not
  recorded · Re-checks: 0)*
  The "Check for Updates" reminder-tool pattern (see COMPLETED.md) could
  extend to other hand-authored Champions balance-patch config tables
  (`championsMoveOverrides.ts`/`championsAbilityOverrides.ts`/etc.) if
  useful later. No concrete driver yet beyond the original season/regulation
  use case. Not started.
