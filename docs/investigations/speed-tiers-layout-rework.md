# Speed Tiers Layout Rework — Design Session

Design-questions pass done 2026-09-09, triggered by Vanny questioning Leg 3's
shipped view shell before starting Leg 4 (Live Calc tie-in) — see
[speed-calc-scope.md](speed-calc-scope.md) for the original milestone
scoping. Resolves into a new leg inserted into `TODO.md`'s Current Milestone
section, ahead of the Live Calc tie-in.

## Trigger

vgcmulticalc's own Speed Calc UI (screenshot Vanny attached, not in-repo) was
raised as a legibility comparison — not a request to reskin the feature (the
"not a reskin" call in `speed-calc-scope.md` was about data source/threat
selection, and stays unchanged; this session is about visual layout only).

## Problem with the shipped Leg 3 shell

`speedTierList.ts::buildSpeedTierEntries` renders every one of a threat's
`ChampionsUsageEntry.statSpreads` entries as its own full-width row
(`SpeedTierList.tsx`), scattered across whatever tie-group its speed lands
in. A threat with several ranked spreads produces several near-duplicate
rows. That's a real legibility problem (buries the signal under repeated
near-identical rows), not a taste preference.

## Resolved (2026-09-09, Vanny's calls via AskUserQuestion + free text)

- **Grid shape.** Keep `groupSpeedTiers`'s existing grouping (one bucket per
  distinct speed value, real ties sharing a bucket) — that logic doesn't
  change. Change only the render: each speed value becomes a header with a
  horizontal wrap of compact icon+caption units underneath (matching
  vgcmulticalc's visual grouping), replacing the current full-width row per
  entry. A repeated appearance now costs one small icon, not a whole row.
- **Usage-spread cutoff.** Only plot a threat's ranked spreads above a
  minimum percentage floor of real usage (exact number tuned at build time,
  e.g. in the ~10% range) — not every ranked spread, and not a hardcoded
  top-N count. Self-documenting and tunable later.
- **Nature handling — replaced entirely, not just relocated.** Drop the old
  "modifier note" annotation approach for nature deltas. Nature isn't
  binary, so it doesn't belong as a toggle or an inline annotation on one
  ranked spread — it's a real bound. Compute 3 fixed reference tiers per
  threat, independent of usage-spread data entirely:
  - Min speed: 0 SP + a Speed-lowering nature
  - Neutral: 0 SP + a nature with no Speed effect
  - Max speed: 32 SP (this app's native Stat Point scale — see
    `utils/championsStats.ts`) + a Speed-raising nature
  These plot as their own tier entries at their computed speed values.
  **Threats only** — team members already show their real, actual computed
  speed from the imported build, so a hypothetical bound on known data adds
  nothing there.
- **Item handling — also replaced, not relocated.** Drop the current
  per-species "scan top-3 ranked items, show a delta if it changes speed"
  machinery (`ITEM_NOTE_SCAN_COUNT` and the surrounding logic in
  `speedTiers.ts::computeThreatSpeedProfile`) entirely. Replace with global,
  page-level toggle buttons — same interaction shape as the existing
  Tailwind toggles (`SpeedTierFieldPanel.tsx`), which already split into a
  "your side" / "threats' side" pair rather than being per-mon. Generalized
  beyond just Choice Scarf to any item with a fixed, universal speed
  multiplier — concretely Choice Scarf (1.5x) and Iron Ball (0.5x), the only
  two in that category. Explicitly **not** per-icon (no per-Pokémon "this one
  specifically holds Scarf" picker) — global toggles only, consistent with
  how Tailwind already works here.
- **Search filter.** Add a species name filter box (matching vgcmulticalc's
  "Pokémon" field) to narrow the visible icon set — cheap, same scannability
  win as the reference.
- **Adjustable speed control** (moving your own Pokémon's speed
  hypothetically to see where it lands, vgcmulticalc's "adjust and see it
  move" feature) — explicitly deferred to its own, later, unscoped leg. Not
  part of this rework.

## Not resolved here / still open at build time

- Exact percentage floor value for the usage-spread cutoff.
- Whether the min/neutral/max nature tiers need their own distinct visual
  treatment (e.g. dimmer/smaller than real usage-spread icons) versus
  rendering identically to a usage-spread entry — a build-time visual-polish
  call, not a direction question.
- Icon-grid component structure (new component vs. reworking
  `SpeedTierList.tsx` in place) — implementation detail for the leg itself.

## Prior art

- [speed-calc-scope.md](speed-calc-scope.md) — the milestone's original
  scoping pass (data-source/differentiation decisions, unaffected by this
  session).
- `utils/speedTiers.ts` / `utils/speedTierList.ts` — the data/merge layer
  this rework changes (nature/item logic swap, new min/neutral/max tier
  functions) and reuses (grouping-by-speed-value logic, unchanged).
- `components/speedtiers/SpeedTierList.tsx` / `SpeedTierFieldPanel.tsx` — the
  render layer this rework replaces (row list → icon grid) and extends
  (Tailwind-style toggle pattern reused for the new item toggles).
