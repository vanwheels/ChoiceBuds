# Speed Tiers Team Preview Strip — Scoping Session

Design-questions pass done 2026-09-09, triggered by Vanny's followup (a
vgcmulticalc screenshot + a request for a team preview strip) sent before
starting Leg 5 (Live Calc tie-in) — see
[speed-calc-scope.md](speed-calc-scope.md) for the original milestone scoping
and [speed-tiers-layout-rework.md](speed-tiers-layout-rework.md) for the icon
grid rework this session builds on top of. Resolves into a new leg inserted
into `TODO.md`'s Current Milestone section, ahead of the Live Calc tie-in.

## Trigger

Two asks in one message:

1. A vgcmulticalc screenshot with "grid format, not vertical stacking" —
   confirmed via AskUserQuestion to be the vgcmulticalc reference itself, not
   a shot of our app. This matches what Leg 4 already shipped (icon grid
   grouped by speed value, header + wrapped icon/caption units) — no gap
   identified here. If the live build still looks like a vertical stack when
   checked, that's a regression/bug report against Leg 4, not new scope; flag
   it separately rather than folding it into this leg.
2. A team preview strip at the top of the page, next to team selection:
   each of the 6 team Pokémon shown with a sprite icon, an SP (Speed Points)
   modifier control (same interaction as Team Builder's EV editing, scoped to
   Speed only here), a nature selector, and a form/mega toggle. This is new
   scope — it's the "adjustable speed control" item
   `speed-tiers-layout-rework.md` explicitly deferred to "its own, later,
   unscoped leg," now further specified to include nature and form toggling
   alongside the SP adjustment.

## Resolved (2026-09-09, Vanny's calls via AskUserQuestion)

- **SP modifier scope: session-only.** Adjusting a team member's Speed SP in
  this strip only affects the speed number this page computes and plots —
  it does not write back to the Pokémon's saved EV spread. Matches the
  existing scratch-state pattern `useLiveCalc.ts` already uses elsewhere in
  the app, and keeps this leg from touching `useTeams`' commit path at all.
  **Future option, not this leg:** a later "save this edit to the team"
  action that does write back through the real Team Builder commit path.
  Tracked as its own unscheduled follow-up (see below) — don't build it
  speculatively here.
- **Form/mega toggle scope: local preview only.** Toggling a team member's
  form in this strip only changes which stat line/typing feeds this page's
  speed calc for that mon — it does not change the team's saved active form.
  No editor-commit path involved.
- **Nature selector:** scoped the same as the SP modifier — session-only,
  feeds the speed calc only. (Not asked separately, but follows the same
  "this whole strip is a scratch overlay over the real team" framing as the
  other two controls.)

## Not resolved here / still open at build time

- **Component/placement structure.** "Top of screen, next to team selection"
  is the only placement instruction given — exact layout (row above/beside
  the existing team `<select>` in `SpeedTiersPage.tsx`, one card per mon vs.
  one combined strip) is an implementation-shape call for the build leg.
- **Where the scratch overrides live.** Likely new local state in
  `SpeedTiersPage.tsx` (a per-mon override map keyed by team-member id,
  merged into `computeTeamSpeed`'s input) rather than a new hook, but worth
  confirming against `useLiveCalc.ts`'s existing scratch-state shape before
  committing to a pattern — a data-layer call for the build leg, not decided
  here.
- **Form/mega toggle's candidate list.** What counts as an available "form"
  per species (Mega Stone availability, regional/other alternate forms) —
  needs whatever this app already uses elsewhere for form legality
  (`config/pokemonRules.ts` et al.) rather than a new list; confirm at build
  time which existing source applies.
- **Nature selector's option set.** Full 25-nature list, or narrowed to just
  Speed-relevant natures (raise/neutral/lower), given the calc only cares
  about the Speed-stage effect. A UI-density call for the build leg.
- **Interaction with the existing min/neutral/max threat bounds.** Those
  three fixed tiers (`speed-tiers-layout-rework.md`) exist specifically
  because *threat* Speed is unknown/hypothetical. This strip does the
  analogous thing for the *team* side, which `speedTiers.ts`'s current doc
  comments treat as "real, known" data (team members show their actual
  computed Speed, no hypothetical bounds, per that doc's own language) — the
  build leg needs to decide whether a team member with an active scratch
  override still renders as a single real point (just recomputed) or needs
  its own visual treatment distinguishing "your real build" from "your
  hypothetical override." Leaning toward the former (single recomputed
  point, no bounds) since only one override is active at a time per mon,
  unlike a threat's whole distribution — worth confirming at build time.

## Prior art

- [speed-calc-scope.md](speed-calc-scope.md) — original milestone scoping.
- [speed-tiers-layout-rework.md](speed-tiers-layout-rework.md) — the icon
  grid this session's screenshot ask matches (already shipped, Leg 4), and
  the doc that first deferred "adjustable speed control" to this leg.
- `utils/speedTiers.ts::computeTeamSpeed` — the function whose input this
  leg's scratch overrides need to feed into for team members.
- `hooks/useLiveCalc.ts` — existing scratch-state-over-real-data pattern to
  match for how overrides are held (session-only, no `useTeams` writes).
- `components/speedtiers/SpeedTierFieldPanel.tsx` — the existing
  Tailwind/item toggle pattern already noting "hypothetical speed adjustment
  for your own team... is a separate, unscoped leg" — this leg is that leg.
