---
paths:
  - "src/renderer/**"
  - "worker/src/**"
---

# Stored snapshot fields vs. live recomputation

Some fields on a persisted Team/Pokemon record are a one-time snapshot
captured when the record was created or last edited (e.g. `spriteUrl`,
captured at import time) rather than a live-recomputed value. The
renderer's real on-screen cards already recompute these from canonical
fields (`pokedexNumber`/species/gender/shiny) via a dedicated util
(`utils/spriteUrl.ts`'s `getPixelSpriteUrl`) instead of reading the
stored snapshot — the snapshot exists only for very old data missing
those canonical fields.

Any *new* read path over existing persisted data (a new API endpoint, a
new display surface) must recompute from the canonical fields the same
way, falling back to the stored snapshot only when a canonical field is
missing/malformed. Reading the stored snapshot directly is quietly wrong
for any record edited after the snapshot was captured (confirmed live:
public profile sprites not reflecting a later `shiny` toggle, fixed via
`worker/src/spriteUrl.ts`'s hand-duplicated recompute — see
`docs/postmortems/profile-system-revamp-previews-and-import.md`).

Before wiring a new consumer to an existing field, check whether a
sibling live-recompute util already exists for it (grep the field name)
rather than reading it directly.
