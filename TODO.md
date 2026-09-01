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

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

- **[Export Team to Pokepaste] — Leg 1** *(Last touched: 2026-09-01 ·
  Re-checks: 0)*
  Blocked: needs a decision from the user on the IPC-detour approach below
  before (2)/(3) are worth doing.
  Item 1's CORS spike is resolved, and it's a negative for the scoped
  approach: live-tested `POST https://pokepast.es/create` with an
  `Origin: http://localhost:5173` header via curl — the write itself
  succeeds server-side (got back `303` + `Location: /cedd41c926b6d61e`, a
  real throwaway paste), but the response carries **no CORS headers at
  all** (no `Access-Control-Allow-Origin`/`-Expose-Headers`). A renderer-side
  `fetch()` POST would be blocked from ever reading that response, so the
  app could never learn the new paste's ID even though the write went
  through. Confirmed this is endpoint-specific, not a site-wide CORS
  block: `GET /<id>/json` (the existing working read path) sends
  `Access-Control-Allow-Origin: *`, which is why that one already works
  live from the renderer today — `/create` just doesn't have the same
  header.
  This doesn't close the item outright, though: Node's own network calls
  (i.e. a main-process `ipcMain.handle`, same pattern as the existing
  `file:*` filesystem-IO handlers in `main.ts`) aren't subject to browser
  CORS at all, so proxying the write through a new IPC call would sidestep
  this cleanly. That's a real architecture decision, not an assumed
  extension of the current renderer-only pokepast.es pattern — needs the
  user to sign off on adding a new IPC surface + a CLAUDE.md exception
  covering a main-process-initiated external call (a new category
  alongside the existing on-demand/user-initiated/automatic-poll ones)
  before it's built. If the user doesn't want that, the item closes here.
  Item 2 (Showdown-export serializer) and item 3 (CLAUDE.md exception
  wording) are unchanged and still open, now contingent on that decision.
  Complexity check on the detour itself (2026-09-01, see chat): small.
  `sprite:download` (`main.ts:584`) already does main-process outbound
  `fetch()`, so this isn't a new idiom, just a new handler — one
  `ipcMain.handle`, one preload method, one renderer service function
  (~30-40 lines total). One implementation snag to remember: use Node's
  raw `https.request()` (or Electron's `net.request()`) for the handler,
  not `fetch()` — WHATWG fetch's `redirect: 'manual'` returns an
  opaque-redirect response with headers hidden by spec (not a CORS thing,
  applies in Node too via undici), so `fetch()` would hit the same
  can't-read-Location problem as the renderer did. A raw `https.request()`
  has no such filtering; `res.headers.location` is directly readable. The
  real cost is still item 2 (the serializer) either way — the detour just
  decides where the POST originates, not how much work this item is
  overall. Still waiting on the user's sign-off on the new external-call
  category (see above) before starting.

- **[Limitless Usage Data] — Leg 1** *(Last touched: 2026-09-01 · Re-checks:
  0)*
  Blocked: waiting on Limitless API key approval.
  Spun off from the now-closed "Original Roadmap Leftovers" item (see
  COMPLETED.md) — the one sub-item of that roadmap leftover with real
  remaining scope rather than nothing left to build. No further detail
  beyond the original roadmap ask; needs scoping once the key comes through.

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
  2026-09-01 · Re-checks: 0)*
  Also folds in "Further Calc UI cleanup," the one sub-item of the now-closed
  "Original Roadmap Leftovers" item (see COMPLETED.md) with real overlap here
  — no separate scope, just tracked under this item going forward.

  Scoped 2026-09-01 (see chat) - the original framing above was wrong on two
  counts, which changes this item's real shape a lot. (1) The
  `blocked-ability` manual outcome dropdown it describes lives entirely in
  the retired `_archived/battle-logger/` tree (`MoveOutcomePrompt.tsx` et
  al.) - the live Calc page (`CalcPage.tsx` and friends) has no outcome
  picker at all today. (2) `useDamageCalc.ts` doesn't actually need to
  "inspect the defender's ability" itself - `@smogon/calc`'s own bundled Gen
  9 mechanics (`node_modules/@smogon/calc/dist/mechanics/gen789.js:324-337`,
  confirmed by reading the installed package) already natively zero damage
  for Levitate/Wonder Guard/Flash Fire/Water Absorb/Volt Absorb/Storm Drain/
  Sap Sipper/Lightning Rod/Motor Drive/Bulletproof/Soundproof/Earth Eater/
  Wind Rider/priority-blocking abilities (Queenly Majesty/Dazzling/Armor
  Tail), as long as `ability` is populated on the constructed `Pokemon` -
  which the Calc UI's existing ability dropdown already provides as input.
  `moveBlockingAbilities.ts`/`reactiveAbilities.ts`/`hitReactiveAbilities.ts`/
  `onSwitchInAbilities.ts` (the curated tables this item originally pointed
  at) are consumed exclusively by the archived Battle Logger tree today (one
  `grep` across all consumers confirmed this) - not real input for this item
  as originally framed, since that tree models manual turn-by-turn outcome
  logging, not a live damage calculation.

  Two real, narrower gaps turned up instead and are what this item covers
  going forward:

  - **Leg 2 - crash-on-zero-damage bug (a bug fix, not new ability-coverage
    scope):** live-confirmed via `node -e` against the installed
    `@smogon/calc` - `result.desc()`/`result.kochance()` both throw
    (`"damage[damage.length - 1] === 0."`) whenever a *damage-category*
    move's range comes back fully `[0, 0]` - true for every ability-block
    case above, and also plain type immunity with no ability involved (e.g.
    a Normal move into a Ghost-type). Status moves don't hit this path
    (`move.category === 'Status'` short-circuits it,
    `node_modules/@smogon/calc/dist/desc.js:31`), so only damage moves are
    affected. `computeSideResults` (`useDamageCalc.ts:331-361`) doesn't
    special-case this - it lands in the generic `catch`, and `errorEntry`
    surfaces the raw library assertion string as `errorMessage`, which
    `CalcResultPanel.tsx` renders as a red "error." Live-confirmed this is
    what a user sees today for e.g. Landorus-T Earthquake into a Levitate
    Rotom-Wash - not a helpful "blocked," a scary internal assertion string.
    Fix belongs in `computeSideResults`: detect a fully-blocked/immune
    result before calling `desc()`/`kochance()` (range is `[0,0]` and
    category isn't Status) and build a clean result entry instead of routing
    it through `errorEntry` - the ability name is already present on the
    constructed `Move`/`Pokemon` inputs (`@smogon/calc` even embeds it in its
    own `desc` text via `description.defenderAbility` once it doesn't
    throw), so no new lookup or config table is needed to fix this leg.

  - **Leg 3 - Champions ability balance-patch damage math:** `@smogon/calc`
    only knows mainline Scarlet/Violet ability text/mechanics, and
    `championsAbilityOverrides.ts` today only corrects *display* text
    (tooltips), not damage math - its own header already flags this exact
    gap for Unseen Fist's 25%-through-Protect interaction. Per
    `docs/investigations/champions-showdown-mod-audit.md`, only 13 abilities
    are Champions-modified total, of which Unseen Fist is the one with a
    live damage-math consequence today (Healer's isn't damage-related). Reg
    M-C's incoming Aura Break (see "Regulation M-C Prep") will be a second,
    brand-new one once its exact mechanic is confirmed - neither PokeAPI nor
    `@smogon/calc` will ever model it, being Champions-exclusive. Scoping
    this leg means deciding how a mechanical override actually reaches
    `computeSideResults` - most likely via `Move`'s existing `overrides`
    param, the same pattern `championsMoveOverrides.ts` already uses for
    moves (an ability-side equivalent feeding `calculate()`'s own inputs
    would keep the correction inside `@smogon/calc`'s modeling, rather than
    layering a separate post-hoc damage-multiplier pass on top of it).
    Practically blocked on Aura Break's mechanic being confirmed first
    (tracked under "Regulation M-C Prep") - one real case (Unseen Fist) isn't
    enough to design the override shape against with confidence.

  Not started. Leg 2 is small and self-contained - can be picked up
  independent of Leg 3.

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
