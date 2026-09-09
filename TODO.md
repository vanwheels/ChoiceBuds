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

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

- **[Regulation M-C Prep] — Leg 2** *(Last touched: 2026-09-08 · Re-checks:
  0)*
  Blocked: Reg M-C shipped on schedule (2026-09-08 6pm PST), resolving the
  release-date half of this wait, but Serebii's dedicated regulationm-c.shtml
  page isn't confirmed up yet (only its per-species Champions Pokedex/
  movepool pages are, per Vanny) — Leg 1 (roster/mega-stone/regulation-
  selector registration, see COMPLETED.md) was hand-curated ahead of release
  with no official source to check against yet.
  Workflow once the patch drops: full datamined info won't be out until
  end-of-week, so Vanny is feeding confirmed details in piecemeal as they
  land (same running-tally pattern as Leg 1) rather than waiting for one
  complete dump; treat each incoming batch as incremental manual
  population of the config files below, not a single re-verification pass.
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
  Once live: re-verify `utils/pokemonRules.ts`'s `REG_MC_ADDED_SPECIES` and
  `config/vgcData.ts`'s 6 new Mega Stones against Serebii's own Reg M-C
  pages (replacing the pre-release provenance notes in both files' headers
  with real citations, same as M-A/M-B); spot-check Baxcalibur/Golisopod/
  Salamence's now-confirmed Mega abilities and the 3 Mega Z
  abilities (Absol/Garchomp/Lucario, user-confirmed but not yet
  cross-checked against a published source) in `config/megaAbilities.ts`;
  check whether Rillaboom/Baxcalibur/Salamence/Golisopod gained any Legends
  Z-A-exclusive moves PokeAPI's Gen 9 SV learnset pipeline wouldn't surface
  on its own (Leg 1 deliberately didn't chase this pre-release - see its
  COMPLETED.md entry); add `seasons.ts`'s M-6+ rows once M-C's season dates
  are known.

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

