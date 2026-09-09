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

## Current Milestone: Regulation M-C Prep

- **[Regulation M-C Prep] — Leg 2** *(Last touched: 2026-09-09 · Re-checks:
  0)*
  Reg M-C shipped on schedule (2026-09-08 6pm PST) — Leg 1 (roster/mega-
  stone/regulation-selector registration, see COMPLETED.md) was hand-curated
  ahead of release with no official source to check against yet; Serebii's
  per-species Champions Pokedex/movepool pages are now up (per Vanny) and
  are the source being used to verify it piecemeal, though Serebii's
  dedicated regulationm-c.shtml roster/summary page specifically still
  isn't confirmed up.
  Workflow: full datamined info won't be out until end-of-week, so Vanny is
  feeding confirmed details in piecemeal as they land (same running-tally
  pattern as Leg 1) rather than waiting for one complete dump; treat each
  incoming batch as incremental manual population of the config files below,
  not a single re-verification pass.
  2026-09-08 update: Vanny confirmed the full non-Mega species roster
  (Wigglytuff, Persian +Alolan, Farfetch'd, Mr. Mime, Swalot, Gogoat,
  Golisopod, Rillaboom, Cinderace, Inteleon, Thievul, Toxtricity both
  forms, Grapploct, Perrserker, Sirfetch'd, Pincurchin, Indeedee M/F,
  Arboliva, Squawkabilly all 4 forms, Mabosstiff, Baxcalibur) and the new
  item list (Leek, Rocky Helmet, Air Balloon, Red Card, Binding Band,
  Eject Button, Normal Gem, Terrain Extender, Grassy Seed, Psychic Seed,
  Electric Seed, Misty Seed) — see `project_regulation_mc_prep` memory for
  the full list. This also confirms Baxcalibur, Golisopod, and Salamence
  all get ordinary (non-Z) Megas, matching the 6-Mega-Stone count already
  scoped below. Vanny pasted source text in 3 dumps (items, move changes,
  ability changes) — all 3 now received and transcribed verbatim, with
  discrepancy notes, into `docs/investigations/regulation-mc-source-text.md`;
  the piecemeal-gathering phase is done, this doc is the full source
  material to implement from. (Dump 3's ability list gives the Mega
  Lucario Z ability as "Aura Guard" — already correctly named that way in
  `config/megaAbilities.ts`, fixed a few days before this dump landed; the
  earlier "Aura Break" name flagged in-session was stale leftover memory,
  not a real code discrepancy.) Also: a powder-move cluster (Poison Powder/Stun
  Spore/Sleep Powder/Spore/Cotton Spore/Rage Powder/Magic Powder) plus
  Thunder Wave and the Effect Spore ability all gained explicit
  Grass-/Ground-type-immunity clauses — verify these against current
  behavior, not just treat as wording; and a batch of moves/abilities with
  no "Previous:" text read as newly relevant to Champions because they
  belong to dump 1's new species (Libero→Cinderace, Grassy
  Surge→Rillaboom, Psychic Surge→Indeedee-M, Punk Rock→Toxtricity,
  Emergency Exit→Golisopod, Grass Pelt→Gogoat, etc.) rather than being
  brand-new ability concepts — full details and remaining species↔ability
  pairings to confirm are in the source-text doc.
  2026-09-08 post-release update: M-C is officially out. Baxcalibur-Mega is
  user-confirmed as Thermal Exchange, matching the pre-release
  `@smogon/calc` value (already correct, no change needed). Golisopod-Mega
  is user-confirmed as Tough Claws — NOT Emergency Exit, which is what
  `@smogon/calc`'s pre-release data had (that was Golisopod's own *ordinary*
  ability leaking in as stale placeholder data, the same failure mode
  already known from the Z-Mega abilities); corrected in
  `config/megaAbilities.ts` and its Group 3 provenance comment.
  Salamence-Mega is user-confirmed as Aerilate, unchanged from previous
  gens — matching the pre-release `@smogon/calc` value, already correct.
  Pawmot was also added as a new species — added to `REG_MC_ADDED_SPECIES` in
  `utils/pokemonRules.ts` alongside the pre-existing 4. Serebii's
  per-species Champions Pokedex/movepool pages are now up (per Vanny) — a
  source for the still-outstanding items below and for the ~20-species
  non-Mega roster (see 2026-09-08 update above) not yet added to
  `REG_MC_ADDED_SPECIES`.
  2026-09-09 update: Serebii's Reg M-C pages are now live (Vanny doesn't
  fully trust the spreadsheet source and asked to verify against Serebii
  specifically). Done this session, all via live Serebii fetches:
  `utils/pokemonRules.ts`'s `REG_MC_ADDED_SPECIES` re-verified against
  `rankedbattle/regulationm-c.shtml`'s own "Newly Useable Pokémon" list and
  expanded from the 5 pre-release entries to the full confirmed roster (26
  slugs, including Indeedee/Persian/Toxtricity form-splits - see the file's
  own comment for the splitting rationale); found and fixed a real bug while
  doing this - Indeedee wasn't in `GENDER_DIVERGENT_BASE_SPECIES`, which
  would've made a bare "Indeedee"/"Indeedee-F" import silently fail
  legality despite being roster-legal. `config/vgcData.ts`'s 6 Mega Stones
  re-verified against `pokemonchampions/items.shtml` - exact match, no
  changes needed; that same page also confirmed all 12 of Reg M-C's new
  hold items (Leek, Rocky Helmet, Air Balloon, Red Card, Binding Band,
  Eject Button, Normal Gem, Terrain Extender, 4 terrain Seeds), which
  weren't in `VGC_HOLD_ITEMS` yet - added. `config/megaAbilities.ts`'s
  Group 3 (Absol/Garchomp/Lucario Mega Z + Baxcalibur/Golisopod/Salamence
  ordinary Mega) cross-checked against the dedicated
  `pokemonchampions/megaabilities.shtml` page - all 5 listed entries
  matched exactly (Salamence isn't listed there since its ability is
  unchanged from mainline, consistent with the already-confirmed value, not
  contradicting it). `config/seasons.ts`'s M-5 end date corrected from an
  inferred placeholder to Bulbapedia's now-published real date
  (2026-09-09); M-6+ confirmed still not addable - Serebii only has Reg
  M-C's overall date range (Sept 9 - Dec 2 2026) published so far, no
  individual season breakdown on either source yet. Type-check/lint/full
  test suite (593 tests) all pass.
  2026-09-09 item audit: Dump 1's flagged discrepancy (Air Balloon/Red
  Card/Eject Button/Normal Gem/Binding Band/Rocky Helmet reading as
  "reprinted flavor text for existing items" rather than genuinely new)
  is resolved — walked `vgcData.ts`'s git history back to the 2026-07-05
  Serebii-sourced accurate-Champions-pool refactor and confirmed all 6 were
  absent from the app continuously from that point until yesterday's Reg
  M-C addition, so they're genuinely new-to-Champions, not duplicate
  re-adds. No code change needed. Full reasoning in the source-text doc.
  Still open: whether Rillaboom/Baxcalibur/Salamence/Golisopod gained any
  Legends Z-A-exclusive moves PokeAPI's Gen 9 SV learnset pipeline wouldn't
  surface on its own - a spot WebFetch against Serebii's per-species page
  couldn't reliably distinguish genuinely-new moves from existing Gen 8/9
  ones it just flagged as "unusual" (e.g. it mis-flagged Rillaboom's own
  existing signature moves Drum Beating/Grassy Glide), so this needs the
  app's own live-PokeAPI `hasChampionsMoveData` audit methodology
  (`config/championsMovepoolChanges.ts`'s header) instead of a Serebii read
  - deferred as a separate task rather than forced into this pass.
  `seasons.ts` M-6+ rows remain blocked on Bulbapedia/Serebii publishing
  them (not a decision point - just re-check both sources periodically
  until they land).
  2026-09-09 dump 2/3 verification (resolved, no code changes needed): went
  through every code path that could be affected by dump 2/3's wording
  changes and newly-relevant abilities.
  - Powder-move cluster (Poison/Stun/Sleep/Cotton Spore, Spore, Rage/Magic
    Powder) and Thunder Wave's new "Grass-/Ground-type Pokémon are
    unaffected" clauses are pure pre-existing mainline mechanics (Gen 6+
    powder immunity, type-chart-driven Electric-vs-Ground immunity), not
    new Champions patches - and this app's Battle Logger has no code path
    that checks type-based status-move legality at all (confirmed: the
    "Inflict Status?" chip in `BattlefieldSlot.tsx` is a manual toggle, no
    type check backs it - already flagged as a known gap in
    `moveBlockingAbilities.ts`'s header). Nothing to regress.
  - Thunder/Hurricane's reworded weather-accuracy clause ("never misses in
    Rain," "50% accuracy in Sun") is already modeled exactly as described
    in `config/moveWeatherEffects.ts` - confirmed exact match, no change.
  - Substitute's new "sound-based moves hit through it" sentence: this app
    doesn't model Substitute at all (no bypass-list, no HP-shield tracking
    anywhere in `config/`) - nothing to update.
  - Effect Spore/Speed Boost/Sand Veil/Prankster's added clauses (Grass-type
    immunity, no-switch-turn-boost, sandstorm-immunity, doesn't-work-on-Dark)
    all describe trigger shapes (end-of-turn, weather-conditional,
    priority-based) none of this app's 3 curated ability tables
    (`onSwitchInAbilities.ts`/`reactiveAbilities.ts`/`hitReactiveAbilities.ts`)
    cover - consistent with pre-existing documented scope gaps, not
    something Champions' wording broke.
  - Newly-relevant-to-Champions abilities from dump 1's new species: every
    curated table is keyed by ability name, not species, so any species that
    legally has one of these abilities is automatically covered with no
    per-species wiring needed. Grassy Surge/Psychic Surge (`onSwitchInAbilities.ts`)
    and Rattled (`hitReactiveAbilities.ts`) were already present and correct.
    Stakeout→Thievul, Steely Spirit→Perrserker, Seed Sower→Arboliva, Guard
    Dog→Mabosstiff, Emergency Exit→Golisopod, Libero→Cinderace, Grass
    Pelt→Gogoat, Liquid Ooze/Run Away→Swalot, Punk Rock→Toxtricity are real
    species pairings but none of those abilities fit any existing curated
    table's trigger shape (HP-threshold, Intimidate-block-specific,
    type-change-on-move-select, etc.) - same "known gap, not an oversight"
    category as Anger Shell/Berserk/Dazzling already documented in those
    files' headers, not a new hole Reg M-C opened.
  This closes out dump 2/3's remaining open verification items from the
  2026-09-08/09-09 notes above - full source text and per-move/per-ability
  reasoning already in `docs/investigations/regulation-mc-source-text.md`.
  2026-09-09 movepool-additions audit (found and fixed a real bug): the one
  item dump 2's notes hadn't actually closed out yet - its "no Previous:
  block" move list (Slash, Octazooka, Milk Drink, Shift Gear, Zing Zap,
  Snipe Shot, Jaw Lock, Octolock, Court Change, Drum Beating, Pyro Ball,
  Meteor Assault, Glaive Rush) needed checking against
  `config/championsMovepoolChanges.ts`, not assumed to be no-ops like the
  rest of dump 2/3. Several are signature moves of Reg M-C's new-species
  roster; live PokeAPI checks against all 26 new species found rillaboom,
  cinderace, and pincurchin (like baxcalibur before them) have zero
  "champions"-tagged moves, so their own signature moves (Drum Beating, Pyro
  Ball, Zing Zap) were falling into `GLOBALLY_REMOVED_MOVES` and getting
  silently stripped - same bug shape as the already-fixed
  baxcalibur/glaive-rush case. Added `CHAMPIONS_MOVEPOOL_ADDITIONS` entries
  for all 3 plus matching tests. Grapploct/Octolock, Inteleon/Snipe Shot,
  Sirfetch'd/Meteor Assault are also new-roster signature pairings but
  needed no entry (their moves aren't in the removed list); the remaining 6
  moves don't map to any new-roster species and needed no action. Upper
  Hand's wording diff confirmed non-functional. Type-check/lint/full test
  suite (594 tests) all pass. Full reasoning in the source-text doc.
  **Leg 2 is now effectively complete** modulo two open threads that are
  deliberately out of this leg's scope rather than open sub-items: the
  Z-A-exclusive-move audit (needs a separate live-PokeAPI methodology pass,
  not a Serebii read) and `seasons.ts` M-6+ rows (blocked on
  Bulbapedia/Serebii publishing them). Next incoming Vanny dump (if any) or
  a decision to close the leg out are both live paths from here.

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

- **Speed Calc-like Feature** — concept only, surfaced 2026-09-08 alongside
  the Team Gap Analysis redesign scoping above but deliberately not part of
  it - this is a new comparative-speed-tiering calc surface, not a
  gap-analysis extension. Per Vanny, the open design problem isn't the
  mechanic itself (a Showdown-usage-backed speed-tier list, similar in
  spirit to vgcmulticalc's own Speed Calc) but how to make it different/
  unique enough to not read as a blatant copy of a feature that's fairly
  distinctive to that site. Needs its own dedicated design-questions pass
  (what makes ours meaningfully different in framing/data/interaction, not
  just reskinned) before this turns into real legs - explicitly deferred
  rather than answered here.

