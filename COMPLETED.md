# ChoiceBuds - Completed Work Log

Archive of finished work, split out of `TODO.md` (2026-07-08) to keep the
active task list quick to scan. Newest entries first. Cross-references to
still-open items point to `TODO.md`; references to other entries here stay
local ("see below"/"see above").

Archived at milestone boundaries as of the 2026-09-13 split (Regular Calc
Popup - see `MILESTONES.md`), per CLAUDE.md's archiving rules: a shipped
milestone becomes the real cutoff instead of an arbitrary entry count. Empty
right now - nothing has completed since the split. Entries prior to this
file's oldest are in:
- [docs/archive/completed-2026-06-17-to-2026-07-09.md](docs/archive/completed-2026-06-17-to-2026-07-09.md)
  (the 50 oldest entries as of the 2026-08-31 split)
- [docs/archive/completed-2026-07-09-to-2026-09-01.md](docs/archive/completed-2026-07-09-to-2026-09-01.md)
  (everything through the Battle Logger Re-eval + Data & Process Cleanup
  milestone, split out at the 2026-09-08 Card UI Polish boundary)
- [docs/archive/completed-2026-09-01-to-2026-09-13.md](docs/archive/completed-2026-09-01-to-2026-09-13.md)
  (Card UI Polish through Regular Calc Popup and everything shipped between
  them, split out at the 2026-09-13 Regular Calc Popup boundary)

- **[VGCPastes Sample Team Catalog: Row Display Rework] — Leg 2**
  (2026-09-14) - see commit `d96aef9`. Reworked catalog rows
  (`VgcPasteCatalogRow.tsx`, split out of `VgcPasteCatalogModal.tsx`) from
  plain description/owner/tournament/rank/date text + species-name chips to
  match `TeamCard.tsx`'s own visual format: name/author header + 6 species
  sprites (matched against the already-loaded roster by normalized name,
  since the sheet's species text doesn't always match this app's
  display-name spelling exactly). Added a per-row expand toggle previewing a
  team's full moves/EV spreads before importing - fetch is lazy (on
  expand-click only, cached per row), decided via `AskUserQuestion` over
  eager-per-row-on-tab-load given a regulation tab can hold 200+ rows.

- **[VGCPastes Sample Team Catalog] — Leg 1** (2026-09-14) - see commit
  `dc903aa`. Browsable "Browse Sample Teams" catalog (Teams page) of real
  tournament teams pulled from the public VGCPastes Google Sheet, filtered
  to rows with a confirmed real EV spread, manually refreshed per regulation
  tab. Picking a row hands its pokepaste link to the existing
  `ImportTeamModal` import path as-is. Column layout
  (`services/vgcPastes.ts`) verified live against all three current-game
  sheet tabs during implementation planning, not guessed. Added the eighth
  CLAUDE.md bulk-ingestion policy exception + README Credits entry in the
  same change. Flagged a search/filter follow-up as scope creep rather than
  building it - see `TODO.md`'s Unscheduled section.

- **[VGCPastes Real-Set Sourcing: Scoping] — Leg 1** (2026-09-14) -
  Scoping-only, no code change. Resolved the four open questions left by
  `vgcpastes-sourcing-feasibility.md` (Vanny's calls, via
  `AskUserQuestion`): sequence the browsable sample-team catalog before
  per-species real-set extraction; refresh via manual pull only, no
  scheduled job; keep only rows flagged `EVs == Yes`. Also drafted the
  proposed eighth CLAUDE.md bulk-ingestion policy exception text for Leg 1
  to apply when it starts. Split into `[VGCPastes Sample Team Catalog] —
  Leg 1` and `[VGCPastes Per-Species Real-Set Extraction] — Leg 2` in
  `TODO.md`. Full reasoning in
  `docs/investigations/vgcpastes-sourcing-scope.md`.
