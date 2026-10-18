# Pokepaste Format Deprecation Rumor — Research

Checked 2026-10-17 for the Bug Fix & Research Sweep milestone. Vanny recalled
Showdown moving away from Pokepaste integration toward its own newer format;
a general web search during scoping found no corroborating evidence. This
doc is the direct follow-up check via Smogon forums and Showdown's own
GitHub repos (not just a general web search), per the TODO item.

## Answer: No — rumor is false, as of 2026-10-17

Pokepaste integration in Showdown's own client is active and under
maintenance within the last two weeks, not being phased out.

## Evidence

- **Showdown's client repo has a live, actively-maintained "Pokepaste
  Button."** `smogon/pokemon-showdown` issue
  [#12249](https://github.com/smogon/pokemon-showdown/issues/12249) (opened
  2026-08-18) asked for the VGC OTS "Pokepaste Button" to include natures.
  It was addressed by `smogon/pokemon-showdown-client`
  [PR #2741](https://github.com/smogon/pokemon-showdown-client/pull/2741)
  ("OTS: Include Natures in Champions formats"), **merged 2026-10-02** — two
  weeks before this check. This is the strongest evidence: a feature named
  "Pokepaste Button" exists in Showdown's own UI and received a merged
  improvement within the last month.
- **`sim/TEAMS.md`** (Showdown's own repo docs) describes three team formats
  — export, JSON, packed — with no mention of deprecating or replacing
  Pokepaste/export-format interop. Pokepaste's format is Showdown's existing
  human-readable export format; there's no "newer format" documented as
  superseding it.
- **Third-party tooling still targets Pokepaste as the default in 2026.** A
  2026 PokePaste MCP guide describes pokepast.es as the long-standing
  default way competitors share Showdown teams. Pikalytics' team builder
  still ships a one-click "Share Pokepaste" export action.
- **No deprecation discussion found** in Smogon forums or GitHub
  issues/commits for either `smogon/pokemon-showdown` or
  `smogon/pokemon-showdown-client` searched for "pokepaste."

## Conclusion for the project

No action needed. `services/pokepaste.ts` and the `external-data-sources.md`
exceptions (#3/#8) covering it stay as-is.
