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
the current milestone and "Unscheduled", items are listed highest-to-lowest
priority. Only one milestone is "current" at a time — see root `CLAUDE.md`'s
Task Tracking rules for the full section-lifecycle (`## Current Milestone:
<name>` → `MILESTONES.md` + `COMPLETED.md` on ship). Finished work moves to
[COMPLETED.md](COMPLETED.md).

## Current Milestone: Speed Calc-like Feature

Scoping resolved 2026-09-09 — see
[docs/investigations/speed-calc-scope.md](docs/investigations/speed-calc-scope.md)
for the full design-questions pass. Its "team-anchored threat list, not a
vgcmulticalc reskin" differentiation call was itself reversed the same day
by Leg 8 — see
[docs/investigations/speed-tiers-full-roster-pivot.md](docs/investigations/speed-tiers-full-roster-pivot.md).
Legs 1-6, 8, and 15 are done — see `COMPLETED.md` (Leg 3's row-list shell
was shipped, then redone by Leg 4, then Leg 4's own data source superseded
by Leg 8; Leg 15 was Leg 6's own prerequisite, scoped and built out of
numeric order). Legs below are a tentative breakdown, not yet started.

- **[Speed Tiers Mega Sprite Fallback] — Leg 13** *(Last touched: 2026-09-09
  · Re-checks: 0)*
  Reported live 2026-09-09: Mega-form rows render with the base species'
  sprite instead of the Mega form's own, hurting visual clarity in the dense
  grid. Root cause found: not a coverage gap in `useInitialSync`'s bulk
  Mega-sprite prefetch, but a session-lifetime one — the id/URL mapping
  `getCachedMegaSprite` reads lives only in `useMegaSprite.ts`'s in-memory
  `cache` Map (wiped every app restart), and the pass that populates it is
  gated behind `unsyncedSpecies.length === 0` in `useInitialSync.ts`, so it
  never runs again after the first successful launch — every later session
  found that cache empty and silently fell back to the base sprite. Fixed
  with a new `useMegaSpritePrefetch` hook (`useMegaSprite.ts`) that
  re-warms the cache once per session, called from `SpeedTiersPage.tsx` and
  wired into `rosterCandidates`'s memo deps so it recomputes once real
  sprites land. Also fixed a second, independent bug found during this
  investigation: `useInitialSync.ts` derived its own Mega slug list straight
  off `MEGA_STONE_TO_SPECIES` instead of reusing `megaEvolution.ts`'s
  `CURATED_MEGA_FORM_SLUGS`, so it was pre-downloading Floette's sprite
  under the wrong slug (`floette-eternal-mega` instead of the
  `floette-mega` `getFormeFamily`/`SpeedTiersPage` actually look up) —
  switched to the shared curated list so both passes agree. Type-check,
  lint, and full test suite (654 tests) pass; new coverage in
  `useMegaSprite.test.ts`. Live-verified by Vanny 2026-09-09.

  Follow-up added same day: `TeamCard.tsx`'s header "Mini sprite strip"
  (the flat roster-preview row on the Teams overview grid) never accounted
  for Mega Evolution at all — always rendered `getPixelSpriteUrl` off the
  base species, even when that Pokémon actually holds its own Mega Stone.
  `PokemonCard.tsx`'s own full-detail sprite already handled this correctly
  via `useMegaSprite`; the strip is a plain `.map()` over up to 6 team
  members (not a per-item component), so it can't call that hook per item -
  same Rules-of-Hooks shape as `SpeedTiersPage.tsx`'s roster rows. Fixed by
  calling `useMegaSpritePrefetch()` once in `TeamCard.tsx` and reading
  `getCachedMegaSprite(getMegaApiSlug(...))` synchronously per roster slot,
  falling back to the base sprite exactly as before when there's no Mega
  Stone match. Type-check/lint/full suite re-verified green; no new
  automated test (presentational glue in an untested component, per
  CLAUDE.md's UI-verification default). Live-verified by Vanny.

  Second follow-up (2026-09-10, from a live screenshot): the Speed Tiers
  page's own Team Preview Strip (`TeamPreviewCard.tsx`'s Base/Mega/Mega Z
  toggle) and the tier list's own "You" tile (`speedTiers.ts::
  computeTeamSpeed`) both still showed the base sprite after toggling a
  team member to its Mega form - `speedTierOverrides.ts`'s
  `applySpeedOverride` had always deliberately left `spriteUrl` unswapped
  (documented cut in that file's header, from the original Team Preview
  Strip leg). Added `resolveDisplaySpriteUrl` (`useMegaSprite.ts`) - reads
  the same cache as `getCachedMegaSprite`, falling back to the caller's own
  base sprite for anything that isn't a known Mega form (base species, a
  stat-only forme, a still-cold cache) - and wired it into both read sites:
  `TeamPreviewCard.tsx` (keyed off `override.species`, the toggle's current
  selection) and `computeTeamSpeed` (keyed off `pokemon.showdownData.species`,
  already override-applied by its caller). Type-check/lint/full suite green
  (655 tests, +1 new covering `computeTeamSpeed`'s spriteUrl forwarding).
  Not yet live-verified - needs Vanny's live check of the Team Preview
  Strip's Mega toggle and the tier list's own "You" tile.

- **[Speed Tiers Trick Room Sort-Order Bug] — Leg 14** *(Last touched:
  2026-09-09 · Re-checks: 0)*
  Reported live 2026-09-09: with the Trick Room toggle active (slowest-first
  sort), the fastest entry on the grid (Mega Raichu, 200 Speed) renders as
  the very first tile instead of last/near-last — the row also visually
  mirrors itself (descends then re-ascends back up to 200) rather than
  monotonically increasing. Possibly the same root cause as Leg 10's
  bundling bug, possibly its own issue in `groupSpeedTiers`
  (`speedTierList.ts`) or however `SpeedTierList.tsx` lays groups out into
  the grid — not investigated yet, explicitly deferred per Vanny at report
  time. Leg 7's verification pass reproduced this live and found strong
  evidence it's the same root cause as the duplicate-Mega-candidate bug
  fixed as Leg 17 (Mega Raichu was the exact species Leg 17 found
  duplicated, see `COMPLETED.md`) — needs a live re-check now that that fix
  is in to confirm whether this sort-order symptom is actually gone.

- **[Live Calc Turn-Order Speed Stage Boosts] — Leg 16** *(Last touched:
  2026-09-09 · Re-checks: 0)*
  Requested live 2026-09-09. Leg 15's turn-order Speed engine
  (`utils/liveCalcSpeedEngine.ts`) currently compares both sides' unboosted
  base Speed only — no Speed stage boosts (e.g. a Speed Boost proc, an
  Icy Wind drop, a Nasty Plot-style self-boost on a Speed-relevant set) for
  either the attacker or the defender, a documented v1 gap called out in
  that engine's own header and in
  [docs/investigations/live-calc-speed-inference-scope.md](docs/investigations/live-calc-speed-inference-scope.md)'s
  "Resolved during the build" section. Add a per-observation (or
  per-Pokémon, TBD) stage input for both sides so a turn observed after a
  boost/drop doesn't misnarrow. Attacker boosts are already known/editable
  (`CalcPokemonState.boosts` on the existing panel) — the open design
  question is whether the attacker's *existing* panel boosts should just be
  honored as-is (dropping the "both sides unboosted for symmetry" v1 call)
  or whether turn-order observations need their own explicit stage field
  independent of the panel, and how a defender-side stage guess factors
  into the nature/SP scan (a new axis alongside nature, or held fixed per
  observation like the move name already is). Unscoped beyond the request
  itself — needs a scoping pass before building, same shape as Leg 15's own
  scope doc.

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

## Unscheduled (not yet scoped, highest-to-lowest priority)

- **[Speed Tiers Preview Strip: Save Override to Team] — Leg 1** *(Last
  touched: 2026-09-09 · Re-checks: 0)*
  Follow-up to Speed Tiers Team Preview Strip (Leg 5, shipped — see
  `COMPLETED.md`): an explicit "save this edit to the team" action that
  would write a session-only SP/nature/form override made in that strip
  back through the real Team Builder commit path. Deliberately not built
  as part of Leg 5 — Vanny flagged it as a future option only when scoping
  that leg. Needs its own scoping pass now that the override UI shape
  actually exists to hang a "save" action off of.

- **[Reg M-C Z-A-Exclusive Movepool Audit] — Leg 1** *(Last touched:
  2026-09-09 · Re-checks: 0)*
  Deferred out of Regulation M-C Prep's Leg 2 (see COMPLETED.md/postmortem)
  rather than forced into that pass. Whether Rillaboom/Baxcalibur/Salamence
  gained any Legends Z-A-exclusive moves PokeAPI's Gen 9 SV learnset
  pipeline wouldn't surface on its own is still unconfirmed — a spot
  WebFetch against Serebii's per-species pages couldn't reliably tell
  genuinely-new moves apart from existing ones it just flagged as
  "unusual." Needs the app's own live-PokeAPI `hasChampionsMoveData` audit
  methodology (`config/championsMovepoolChanges.ts`'s header) applied to
  these 3 species specifically, not a Serebii read. Golisopod (originally
  the 4th) is resolved — see COMPLETED.md's Champions M-C Balance Patch
  Corrections entry.

- **[UI Shift Assessment Sweep — Post Card UI Polish] — Leg 1** *(Last
  touched: 2026-09-08 · Re-checks: 0)*
  Continue scoping/assessing UI shifts and changes to the rest of the app,
  following on from the UI/UX Overhaul and Card UI Polish milestones (see
  `MILESTONES.md`). Open-ended — needs a pass identifying which
  screens/components haven't had a UI-focused pass yet before it turns
  into concrete legs.

- **[Team Gap Analysis: Usage Cutoff Tuning] — Leg 1** *(Last touched:
  2026-09-08 · Re-checks: 0)*
  From Team Gap Analysis Re-evaluation's scoping pass (see `COMPLETED.md`).
  `USAGE_THREAT_RANK_CUTOFF = 50` (`utils/usageThreats.ts`) is a hand-picked
  constant, flagged as unmeasured in its own code comment. Not actionable
  yet - needs real ladder-usage volume/distribution to be visible live
  first; revisit once that data exists rather than re-checking this item on
  a schedule.

## Future Milestones (unscheduled)

