# ChoiceBuds - Completed Work Log

Archive of finished work, split out of `TODO.md` (2026-07-08) to keep the
active task list quick to scan. Newest entries first. Cross-references to
still-open items point to `TODO.md`; references to other entries here stay
local ("see below"/"see above").

Archived at milestone boundaries as of the 2026-09-30 split (Post-Parity
Polish - see `MILESTONES.md`), per CLAUDE.md's archiving rules: a shipped
milestone becomes the real cutoff instead of an arbitrary entry count.
Entries prior to this file's oldest are in:
- [docs/archive/completed-2026-06-17-to-2026-07-09.md](docs/archive/completed-2026-06-17-to-2026-07-09.md)
  (the 50 oldest entries as of the 2026-08-31 split)
- [docs/archive/completed-2026-07-09-to-2026-09-01.md](docs/archive/completed-2026-07-09-to-2026-09-01.md)
  (everything through the Battle Logger Re-eval + Data & Process Cleanup
  milestone, split out at the 2026-09-08 Card UI Polish boundary)
- [docs/archive/completed-2026-09-01-to-2026-09-13.md](docs/archive/completed-2026-09-01-to-2026-09-13.md)
  (Card UI Polish through Regular Calc Popup and everything shipped between
  them, split out at the 2026-09-13 Regular Calc Popup boundary)
- [docs/archive/completed-2026-09-13-to-2026-09-30.md](docs/archive/completed-2026-09-13-to-2026-09-30.md)
  (VGCPastes Real-Set Sourcing through Post-Parity Polish and everything
  shipped between them, split out at the 2026-09-30 Post-Parity Polish
  boundary)

- **[Reg M-C Z-A-Exclusive Movepool Audit] — Leg 1** (2026-09-30) - see
  commit `b990967`. Re-ran Leg 4b's PokeAPI-vs-`learnsets.ts` diff
  methodology (see `docs/investigations/champions-showdown-mod-audit.md`)
  against the full current legal roster rather than just the 3 hand-picked
  indicator species - confirmed the zero-`hasChampionsMoveData` set is
  exactly all 25 Reg M-C-added species (no regressions elsewhere) and
  populated `CHAMPIONS_MOVEPOOL_ADDITIONS`/`CHAMPIONS_MOVEPOOL_REMOVALS` for
  all 25, superseding the 5 single-move entries hand-added during Reg M-C
  Prep. Closes the item outright - no further legs needed; the existing
  `hasChampionsMoveData !== true` self-heal already covers pruning this data
  once PokeAPI eventually back-fills Reg M-C.
</content>
