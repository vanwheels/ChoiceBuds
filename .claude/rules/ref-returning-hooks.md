---
paths:
  - "src/renderer/hooks/**"
---

# Ref-returning hooks

A shared hook that returns a ref must expose that ref separately from any
function the hook also returns that gets called during render. Bundling
the ref and a render-time handler/factory into one returned object trips
`react-hooks/refs` at every call site (hit while building the shared
`useGridReorder` hook — see `docs/postmortems/fixes-and-adjustments.md`);
destructuring them as two separate return values avoids it.
