---
paths:
  - "src/main/**"
---

# Main process never imports the renderer

**Hard rule:** `src/main/**` must never import from `src/renderer/**`. A past
attempt to import one renderer type into `preload.ts` made Vite's electron
plugin bundle the entire renderer twice (once for the renderer entry, once
for preload's own build), which broke HMR. Preload types its payloads `any`
and the renderer casts `window.electron` results to the real types in
`src/renderer/types/pokemon.ts` (see `docs/architecture/electron-process-split.md`).
