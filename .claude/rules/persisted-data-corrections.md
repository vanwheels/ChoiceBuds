---
paths:
  - "src/renderer/hooks/**"
  - "src/renderer/services/**"
---

# Correcting already-persisted data

A fix that corrects data already saved to disk must bump `updatedAt` and
write through the real mutator (the hook's normal save path), not a
read-boundary-only correction applied at display time. If sync is enabled
for the collection being touched, a display-only fix never actually
propagates — the stale/wrong value is still what gets synced.

Before changing what an existing field means (not just its value), grep
every call site first. A field-meaning change that passes its own tests but
missed a call site elsewhere is a real regression, not a false alarm —
confirmed live in `sync-clipboard-reliability-fixes` (see
`docs/postmortems/sync-clipboard-reliability-fixes.md`).
