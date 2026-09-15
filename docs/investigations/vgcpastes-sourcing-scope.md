# VGCPastes Real-Set Sourcing — Scoping Session

Scoped 2026-09-14, following on from `vgcpastes-sourcing-feasibility.md`'s
"feasible, no dead end" verdict. That doc left four open questions before
either feature could become a concrete `TODO.md` leg; this session resolves
all four (Vanny's calls, via `AskUserQuestion`) and turns the milestone into
two sequenced legs.

## Decided

- **Sequencing: catalog first, then per-species extraction.** Matches the
  feasibility doc's own recommendation — the catalog needs no per-species
  parsing/correlation (just list rows, hand a picked one's pokepaste URL to
  the existing `ImportTeamModal.tsx` import path as-is), so it validates the
  sheet-pull/policy work before the harder correlation problem. Per-species
  extraction is deliberately left unscoped beyond its leg's short
  description below — it should get its own scoping pass once Leg 1 ships
  and there's real sheet-pull plumbing to build on top of, rather than
  guessing at the shape now.
- **Refresh cadence: manual pull only.** A user-triggered refresh (a
  button), same shape as `useSync.ts`'s existing manual push/pull — no
  scheduled/background job. Simplest to build, and avoids adding a new
  automatic-external-call category to reason about (CLAUDE.md currently has
  exactly one of those: the GitHub release check).
- **Reliability filtering: `EVs == Yes` rows only.** Rows without a
  confirmed real spread are excluded entirely rather than shown with a
  caveat badge — keeps a consistent quality bar across both the catalog and
  (later) per-species extraction, rather than mixing verified and
  unverified rows in the same list.

## Policy: proposed eighth CLAUDE.md exception (bulk VGCPastes ingestion)

Not yet added to `CLAUDE.md` — this is scoping, not building (see
[[feedback_split_scoping_from_building]]). Draft text for Leg 1 to add
verbatim (or edited) when that leg actually starts:

> **Eighth exception (also project policy, decided &lt;leg-1-ship-date&gt;):**
> the public VGCPastes Google Sheet
> (`docs.google.com/spreadsheets/d/1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw`,
> community-run, tabs per regulation) may be bulk-fetched via its own
> `gviz/tq?tqx=out:csv&sheet=<tab name>` CSV export endpoint (no auth), and
> each row's linked `pokepast.es` URL may be bulk-fetched through the
> existing `/<id>/json` read endpoint (`services/pokepaste.ts`), to power
> the sample-team catalog (and, later, per-species real-set extraction).
> This is a distinct bulk-ingestion shape from the Pokepaste-read exception
> above, which is scoped to a single user-triggered paste at a time — this
> one is scoped to: manual, user-triggered refresh only (no scheduled or
> background job); only rows flagged `EVs == Yes` in the sheet are pulled;
> polite sequential fetching of individual pokepastes, never parallel-
> blasted; read-only against both services, no writes. Same crowd-sourced
> reliability tier as `championsbattledata.com` (exception #4) — the sheet's
> own header admits most teams are sourced from Twitter — so the same
> spot-check discipline applies to anything surfaced from it.

Needs a matching README.md Credits entry in the same change, per the
existing "any new external data source needs a Credits entry" rule.

## Resulting legs

See `TODO.md`'s Current Milestone section:
- **[VGCPastes Sample Team Catalog] — Leg 1**
- **[VGCPastes Per-Species Real-Set Extraction] — Leg 2** (intentionally
  left thin — scope for real once Leg 1's plumbing exists)
