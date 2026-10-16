---
paths:
  - "src/renderer/config/**"
---

# Lookup-table coverage spot-check

When building a display feature over an existing normalization/lookup
table (species names, form slugs, etc.), spot-check the table's coverage
against the real data set up front, before wiring up the feature — not by
discovering gaps via live rendering. Doing this earlier would have caught
the Toxtricity form gap a leg sooner in `vgcpastes-real-set-sourcing` (see
`docs/postmortems/vgcpastes-real-set-sourcing.md`).
