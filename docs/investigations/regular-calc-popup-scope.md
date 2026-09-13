# Regular Calc Popup — Pivot Scoping Session

Scoping conversation 2026-09-13. After shipping all 3 legs of Live Calc
Page Layout & Function Rework plus the Known-Ability Lock, Result Clarity
Pass, and both legs of Usage-Data-Backed Inference (see `COMPLETED.md`),
Vanny sat with the result and remained unhappy with Live Calc as a whole —
not a polish problem, a wrong-tool-for-the-moment problem.

## The core call

Live Calc's observation/inference model (log "their move did X% to me",
narrow the opponent's spread from evidence) optimizes for precision at the
cost of interaction speed during live play. But a faster path already
exists for anything actually observed: set the field directly, which the
plain Calc tab (`CalcPage`) already supports. Inference only pays for
itself on values that are still unknown — and usage-ranking already answers
"what's most likely" there without any observation math. So the whole
narrow-from-evidence machinery (observation lists, bidirectional inference,
`liveCalcEngine.ts`, its own tab/panels) is being retired rather than tuned
further.

## Decided (2026-09-13, Vanny's calls)

- **Live Calc is ripped.** Tab, `liveCalcEngine.ts`, observation lists (both
  directions), bidirectional inference, `components/livecalc/*` — all go
  away rather than continuing to be tuned. (Exact removal-vs-build-alongside
  sequencing not decided yet — see `TODO.md`'s not-yet-scoped items.)
- **The popup is the existing regular Calc, relocated.** No new UI
  paradigm — `CalcPage` becomes launchable as an overlay from anywhere in
  the app instead of being tab-locked. Supersedes the former "Live Calc
  Global Popup Launcher" item (scoped for Live Calc specifically; now
  retargeted at the plain Calc).
- **Battle Log integration carries over from the old plan, retargeted.**
  Opening the popup from an active Battle Log session pre-fills the enemy
  team from that session's `opponentRoster`, and anything newly set while
  it's open writes back into that same roster — `OpponentPokemonEntry`
  (`types/battle.ts:47`) already has the `moves`/`ability`/`item`/
  `*RevealedOnTurn` fields this needs, no new schema. Supersedes the former
  Blocked "Live Calc Battle Log Auto-Populate" item.
- **Multi-set auto-populate, near-term shape: per-axis, not synthesized
  bundles.** Fabricating a full "set" out of independently-top-ranked
  move/item/ability/nature picks implies a co-occurrence the data doesn't
  back (rejected — see below). Near-term default reuses the already-shipped
  `championsbattledata.com` per-axis ranking
  (`utils/liveCalcUsageWeighting.ts`), generalized off Live Calc and onto
  the popup.
- **Real correlated full-set data is a separate, later milestone.**
  VGCPastes (a public Google Sheet + Discord bot of real tournament team
  Pokepastes) was raised as the best real source — confirmed technically
  pullable (see `vgcpastes-sourcing-feasibility.md`), but deferred: needs
  its own policy exception (bulk vs. today's single-user-triggered
  pokepaste-read exception), refresh-cadence, and species-name-
  normalization work this milestone doesn't need to solve. Also surfaced a
  second, simpler use case for that same pull: a browsable sample-team
  catalog (list real teams, import one as-is via the existing Pokepaste
  importer) — no per-species extraction needed, likely worth sequencing
  before the harder per-species correlation problem.

## Rejected

- **Synthesizing full sets from independent per-axis top picks** (e.g. top
  move + top item + top ability + top nature presented as "Set #2"). Reads
  as a real, confirmed set when the underlying data never actually confirms
  those axes co-occur — actively misleading rather than merely imprecise.

## Not yet scoped into legs

This session stopped at the pivot decision, matching the project's usual
practice of not turning a scoping pass into legs in the same sitting it's
decided in. See `TODO.md`'s Current Milestone section for the resulting
not-yet-scoped items.
