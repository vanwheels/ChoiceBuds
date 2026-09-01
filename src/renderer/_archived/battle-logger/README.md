# Archived: Live Battle Logger

Retired 2026-08-31 (see `TODO.md`'s "Battle Logger Retirement" item and
`COMPLETED.md` for the commit). This directory holds the live turn-by-turn
battle logging + championsbattledata.com stat-inference UI that used to back
the Battle Log tab's in-progress-battle view — kept in-tree rather than
deleted, in case Pokemon Champions ever exposes real match data/replays that
would make rebuilding on top of this worthwhile.

**Nothing in the live app imports from this directory**, so it was never
part of the Vite bundle to begin with. It's also excluded from `tsconfig.json`
and `eslint.config.js` (same treatment as `dist/`/`release/`), since its
files still have their original relative import paths from before the move
and were never fixed up to resolve from their new depth - `tsc`/eslint would
otherwise flag every one of them as broken. Safe to leave as-is indefinitely;
resurrecting any of it means fixing those import paths back up first.

## What's here

- `components/battlelog/` — every battle-log component that only made sense
  for live play: the active-battle shell (`ActiveBattleView`, `Battlefield`,
  `BattlefieldSlot`, `FieldWeatherBar`), the turn-by-turn log
  (`TurnLog`, `MoveLogPopover`, `MoveOutcomePrompt`), the roster/scouting
  panels (`PlayerFieldPanel`, `OpponentFieldPanel`, `OpponentRowFields`,
  `TeamRosterColumn`, `RosterRow`), the stat-stage/status popovers
  (`StatStagePopover`, `StatusConditionPopover`), the "likely sets"
  stat-inference popover (`LikelySetsPopover`), and the old team-start flow
  (`StartBattleFlow`).
- `hooks/useBattleLogActions.ts` — every live-battle mutation (log an action,
  toggle brought/active/fainted, add/scout an opponent Pokemon, set
  stages/status/field conditions, etc.), built on top of `useBattles.ts`'s
  `updateBattle`.
- `utils/battleLookup.ts` — turn-log lookup helpers (which Pokemon can act
  this turn, hit-reactive-ability checks, etc.) that only made sense against
  a live `turns` array.
- `utils/battleCalcReview.ts` — the "Show Calc" hand-off that seeded the Calc
  tab from a logged turn's matchup.

## What did NOT move here (still active)

- `types/pokemon.ts`'s `Battle`/`BattlesDatabase`/`BroughtPokemonSnapshot`/
  `OpponentPokemonEntry` types are unchanged — the replacement post-match
  record (`components/battlelog/RecordMatchForm.tsx`) populates the same
  `Battle` shape, just with the turn-log/field-state fields left at their
  empty defaults (`turns: []`, blank `fieldState`, etc.). No schema change,
  no data migration.
- `hooks/useBattles.ts` (plain CRUD/persistence) and `utils/battleStats.ts` /
  `utils/battleSets.ts` (Statistics page aggregation, Bo3 grouping) are
  unchanged and still power the Statistics page exactly as before.
- `services/championsBattleData.ts` is unchanged and still active — it's
  shared with the Calc tab's stat-inference feature
  (`CalcPokemonPanel.tsx`/`useGameData.ts`). Only `LikelySetsPopover.tsx`
  (the in-battle consumer of it) retired.
- `components/battlelog/BattleLogPage.tsx` and `PastBattlesList.tsx` stayed
  active, rewritten to drop the live-battle flow in favor of the new
  ~30-second post-match record.
