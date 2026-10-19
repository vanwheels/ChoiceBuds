---
paths:
  - "src/renderer/components/profile/**"
  - "src/renderer/hooks/**"
---

# Local state resync vs. synthesized/overlay data

When a component keeps optimistic local state (an ordered-id array, a
selection) layered over a fetch that never refreshes mid-session, and also
merges in client-synthesized placeholder records to show something before
the real fetch catches up (e.g. a just-added record with no server copy
yet), the local state's resync effect must key off the *real* fetched data
only - never a list that includes the synthesized/overlay records.

Resyncing off the overlay-merged list means any unrelated change that adds
or removes a placeholder (which changes what the merged list contains)
retriggers the resync and resets local state straight back to the stale
fetch - silently undoing any same-session edit the resync wasn't actually
about. Confirmed live in `ProfileCard.tsx`: adding a new team (synthesizing
a placeholder `PublicTeam` via `utils/publicTeamSynthesis.ts`) was
resurrecting teams removed earlier in the same session, because the
open/closed ordered-id resync was keyed off the overlay-merged team list
instead of `profile.teams` directly. See
`docs/postmortems/profile-editing-and-visibility-controls.md`.
