# Speed Tiers Preview Strip: Save Override to Team — Scoping Session

Design-questions pass done 2026-09-10, opening the follow-up
`speed-tiers-preview-strip-scope.md` explicitly deferred out of Leg 5 ("a
later 'save this edit to the team' action... tracked as its own unscheduled
follow-up... don't build it speculatively here"). That doc, plus
`utils/speedTierOverrides.ts`'s header (the exact shape of what a
`TeamSpeedOverride` currently holds: `spSpeed`, `nature`, `species`), is the
prior art this session builds on. Resolves into two new legs inserted into
`TODO.md`'s Current Milestone section (Legs 17-18).

## Trigger

Vanny: "Start [Speed Tiers Preview Strip: Save Override to Team] — Leg 1 and
add it to the current milestone." The TODO item itself already flagged this
needed its own scoping pass now that Leg 5's override UI shape exists to
hang a save action off of — this session is that pass.

## Resolved (2026-09-10, Vanny's calls via AskUserQuestion)

- **Save scope: Speed SP + nature only, not species/form.** The Mega/
  stat-forme toggle in `TeamPreviewCard.tsx` stays preview-only forever,
  same as it is today. A form write-back would need its own design pass
  (held-item consistency for Mega Evolution, ability follow-through, and
  every other reader of a team's `showdownData.species` elsewhere in the
  app currently assumes it's real saved data, not a hypothetical preview) —
  explicitly out of scope for this follow-up.
- **Save UI: both a per-card action and a page-level "Save All."** Each
  `TeamPreviewCard` gets its own save affordance (enabled only when that mon
  has an active override in the strip's `Map<string, TeamSpeedOverride>`,
  disabled/hidden otherwise), plus a page-level "Save All" in
  `TeamPreviewStrip.tsx` that saves every mon currently holding an override
  in one action.
- **No confirmation dialog.** Matches existing app precedent — Delete Team
  itself fires immediately with no confirm dialog anywhere in the app today
  (checked `TeamOverflowMenu.tsx`; no `confirm()`/dialog pattern exists
  anywhere in `src/renderer`). Lower-stakes than a delete besides: only EVs
  .speed and nature change, both re-editable afterward in Team Builder.
- **Post-save: clear that mon's override.** Once saved, the override equals
  the real committed data with nothing left to preview-diff, so the card
  reverts to showing the team's real (now-updated) values with no override
  active. `Save All` clears every override it just wrote.
- **New requirement surfaced in the same answer: an over-cap warning, not a
  block.** The preview strip's Speed-SP stepper (`TeamPreviewCard.tsx`) only
  ever sees Speed in isolation — unlike Team Builder's `StatsColumn.tsx`,
  which gates every stat's `+` button at a live 66-total-EV cap across all
  six stats (`canIncrement={val < 32 && totalEVs < 66}` — see
  `StatsColumn.tsx:150`), because it has the whole spread in view. Nothing
  in this strip currently knows the other five stats' EVs, so a save can
  legitimately push a team member's real total over 66 (e.g. 40 SP already
  spent elsewhere + cranking this strip's Speed slider to 32 = 72 total).
  Resolved call: **don't block the save** — write it through, then surface
  a warning flag on both the Team Card and the (expanded) Pokemon Card for
  that team member, so the overage is visible wherever the team is viewed
  afterward, not just in the moment of saving.

## Not resolved here / still open at build time

- **Where the per-mon Save button/Save All button live visually** in
  `TeamPreviewCard.tsx`/`TeamPreviewStrip.tsx` — an implementation-shape
  call, not a design question (the strip's cards are already dense at
  108px wide; fitting a save affordance in cleanly is a build-time layout
  problem).
- **Write mechanics.** `SpeedTiersPage.tsx` already receives `teamsState:
  UseTeamsReturn` as a prop, so the save action can call
  `teamsState.updateTeam(selectedTeam.id, { pokemon: <updated array> })`
  directly — patching just that one `ImportedPokemonInfo`'s
  `showdownData.evs.speed`/`showdownData.nature` in a copy of
  `selectedTeam.pokemon`, same shape `reorderTeam` already uses for a
  targeted array patch. This does **not** need to go through
  `useActiveEditor`'s deep-clone-draft/commit flow — that path exists for
  the full Pokémon edit overlay's multi-field editing session; this is a
  narrower two-field patch triggered from a different page, so a direct
  `updateTeam` call is the right fit. Worth confirming this read is still
  accurate once the build leg is underway, since it's the one part of this
  resolution that's inferred from reading the hook rather than asked of
  Vanny directly.
- **Over-cap warning's exact rendering.** `StatsColumn.tsx:121` already has
  a `⚠ {totalEVs}/66` precedent to match visually, but neither `TeamCard
  .tsx` nor `PokemonCard.tsx` currently computes or displays a per-mon EV
  total at all (checked both — no existing `totalEVs`/`ValidationError`
  consumption; `ValidationError` is a defined type in `types/pokemon.ts`
  with no current reader anywhere in the renderer). This is new derived
  state at both render sites, not a rewire of something that already
  exists — build leg needs to compute `Object.values(evs).reduce(...)`
  (or add a shared `utils/` helper if that reads better) at both spots.
  Placement/exact badge treatment on each card is a build-time layout call.
- **Split into two legs, not one.** Leg 17 (save action) only touches
  Speed Tiers files that already exist for this milestone
  (`TeamPreviewCard.tsx`, `TeamPreviewStrip.tsx`, `SpeedTiersPage.tsx`).
  Leg 18 (over-cap warning) touches two files this milestone hasn't
  touched yet (`TeamCard.tsx`, `PokemonCard.tsx`) and is independently
  useful/completable on its own. Splitting matches the "smaller working
  slice per leg" preference; Leg 17 landing without Leg 18 isn't a broken
  half-feature (a save without the warning just doesn't yet surface the
  overage anywhere — no worse than today, where nothing enforces the cap
  outside Team Builder's own live UI gate either) — noted rather than
  assumed silently, since bundling them as one leg was also a reasonable
  read of Vanny's answer.

## Prior art

- [speed-tiers-preview-strip-scope.md](speed-tiers-preview-strip-scope.md) —
  Leg 5's own scoping session; the "session-only" framing and the explicit
  deferral of this exact follow-up.
- `utils/speedTierOverrides.ts` — the `TeamSpeedOverride` shape this leg
  writes back from (`spSpeed`, `nature`; `species` is explicitly excluded
  from the write-back per this session's resolution).
- `components/speedtiers/TeamPreviewCard.tsx` /
  `components/speedtiers/TeamPreviewStrip.tsx` — where the per-card/Save
  All actions attach.
- `hooks/useTeams.ts::updateTeam` — the write path (`reorderTeam` in the
  same file is the closest existing precedent for a targeted array patch
  rather than a full-editor commit).
- `components/StatsColumn.tsx:116-121` — the existing `⚠ total/66` pattern
  Leg 18's warning visually matches, though it has no direct reader in
  `TeamCard.tsx`/`PokemonCard.tsx` to build on yet.
