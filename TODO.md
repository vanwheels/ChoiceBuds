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

- **[Export Team to Pokepaste] — Leg 1** *(Last touched: 2026-09-01 ·
  Re-checks: 0)*
  Split out of Leg 2 item 3 above once research resolved its "does a write
  API even exist" blocker — scoped 2026-09-01, not started. Confirmed via
  `felixphew/pokepaste`'s `server.go` (the actual pokepast.es source, per
  its GitHub repo) that a write endpoint exists: `POST /create`,
  form-urlencoded body (`paste` required, `title`/`author`/`notes`
  optional), responds `303` with a `Location: /<id>` header on success, `400`
  on a missing/unparseable `paste` field. Three real pieces of work, not one:
  1. **Unverified risk:** the site is a traditional server-rendered form
     target, not a fetch-oriented API — untested whether pokepast.es sends
     CORS headers permitting a cross-origin `fetch()` POST (with
     `redirect: 'manual'` needed to read the `Location` header) from the
     renderer's origin. The existing read path (`GET /<id>/json`) already
     works live, but that doesn't guarantee the write path does — needs a
     throwaway live test before any UI work.
  2. No Showdown-export-text serializer exists anywhere in the codebase
     today (`services/parser.ts` only goes text→`ShowdownPokemon[]`, never
     the reverse) — this needs a new `ImportedPokemonInfo[]`→Showdown-text
     function first, which is its own small design (item/move/EV/IV
     formatting, Tera Type line, etc.) before there's anything to POST.
  3. CLAUDE.md's pokepast.es exception (#2 in the external-integration list)
     currently only sanctions the read direction
     (`GET /<id>/json`, user-paste-triggered import) — a write call needs its
     own explicit exception added there, not an assumed extension of the
     existing one.
  Next session should start with (1), the CORS spike, since a negative
  result there closes the item outright before (2)/(3) are worth doing.

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

- **[Prune Dead `championsMovepoolChanges.ts` Entries] — Leg 1**
  *(Last touched: 2026-09-01 · Re-checks: 0)*
  Scoped 2026-09-01 (see chat) — decision resolved, ready to implement as its
  own session. Two-part fix, not a full delete:
  1. Self-heal the stale-cache bug: extend `useGameData.ts`'s
     `getCachedSpeciesLearnset` to treat `hasChampionsMoveData === false` as
     a forced cache miss too, same pattern already used there for
     `=== undefined`. Any `NEVER_EXPIRES`-cached false-entry then self-heals
     to `true` on its next read, since Champions Data Leg 4a/6's audits
     confirmed every current-roster species already has real PokeAPI
     champions move data.
  2. Prune only the confirmed-dead per-species rows — the 22 Reg M-B
     species' + Floette's `CHAMPIONS_MOVEPOOL_ADDITIONS`/
     `CHAMPIONS_MOVEPOOL_REMOVALS` entries in `config/championsMovepoolChanges.ts`
     — but keep `GLOBALLY_REMOVED_MOVES` and the whole
     `applyMovepoolChangesIfNeeded` gate mechanism alive as-is. Reasoning:
     Reg M-C (drops 2026-09-08, see its own TODO item) adds new species that
     will very likely hit this exact "PokeAPI hasn't backfilled its champions
     tag yet" gap the same way the 22 M-B species originally did, so the
     mechanism itself still needs to stay live — it's the per-species M-B
     data specifically that's dead, not the fallback path.
  Add/update `useGameData.test.ts` coverage for the new forced-miss branch
  alongside the prune.

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

- **[Prune Dead `championsMovepoolChanges.ts` Entries] — Leg 1**
  *(Last touched: 2026-09-01 · Re-checks: 0)*
  Scope widened by Champions Data Leg 6 (see COMPLETED.md): Leg 4a's live
  audit found PokeAPI had back-filled "champions"-tagged move data for all 22
  Reg M-B species, leaving only Floette (then still keyed to the wrong
  `'floette'` slug) out of coverage; Leg 6 fixed the roster to
  `'floette-eternal'` and found PokeAPI already covers that slug too (41
  champions-tagged moves). That means **every** entry in this file -
  `GLOBALLY_REMOVED_MOVES` included, not just the 22 species'
  `CHAMPIONS_MOVEPOOL_ADDITIONS`/`REMOVALS` entries - is now dead code under
  `useGameData.ts::applyMovepoolChangesIfNeeded`'s `hasChampionsMoveData`
  gate; no species in the current legal roster reaches this file at all.
  Not pruned yet because a user with an already-cached (`NEVER_EXPIRES`)
  `hasChampionsMoveData: false` entry from before their species's backfill
  would still be relying on those corrections, and there is no
  cache-invalidation path that would self-heal that. Needs a decision on how
  to safely retire it (a cache-version bump? a one-time forced re-fetch for
  affected species? just accept the small residual-user risk and delete?)
  before doing the prune. Not started.

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
