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

Saved Builds Box shipped 2026-09-11 (all 8 legs - see `COMPLETED.md` and
`MILESTONES.md`). No next milestone promoted yet - see "Future Milestones
(unscheduled)" below for the one open candidate.

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

- **[Box Tab: Favoriting] — Leg 1** *(Last touched: 2026-09-11 · Re-checks:
  0)*
  Split out of Box Tab: Reorder's scoping pass 2026-09-11 - the user asked
  for this alongside the sort-mode toggle, but it's a distinct feature (its
  own data field, its own toggle UI, its own sort behavior) so it gets its
  own item rather than riding along inside Leg 7's build. Direct precedent
  already in the app: `Team.favorite` (`pokemon.ts`) + `TeamCard.tsx`'s
  star-icon toggle button + `teamSort.ts::sortTeamsByFavorite` ("favorites
  first, preserve each group's relative order otherwise"). Mirrors cleanly
  onto `SavedPokemonEntry` (new `favorite?: boolean` field) +
  `useSavedPokemon.ts` + an equivalent sort utility, composed with whichever
  sort mode Box Tab: Reorder lands on (favorites-first still applies within
  either Alphabetical or Custom order).
  Not yet scoped in detail: where the star toggle lives on
  `BoxCard.tsx`'s **collapsed** tile specifically - that tile is a tight
  w-28 sprite+label button with no header/button row to drop a toggle into
  today (unlike `TeamCard.tsx`'s spacious header), so this needs its own
  small layout call before it's buildable, not just a copy-paste of Team's
  button.

- **[TeamCard Add-Pokémon: No Species-Clause Dedupe] — Leg 1** *(Last
  touched: 2026-09-10 · Re-checks: 0)*
  Found adjacent to Battle Logger: Duplicate Pokémon Selectable (see
  `COMPLETED.md`) but out of that item's scope. `TeamCard.tsx`'s own
  "+ Add Pokémon" flow (`handleAddSpecies` → `SpeciesPickerCard`) doesn't
  filter out species already on the team, so a team can be built with the
  same species twice - `teamValidation.ts`'s "Validate Team" button only
  warns about this after the fact, it doesn't block it at add-time. Not
  fixed here since the reported bug was scoped to the Battle Logger
  brought-4 pickers specifically.

- **[Reg M-C Z-A-Exclusive Movepool Audit] — Leg 1** *(Last touched:
  2026-09-10 · Re-checks: 1)*
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
  2026-09-10 re-check: live-queried PokeAPI directly for all 6 Reg M-C new
  species (rillaboom, baxcalibur, salamence, cinderace, pincurchin,
  golisopod) — still 0 "champions"-tagged moves for every one of them (vs.
  51 for an already-covered species like archaludon, confirming the query
  methodology itself works). No backfill yet, so this audit still can't run
  the `hasChampionsMoveData` methodology the way Golisopod's fix did —
  genuinely blocked on PokeAPI, not on effort spent here. One more
  no-new-info re-check and this needs to either move to Known Exceptions or
  get flagged for a decision (e.g. hand-curating from user-provided source
  text the way Golisopod's fix did, rather than waiting on PokeAPI further).

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

- **[Add Pokémon: Sortable Base-Stat Table] — Leg 1** *(Last touched:
  2026-09-11 · Re-checks: 0)*
  Requested 2026-09-11, referencing Showdown's Random Battle Dex sortable-
  table view (screenshots shown in chat, not saved to the repo). Wants a way
  to browse every legal-roster species (Mega forms included) from
  "+ Add Pokémon" as a table sortable ascending/descending by HP/Atk/Def/
  SpA/SpD/Spe/BST via column-header clicks, same as Showdown's dex. This
  replaces/extends `SpeciesPickerCard.tsx`'s current flat search-list layout
  for both Teams (`TeamCard.tsx`'s trailing add slot) and Box
  (`BoxPage.tsx`'s "+ New Build"), so needs its own visual scope wider than
  today's in-slot picker card.
  Not yet scoped - two real gaps surfaced skimming the current code, not
  just UI layout: (1) `SpeciesRosterEntry` (`types/gameData.ts`) carries only
  name/id/sprite today, no base stats - stats live per-species in
  `PokeAPICache`, so sorting needs a join against that cache, not a new
  roster field; (2) Mega forms aren't distinct roster entries at all today -
  `config/megaEvolution.ts`'s `MEGA_STONE_TO_SPECIES` only drives a sprite
  swap when a Mega Stone is already held, so "Mega Whatever, BST 700" as its
  own sortable row (with boosted stats) would be new, not a filter over
  existing data. Needs a decision on how Mega rows get their stats before
  this is buildable.

## Future Milestones (unscheduled)

2026-09-10 feedback pass batched into 4 candidate milestones; Battle Logger
Overhaul, Statistics Improvements, and then Team Management QoL were each
promoted to current and have since shipped (see `MILESTONES.md`). The
remaining candidate below is the last of the four — not yet scoped or
promoted.

### Candidate: Live Calc Tuning

- **Live Calc pass.** Live Calc "needs a lot of tweaking" per 2026-09-10
  feedback — explicitly deferred to its own future milestone rather than
  folded into whatever milestone comes next. Not yet scoped into concrete
  legs.

