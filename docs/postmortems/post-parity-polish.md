# Post-mortem: Post-Parity Polish

**Date:** 2026-09-30 (same day as Mobile-Friendliness Pass, immediately
after it shipped). **Status:** Shipped, 8 legs. Full implementation detail
for every item below lives in its own `COMPLETED.md` entry (now archived to
[docs/archive/completed-2026-09-13-to-2026-09-30.md](../archive/completed-2026-09-13-to-2026-09-30.md));
this doc is the retrospective, not a restatement.

## What shipped

A feedback batch Vanny raised live while verifying Web Settings Parity -
mostly small Settings/Sync/Box/Battle Log polish items, plus three real
product decisions. Scoped live in conversation (no separate scoping doc),
decision-free fixes sequenced first per Vanny's call, decision items after:

1. **Box New-Build Tile Sizing.** `BoxPage.tsx`'s "+ New Build" tile matched
   down to the collapsed `BoxCard` tile's size instead of sitting 2x larger
   beside it. See commit `f122805`.
2. **Account Status Section Cleanup.** Settings' last section renamed "App
   Status" → "Account Status" and its three stacked rows collapsed into one
   compact inline row. See commit `004dd12`.
3. **Team Author Autofill from Sync Username.** Import Team's Author field
   now defaults to the signed-in sync username when empty, matching the
   existing catalog/paste autofill pattern. See commit `6fde9e4`.
4. **Battle Log Card Grid Cleanup.** `PastBattlesList.tsx` cards now render
   at a fixed height with truncation + tooltips instead of uneven heights
   from unbounded text. See commit `58c0394`.
5. **Floating Calc Button Repositioning.** The Calc launcher is now
   drag-to-corner-snap instead of fixed in place, with its chosen corner
   persisted per-device outside of sync. Needed two follow-up fixes to get
   the corner-switch animation right. See commits `4d2267c`, `0ed96f1`,
   `37a1942`.
6. **Sidebar Sync Status Indicator Removal** (decision). Dropped the sync
   status dot/text from the web sidebar footer - Settings' `SyncSection`
   stays the sole status source. See commit `2263f44`.
7. **Season/Champions Data Check Removal** (decision). Removed the manual
   "Mark as Checked" sections for season/Champions balance-patch data
   outright rather than automating them, deleting both hook/section pairs
   and their `AppSettings` fields. See commit `4289fd8`.
8. **Player Profile Cross-Device Sync** (decision). Added `playerProfile` to
   `SyncPayload` as a last-write-wins singleton (new `mergeSingleton` on the
   Worker, separate from the existing per-record `mergeCollection`), plus a
   whole-section reveal toggle masking PII fields by default in Settings.
   See commit `bffb9fc`.

## What went well

- **Sequencing decision-free fixes before the three decision items** meant
  the batch's easy wins shipped immediately without waiting on Vanny to
  resolve open questions, and the decisions themselves (sync indicator
  placement, data-check automation vs. removal, profile sync shape) got
  made in a tight few exchanges rather than stalling the whole batch.
- **Killing the Season/Champions manual-check UI outright instead of
  automating it** was the right call once surfaced - the feature existed to
  paper over a gap, and removing the gap's symptom (rather than building
  automation to maintain it) was less code and less to maintain going
  forward.
- **Reusing an existing merge pattern (`mergeCollection`) as the template
  for a new one (`mergeSingleton`)** for Player Profile sync kept that leg
  small - the hard part (conflict resolution) already had a shape to copy
  from the per-record sync model shipped earlier in Full Web Feature Parity.

## What didn't go well / friction points

- **This was flagged as a four-area batch (Settings/Sync/Box/Battle Log) but
  scoped without its own written investigation doc** - unlike most other
  milestones this project ships, there's no `docs/investigations/*.md` to
  point back to for how the three decisions were reached, only this
  post-mortem and the individual commit messages. Fine for a batch this
  small, but would be worth a doc if a similar multi-area feedback batch
  comes in larger next time.
- **Same-day-as-Mobile-Friendliness-Pass sequencing makes the git range
  non-obvious** - same friction noted in that milestone's own post-mortem:
  reconstructing which commits belong to which milestone required reading
  individual commit messages rather than a clean `git log` range.

## Scope creep observed

- None beyond the batch's own stated scope. The three decision items
  (sync indicator, data checks, profile sync) were already part of what
  Vanny flagged going in - resolving "automate vs. remove" for the data
  checks was a scoping decision within the item, not new scope added
  mid-leg.

## What changes for the next milestone

- No current milestone is scoped as of this close-out - `TODO.md`'s
  Unscheduled and Future Milestones sections carry several unscoped
  candidates (the Web TeamCard Expand Infinite-Loop Bug, the UI Shift
  Assessment Sweep, the two Web Version fast-follows, the download/landing
  page, web content-area padding gap, Teams search bar, and Battle Logging
  events) - next session should scope one of these into a leg list before
  opening a new `## Current Milestone:` section.
- If a future feedback batch spans this many unrelated areas again, write a
  short scoping doc even for a same-day batch - cheap insurance against the
  "no investigation doc to point back to" gap noted above.
</content>
