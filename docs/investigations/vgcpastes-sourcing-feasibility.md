# VGCPastes Real-Set Sourcing — Feasibility Check

Checked 2026-09-13 as a side question during the Regular Calc Popup scoping
session (see `regular-calc-popup-scope.md`) — Vanny wants real correlated
multi-set data (not synthesized from independent per-axis usage rankings)
for opponent auto-population, and named VGCPastes as the best known source.
Explicitly deferred to its own future milestone; this doc only answers
"is it possible at all," not "how do we build it."

## The source

Public Google Sheet:
`https://docs.google.com/spreadsheets/d/1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw`
— community-run (Twitter: `@VGCPastes`, Discord bot), tabs per regulation
(`Champions M-C`, `Champions M-B`, `Champions M-A`, `SV Regulation I`, plus
SV/SwSh archives). The sheet's own header admits "most of the teams we find
are from Twitter" — same crowd-sourced reliability tier as
`championsbattledata.com`, spot-check discipline applies, don't trust
blindly.

## Confirmed live (2026-09-13)

- The sheet is shared "anyone with the link can view" — no auth needed.
- `https://docs.google.com/spreadsheets/d/<id>/gviz/tq?tqx=out:csv&sheet=<tab name>`
  returns the full tab as CSV with zero login. Verified against `Champions
  M-C`: 184 rows, 750-byte index tab also confirmed reachable the same way.
- Per-row columns include: Team ID, description, owner, a `Pokepaste` URL
  column, an `EVs` Yes/blank flag (whether that specific paste actually has
  real EV/Stat-Point spreads vs. a bare moveset), extraction/replica status,
  tournament/event/rank/date, and a clean 6-species text list ("Pokemon Text
  for Copypasta" column) separate from the icon-only slot columns.
- Every linked pokepaste is a normal `pokepast.es/<id>` URL — fetchable
  through the exact same `/<id>/json` endpoint `services/pokepaste.ts`
  already calls for user-triggered imports. No new fetch mechanism needed,
  just a new (bulk, automated) caller.

## Not yet resolved (for whenever this gets scoped for real)

- **Policy**: the existing pokepast.es-read exception (CLAUDE.md) is scoped
  to "a team a user explicitly pastes a link for" — bulk/automated
  ingestion of hundreds of pastes is a different shape of use and needs its
  own exception + a README Credits entry, not a reuse of the existing one.
- **Refresh cadence**: undecided. The list grows continuously — 184 rows on
  just the current-reg tab alone, more across older-reg/archive tabs. Manual
  periodic pull vs. some scheduled job isn't decided.
- **Reliability filtering**: only rows with `EVs == Yes` are useful for real
  spread data; rows without should presumably be skipped rather than treated
  as complete sets.
- **Species-name normalization**: sheet text like "Salamence-Mega"/
  "Lucario-Mega-Z" needs mapping to this app's PokeAPI-normalized slugs,
  same shape as `config/pokemonRules.ts`'s existing gender-divergent-species
  handling.
- **Politeness**: bulk-fetching potentially hundreds of individual
  pokepastes from pokepast.es needs rate-limiting; not designed yet.

## Second use case: browsable team catalog (raised 2026-09-13)

Separate from per-species set extraction above — the sheet's rows are
already whole real teams, so there's value in surfacing them as a
browse/import catalog directly (e.g. "browse Champions M-C sample teams,
import one as-is"), reusing the existing Pokepaste-import path
(`ImportTeamModal.tsx` → `services/pokepaste.ts`) as-is rather than needing
any per-species extraction/correlation logic. Simpler than the
set-aggregation use case above since it doesn't require parsing individual
Pokémon out of a paste at all — just listing rows (team description, owner,
tournament/rank/date, species list for a preview) and handing the existing
importer a pokepaste URL when one's picked. Still inherits the same
bulk-ingestion policy/refresh-cadence questions above (this is still
"pull many rows from the sheet automatically," just a different consumer
of the pulled rows) — not a shortcut around those, just a second feature
built on the same underlying pull.

## Verdict

Feasible, no dead end. Deferred to its own future milestone per Vanny's
2026-09-13 call — Regular Calc Popup proceeds without it, using
`championsbattledata.com`'s per-axis usage ranking (already shipped in
`utils/liveCalcUsageWeighting.ts`) as the near-term multi-option source.
Two separable features to scope when that milestone gets picked up:
per-species real-set extraction (above) and the browsable team catalog
(this section) — likely worth sequencing the catalog first since it's the
simpler of the two and validates the sheet-pulling/policy work before the
harder per-species correlation problem.
