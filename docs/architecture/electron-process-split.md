# Process split (Electron)

Deep-dive split out of `ARCHITECTURE.md`; the summary there links here.

- `src/main/main.ts` — owns the `BrowserWindow`, window-state persistence
  (`windowState.ts`), and the Windows-only auto-updater. Registers IPC
  handlers from `src/main/ipc/*.ts` at startup rather than defining them
  inline: `fileHandlers.ts` (every userData JSON read/write), `shellHandlers.ts`
  (`shell:open-external`), `spriteHandlers.ts` (sprite cache get/download),
  `pokepasteHandlers.ts` (`pokepaste:create`).
- `src/main/paths.ts` — the one place that knows each persisted file's name
  inside `app.getPath('userData')`: `teams.json`, `pokeapi-cache.json`,
  `game-data-cache.json`, `battles.json`, `savedPokemon.json`, `settings.json`,
  `vgcpastes-cache.json`, `vgcrealsets-cache.json`, `window-state.json`.
- `src/main/atomicWrite.ts` — every write goes through `atomicWriteFile()`
  (write to `.tmp`, then rename over the target) so a crash mid-write can't
  truncate a file to zero bytes, and queues writes per-path so two concurrent
  writers to the same file can't race on that shared `.tmp` file.
- `src/main/preload.ts` — contextBridge script exposing `window.electron`:
  read/write for every persisted collection above, plus `openExternal`,
  `getSpritePath`/`downloadSprite`, `createPokepaste`, and the auto-updater's
  `onUpdateStatus`/`getUpdateStatus`/`installUpdate`. Preload types every
  payload `any` instead of importing renderer types — a past attempt to import
  one renderer type caused Vite's electron plugin to bundle the entire
  renderer twice (once for the renderer entry, once for preload's own build),
  which broke HMR. The renderer casts `window.electron` results to the real
  types in `src/renderer/types/pokemon.ts` itself.
- `src/renderer/` — the React app (Vite root aliases `@` → `src/renderer`).
