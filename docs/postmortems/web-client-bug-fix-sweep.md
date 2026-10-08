# Web Client Bug Fix Sweep — Post-Mortem

2026-10-08. Reported by Vanny from personal use of the web client after the
Full Web Feature Parity / Post-Parity Polish milestones shipped.

## What shipped

- **Lost-update race in `useTeams.ts`'s mutators** (Legs 1-2): mutators
  rebuilt "next state" off a `teams` value closured at render time instead
  of a synchronously-updated ref, with no serialization between concurrent
  mutations — two edits fired before a re-render could race and silently
  drop one. Fixed with a ref + serializing write queue.
- **Item/ability/move picker panels spawning off-screen** (Leg 3): height
  budget measured against the wrong side and didn't account for
  `FloatingCardPanel`'s own above/below flip or picker chrome.
- **Stale local component state not resyncing off externally-applied
  updates** (Leg 4, and its StatsColumn EVs spin-off): `useState` draft
  fields in `EditOverlays.tsx`/`EditablePokemonCore.tsx`/`StatsColumn.tsx`
  initialized once from props and never resynced when a Real Set
  import/bundle pick changed the underlying `pokemon`/`evs` prop out from
  under them. Fixed with the render-time prop-resync pattern already used
  elsewhere (`TeamCard.tsx`'s `rosterIdsKey`).
- **Real Sets panel bundle preview was destructive on click** (Leg 5):
  clicking a row applied the set immediately instead of previewing it;
  split into an expand-to-preview + explicit "Apply This Set" button.
  Live-verified by Vanny on web.
- **Team drag-reorder reverting after a few seconds** (Leg 7): a genuinely
  distinct root cause from Legs 1/2/4 — a sync-protocol gap, not a local
  race or stale render. `setTeamOrder` never bumped `updatedAt`, so the
  Worker's last-write-wins per-record merge (no concept of list position)
  discarded the reorder on the next auto-sync. Fixed by giving `Team` its
  own `sortOrder` field that rides along with `updatedAt`.
- **Teams list sort order** (Leg 8): added regulation (newest first) as a
  secondary sort key under favorite, which also resolved the standing
  "grip handle disabled while filtered" gate since a filtered view is now
  always one contiguous regulation group.
- **Regulation filter not persisting across sessions** (Leg 9): moved
  `TeamsPage`'s `activeFilter` out of component-local `useState` into
  `settings.json` alongside the other per-device UI preferences.
  Live-verified by Vanny on web (confirmed after this doc's initial draft).
- **Default regulation fallback was the oldest regulation, not current**
  (Leg 10): fixed the fallback derivation plus a one-time migration for
  settings records that already had the stale literal persisted to disk.
- **Redundant saved-build review step on team creation** (Leg 11): removed
  outright since the same choice is already available per-Pokémon during
  editing.
- **Real Set sampling gave no progress feedback** (Leg 12): now reports
  "(N/M pastes checked)" and populates results as bundles are found
  instead of only after the whole sequential loop completes.

All legs live-verified by Vanny on the live web deploy. No further findings
surfaced during the second pass (Leg 6), so that catch-all item closed
without filing additional legs.

## What went well

- Splitting on root cause rather than symptom paid off: four visually
  similar "stuff reverts/looks stale" reports turned out to be four
  genuinely distinct bug classes (lost-update race, stale prop-initialized
  state, a sync-protocol merge gap, and a plain UX/destructive-click
  issue). Treating them as separate legs instead of one big "fix the web
  bugs" task kept each fix scoped and verifiable on its own.
- The render-time prop-resync pattern already established by
  `TeamCard.tsx`'s `rosterIdsKey` generalized cleanly to three more
  components (Leg 4's two files plus the StatsColumn spin-off) without
  needing a new abstraction.
- Live web verification (rather than just desktop or unit tests) caught
  the Leg 7 sync-protocol gap, which wouldn't have surfaced in a
  single-device desktop test at all.

## What didn't go well / friction points

- The milestone stayed open under a catch-all "second pass" item (Leg 6)
  for the full sweep rather than closing once the first batch's root
  causes were fixed. That's reasonable given the user was still actively
  using the app and surfacing new reports, but it meant the milestone
  boundary wasn't clearly knowable in advance.
- Two COMPLETED.md entries (Legs 4 and 9) were left marked "not yet
  live-verified" past their fix commits and had to be caught and corrected
  at milestone-close time rather than updated as verification happened.
  Worth closing the loop on verification status in the same session it's
  confirmed, not deferring it to the next docs pass.

## Scope creep observed

- Leg 11 (removing the existing-vs-imported review step) and Leg 8 (sort
  by regulation) are small UX decisions rather than bug fixes in the
  strict sense, but were filed and shipped under the same bug-sweep
  milestone since they came from the same batch of live-use reports.
  Reasonable in practice, but worth naming: a "bug fix sweep" milestone
  absorbed a couple of judgment-call feature tweaks along the way.

## What changes for the next milestone

- When a fix lands and gets live-verified afterward (not in the same
  session as the fix commit), update the COMPLETED.md entry's
  verification status immediately rather than leaving "not yet
  live-verified" to be caught later at a milestone-close audit.
- Continue treating visually-similar bug reports as independent root-cause
  investigations rather than assuming shared causes — this sweep's mix of
  four distinct causes behind similar-looking symptoms is likely typical,
  not a one-off.
