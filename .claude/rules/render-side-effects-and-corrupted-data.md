---
paths:
  - "src/renderer/components/**"
  - "src/renderer/hooks/**"
---

# Render-body side effects and corrupted persisted data

A function with a side effect (fresh UUID generation, `Date.now()`, etc.)
called directly in a component's render body rather than in a memo/effect
is a bug smell worth a quick check even when it isn't the thing currently
being changed — it re-runs on every render and silently produces a new
value each time. This pattern has shown up more than once (see
`docs/postmortems/battle-logger-overhaul.md` and its reference to UI Polish
& Performance's wrong-anchor-node bug).

If corrupted persisted user data is found mid-fix, don't silently patch it
alongside the code change: back up the file, apply the minimal honest
correction (zero/null the field, don't guess a replacement value), and call
it out plainly in `COMPLETED.md`.
