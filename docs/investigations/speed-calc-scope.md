# Speed Calc-like Feature — Scoping Session

Design-questions pass for the "Speed Calc-like Feature" milestone, done
2026-09-09 per the hand-off note left in `TODO.md`'s Future Milestones
section when it was first surfaced 2026-09-08 (deferred until this milestone
actually started, rather than answered at surface time). Resolves into the
legs now sitting under `TODO.md`'s Current Milestone section.

## Prior art researched before asking

vgcmulticalc's Speed Calc ([vgcmulticalc.com/speed-calc](https://vgcmulticalc.com/speed-calc/),
[source](https://github.com/robsonbittencourt/vgc-multicalc)): build up to 4
Pokémon (stats/nature/item/ability/status), toggle field effects (Tailwind,
Trick Room, weather, Icy Wind, paralysis), get a sorted speed-tier list plus
a meta-usage overlay ("122 Speed is used by 30% of Charizard") sourced from
**Pokémon Showdown's Bo3 ladder**, split by regulation, with "my team" vs.
"opponent side" views. This is the feature Vanny explicitly doesn't want a
reskin of (see `TODO.md`'s original 2026-09-08 framing).

## Resolved (2026-09-09, Vanny's call via AskUserQuestion)

Differentiation leans on three combined pillars, not a single axis:

- **Team-anchored, not a blank search box.** The default threat set a
  team's speed tiers are shown against is Team Gap Analysis's own ranked
  usage-threat list (`utils/usageThreats.ts::computeUsageThreats`,
  `USAGE_THREAT_RANK_CUTOFF`), not free-text opponent entry. That file's own
  doc comment already anticipated this exact feature: its `speed` field is
  explicitly base-stat-only "to stay informational, non-gating... anything
  closer to a real speed-tier calc is the separate, deferred Speed Calc-like
  Feature idea... not this."
- **Champions-native usage data, not back-derived Showdown numbers.**
  Threat speed distributions come from `ChampionsUsageEntry.statSpreads`
  (`types/gameData.ts`) — already cached per-species via `useGameData`,
  already on this app's native 0-32 Stat Point scale, sourced from
  championsbattledata.com the same way the Live Calc-adjacent "likely sets"
  panel already is. Not Showdown's mainline Bo3 ladder.
- **Live stat-inference tie-in.** When the Live Calc tab
  (`hooks/useLiveCalc.ts`, shipped in the Live Calc milestone) has narrowed
  a specific opposing Pokémon's SP-Speed range/candidates from real observed
  damage, that inferred range should be able to override/annotate the same
  threat's generic meta-usage-based speed entry in the tiers view — the two
  features feed each other instead of staying siloed.

**Explicitly not chosen as a differentiation axis:** a different interaction
shape (matchup-first framing vs. vgcmulticalc's percentile-bar list) was
offered as a 4th option and *not* selected. Default to whatever's simplest
to build (most likely still a sorted tier list) — that shape isn't doing any
differentiation work here, the three pillars above are.

## Open follow-ups later legs still have to settle while building

- **Nav placement / where this lives.** Own top-level tab (like Live Calc)?
  A view nested under an existing team? Not decided here — a UI-structure
  call worth its own confirmation once the data layer (leg below) exists,
  not guessed at in this scoping pass.
- **Field-effect toggles** (Tailwind, Trick Room, weather, paralysis) —
  vgcmulticalc treats these as table stakes, not a differentiator. Whether
  Champions' own field-effect mechanics (`config/championsMechanics.ts`)
  need any special-casing beyond what `@smogon/calc` already models is a
  data-layer leg's problem, not resolved here.
- **Live Calc → Speed Tiers wiring mechanism.** Shared hook state vs. an
  explicit "send to Speed Tiers" action from `LiveCalcResultPanel` — an
  implementation-shape question for the tie-in leg, not a design-direction
  question.
- **Relationship to Team Gap Analysis's existing Speed Annotation leg**
  (see `TODO.md`) — that leg's own scope note defers "real" speed-tier work
  to this feature. Worth confirming at build time whether this feature
  supersedes that annotation or the two coexist (quick informational
  base-stat hint vs. full tiered calc).

## Prior art in-repo

- `utils/usageThreats.ts` — ranked threat list + doc comment anticipating
  this feature (see Resolved above).
- `hooks/useLiveCalc.ts` / `components/livecalc/` — the Live Calc tab this
  feature ties into; see `docs/postmortems/live-calc-stat-inference.md` and
  `docs/investigations/live-calc-stat-inference-scope.md` for how that
  feature's own scoping pass was structured (this doc mirrors it).
- `types/gameData.ts::ChampionsUsageEntry.statSpreads` — the Champions-native
  usage-based SP-spread data this feature reads instead of Showdown ladder
  data.
